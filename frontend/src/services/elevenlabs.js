const API = import.meta.env.VITE_API_URL ?? ''

let currentAudio = null
let speakGen = 0

// Every in-flight speak() parks a canceller here so stopSpeaking() can unblock
// the narration loop immediately instead of leaving it awaiting a dead timer.
const pendingCancels = new Set()

// ── Mobile audio unlock ──────────────────────────────────────
// Phones only let audio start from inside a user gesture, and our play() lands
// several awaits later (chat → story → TTS fetch), well outside that window.
// The fix is to bless one <audio> element during the first tap and then reuse
// that same element for every clip — a blessed element keeps its permission.
const SILENT_WAV =
  'data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA'

let sharedAudio = null
let unlocked = false

export function unlockAudio() {
  if (unlocked) return
  unlocked = true
  try {
    sharedAudio = new Audio()
    sharedAudio.playsInline = true
    sharedAudio.preload = 'auto'
    sharedAudio.src = SILENT_WAV
    sharedAudio.play()
      .then(() => { sharedAudio.pause(); sharedAudio.currentTime = 0 })
      .catch(() => {})
  } catch {
    sharedAudio = null
  }
  // Safari gates speechSynthesis behind a gesture too, and a blocked utterance
  // fires no events at all — prime it here so the fallback voice can speak.
  try {
    const primer = new SpeechSynthesisUtterance(' ')
    primer.volume = 0
    window.speechSynthesis?.speak(primer)
  } catch { /* no synthesis on this browser */ }
}

if (typeof window !== 'undefined') {
  const onFirstGesture = () => {
    unlockAudio()
    window.removeEventListener('pointerdown', onFirstGesture)
    window.removeEventListener('touchend', onFirstGesture)
    window.removeEventListener('keydown', onFirstGesture)
  }
  window.addEventListener('pointerdown', onFirstGesture)
  window.addEventListener('touchend', onFirstGesture)
  window.addEventListener('keydown', onFirstGesture)
}

// How long to wait for a clip to actually begin before giving up on it. A
// blocked play() sometimes rejects and sometimes just never settles, so the
// timer is what guarantees the caller is never left awaiting silence.
const START_DEADLINE = 1500
const SYNTH_START_DEADLINE = 1200
const WORDS_PER_SECOND = 2.7

// Used to pace the typewriter when no audio duration is available, so the text
// still reads at speaking speed instead of dumping all at once.
export function estimateDuration(text) {
  const words = String(text ?? '').trim().split(/\s+/).filter(Boolean).length
  return Math.max(1.2, Math.min(30, words / WORDS_PER_SECOND))
}

function once(fn) {
  let called = false
  return (...args) => {
    if (called) return
    called = true
    fn?.(...args)
  }
}

export function stopSpeaking() {
  speakGen++
  if (currentAudio) { currentAudio.pause(); currentAudio = null }
  window.speechSynthesis?.cancel()
  for (const cancel of pendingCancels) cancel()
  pendingCancels.clear()
}

