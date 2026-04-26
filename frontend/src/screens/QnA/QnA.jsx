import { useState, useEffect, useRef } from 'react'
import { chat, muscleStory } from '../../services/claude'
import { speak, stopSpeaking } from '../../services/elevenlabs'
import osoIdle from '../../assets/oso-idle.png'
import osoSpeak from '../../assets/oso-speak.png'
import VoxelBrain from '../../components/bodyman/VoxelBrain'

const BEAR_IMG = { idle: osoIdle, speak: osoSpeak }
const MAX_TURNS = 4


// ── Bear avatar components ────────────────────────────────────

function LiveAvatar({ state }) {
  return (
    <div className={`bubble-avatar--live${state === 'speak' ? ' is-speaking' : ''}`}>
      <img
        key={state}
        src={BEAR_IMG[state] || BEAR_IMG.idle}
        alt="Oso"
        className="oso-avatar-img"
        draggable={false}
      />
    </div>
  )
}

function PastAvatar() {
  return <div className="bubble-avatar--past">🐻</div>
}

// ── Expand icon SVG ───────────────────────────────────────────
function ExpandIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9"
        stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── White-box Popup ───────────────────────────────────────────
// Uses ONLY the initial symptom prompt (not the chat history) to build a
// muscle-by-muscle anatomy story via Gemma. Each script is then spoken
// aloud via ElevenLabs in story order.
function Popup({ symptomText, onClose, onOsoMood }) {
  const [story, setStory]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [playingIndex, setPlayingIndex] = useState(null)

  // Close cleanly: stop any in-flight audio and reset Oso.
  const close = () => {
    stopSpeaking()
    onOsoMood?.('idle')
    onClose()
  }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    muscleStory(symptomText)
      .then(s => { if (!cancelled) { setStory(s); setLoading(false) } })
      .catch(err => { if (!cancelled) { setError(err.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [symptomText])

  // Play each script sequentially through ElevenLabs once the story arrives.
  useEffect(() => {
    if (!story || story.length === 0) return
    let cancelled = false

    ;(async () => {
      onOsoMood?.('speak')
      for (const item of story) {
        if (cancelled) break
        setPlayingIndex(item.index)
        await speak(item.script)
      }
      if (!cancelled) {
        setPlayingIndex(null)
        onOsoMood?.('idle')
      }
    })()

    return () => {
      cancelled = true
      stopSpeaking()
      setPlayingIndex(null)
      onOsoMood?.('idle')
    }
  }, [story])

  return (
    <div
      className="qna-popup-backdrop"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}
      role="dialog"
      aria-modal="true"
    >
      <div className="qna-popup-box" style={{ position: 'relative', overflow: 'hidden' }}>
        <button
          className="qna-popup-close"
          onClick={close}
          aria-label="Close"
          style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M4 4l10 10M14 4L4 14"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" />
          </svg>
        </button>

        <VoxelBrain style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function QnA({ symptomText, onComplete, onOsoMood }) {
  const [messages,  setMessages]  = useState([{ role: 'user', text: symptomText }])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(true)
  const [turns,     setTurns]     = useState(0)
  const [bearState, setBearState] = useState('speak')
  const [popupOpen, setPopupOpen] = useState(false)
  const bottomRef = useRef(null)

  const lastOsoIdx = loading
    ? -1
    : messages.reduce((last, m, i) => m.role === 'assistant' ? i : last, -1)

  useEffect(() => {
    let cancelled = false
    async function greet() {
      onOsoMood?.('speak')
      try {
        const opening = await chat([
          { role: 'user', content: symptomText },
        ])
        if (cancelled) return
        setMessages(prev => [...prev, { role: 'assistant', text: opening }])
        setLoading(false)
        await speak(opening, {
          onEnd: () => { setBearState('idle'); onOsoMood?.('idle') },
        })
      } catch {
        if (cancelled) return
        setMessages(prev => [...prev, { role: 'assistant', text: "Great question! Let's explore the muscles involved. Can you tell me a bit more about the movement or area you're curious about?" }])
        setLoading(false)
        setBearState('idle')
        onOsoMood?.('idle')
      }
    }
    greet()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text) => {
    const val = text.trim()
    if (!val || loading) return

    setMessages(prev => [...prev, { role: 'user', text: val }])
    setInput('')
    setLoading(true)
    setBearState('speak')
    onOsoMood?.('speak')

    const history = [
      ...messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.text,
      })),
      { role: 'user', content: val },
    ]

    const newTurns = turns + 1
    setTurns(newTurns)

    let reply
    if (newTurns >= MAX_TURNS) {
      reply = "Thank you for sharing all of that — I have a clear picture now. Let me assess what might be going on."
    } else {
      reply = await chat(history)
    }

    setMessages(prev => [...prev, { role: 'assistant', text: reply }])
    setLoading(false)

    await speak(reply, {
      onEnd: () => { setBearState('idle'); onOsoMood?.('idle') },
    })

    if (newTurns >= MAX_TURNS) {
      setTimeout(() => {
        const fullHistory = [
          ...messages.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.text,
          })),
          { role: 'user', content: val },
          { role: 'assistant', content: reply },
        ]
        onComplete(fullHistory)
      }, 1200)
    }
  }

  const done = turns >= MAX_TURNS

  return (
    <>
      <div className="screen qna-screen">
        <div className="chat-feed">

          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role === 'assistant' ? 'bubble--oso' : 'bubble--user'}`}>
              {m.role === 'assistant' && (
                i === lastOsoIdx
                  ? <LiveAvatar state={bearState} />
                  : <PastAvatar />
              )}

              <div className="bubble-col">
                <div className="bubble-body">{m.text}</div>

              </div>
            </div>
          ))}

          {loading && (
            <div className="bubble bubble--oso">
              <LiveAvatar state="speak" />
              <div className="bubble-col">
                <div className="bubble-body typing">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {!done && (
          <div className="chat-bar">
            <textarea
              className="chat-input chat-input--sm"
              rows={2}
              placeholder="Type your reply…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send(input)
                }
              }}
              disabled={loading}
            />
            <button
              className="outline-btn"
              onClick={() => setPopupOpen(true)}
              disabled={loading}
            >
              Visualize
            </button>
            <button
              className="send-icon-btn"
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              aria-label="Send"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 10h14M13 6l4 4-4 4"
                  stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {popupOpen && (
        <Popup
          symptomText={symptomText}
          onClose={() => setPopupOpen(false)}
          onOsoMood={onOsoMood}
        />
      )}
    </>
  )
}