// Pre-fetch audio blob without playing it — call this during the previous segment
export async function prefetchAudio(text) {
  try {
    const res = await fetch(`${API}/api/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) return null
    const blob = await res.blob()
    return blob
  } catch {
    return null
  }
}

export async function speak(text, { onStart, onEnd, onDuration, prefetchedBlob } = {}) {
  const gen = ++speakGen
  if (currentAudio) { currentAudio.pause(); currentAudio = null }
  window.speechSynthesis?.cancel()

  const stale = () => gen !== speakGen

  // Fire-once wrappers: whichever path wins — real audio, browser voice, or the
  // silent timer — the caller gets exactly one start, one duration, one end, so
  // its loading state and typewriter can never be left hanging.
  const start = once(() => onStart?.())
  const duration = once(d => onDuration?.(d))
  const end = once(() => onEnd?.())

  let blob = prefetchedBlob
  if (!blob) {
    try {
      const res = await fetch(`${API}/api/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      blob = res.ok ? await res.blob() : null
    } catch {
      blob = null
    }
  }

  if (stale()) { duration(estimateDuration(text)); end(); return }
  if (!blob) return browserSpeak(text, { start, duration, end })

  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    // Reuse the gesture-blessed element when we have one; a fresh Audio() would
    // carry no permission on mobile.
    const audio = sharedAudio ?? new Audio()
    audio.playsInline = true
    audio.src = url
    currentAudio = audio

    let startTimer = null
    let endTimer = null
    // The element is shared, so only detach handlers while this call still owns
    // it — a newer speak() (a screen change mid-sentence) has already installed
    // its own, and tearing those down would strand it.
    const release = () => {
      if (stale()) return
      audio.onloadedmetadata = audio.onplay = audio.onended = audio.onerror = null
      if (currentAudio === audio) currentAudio = null
    }
    const cleanup = () => {
      clearTimeout(startTimer)
      clearTimeout(endTimer)
      pendingCancels.delete(cancel)
      release()
      URL.revokeObjectURL(url)
    }
    const cancel = () => { try { audio.pause() } catch { /* already gone */ } ; cleanup(); duration(estimateDuration(text)); end(); resolve() }
    pendingCancels.add(cancel)

    const finish = () => { cleanup(); end(); resolve() }

    audio.onloadedmetadata = () => {
      const d = audio.duration
      if (Number.isFinite(d) && d > 0) duration(d)
    }
    audio.onplay = () => {
      clearTimeout(startTimer)
      const raw = audio.duration
      const d = Number.isFinite(raw) && raw > 0 ? raw : estimateDuration(text)
      duration(d)
      start()
      // Playback that stalls mid-clip never fires 'ended'; close it out a few
      // seconds past the run time so the narration loop always moves on.
      endTimer = setTimeout(finish, (d + 5) * 1000)
    }
    audio.onended = finish

    // A blocked or broken clip hands off to the browser voice, which has its own
    // deadline — so the chain always terminates.
    const handleFail = () => {
      clearTimeout(startTimer)
      clearTimeout(endTimer)
      pendingCancels.delete(cancel)
      if (!stale()) { try { audio.pause() } catch { /* already gone */ } }
      release()
      URL.revokeObjectURL(url)
      if (stale()) { duration(estimateDuration(text)); end(); resolve(); return }
      browserSpeak(text, { start, duration, end }).then(resolve)
    }

    audio.onerror = handleFail
    startTimer = setTimeout(() => { if (audio.paused || audio.currentTime === 0) handleFail() }, START_DEADLINE)
    audio.play().catch(handleFail)
  })
}

// Fallback voice. On iOS a gesture-less utterance is dropped in silence with no
// onstart/onend/onerror, so a watchdog turns that dead end into a plain timed
// pause — the words are already on screen either way.
function browserSpeak(text, { start, duration, end }) {
  const secs = estimateDuration(text)

  return new Promise((resolve) => {
    let watchdog = null
    let silentTimer = null
    let finished = false

    const finish = () => {
      if (finished) return
      finished = true
      clearTimeout(watchdog)
      clearTimeout(silentTimer)
      pendingCancels.delete(cancel)
      end()
      resolve()
    }
    const cancel = () => { try { window.speechSynthesis?.cancel() } catch { /* nothing speaking */ } ; finish() }
    pendingCancels.add(cancel)

    // No voice: hold for the reading time so segments still land one by one.
    const runSilent = () => {
      start(); duration(secs)
      silentTimer = setTimeout(finish, secs * 1000)
    }

    if (!window.speechSynthesis) { runSilent(); return }

    try {
      const utter = new SpeechSynthesisUtterance(text)
      const voices = window.speechSynthesis.getVoices()
      const preferred =
        voices.find(v => /samantha|karen|moira|daniel|google us|zira/i.test(v.name)) ||
        voices.find(v => v.lang.startsWith('en')) ||
        voices[0]
      if (preferred) utter.voice = preferred
      utter.rate  = 0.95
      utter.pitch = 1.05
      utter.onstart = () => { clearTimeout(watchdog); start(); duration(secs) }
      utter.onend   = finish
      utter.onerror = finish
      window.speechSynthesis.speak(utter)
      watchdog = setTimeout(() => {
        if (finished) return
        try { window.speechSynthesis.cancel() } catch { /* nothing queued */ }
        runSilent()
      }, SYNTH_START_DEADLINE)
    } catch {
      runSilent()
    }
  })
}
