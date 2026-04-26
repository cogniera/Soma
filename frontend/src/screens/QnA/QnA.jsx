import { useState, useEffect, useRef } from 'react'
import { chat, muscleStory, muscleFocus } from '../../services/claude'
import { speak, stopSpeaking, prefetchAudio } from '../../services/elevenlabs'
import osoIdle from '../../assets/oso-idle.png'
import osoSpeak from '../../assets/oso-speak.png'
import VoxelBrain from '../../components/bodyman/VoxelBrain'
import VoiceButton from '../../components/VoiceButton/VoiceButton'

const BEAR_IMG = { idle: osoIdle, speak: osoSpeak }
const MAX_TURNS = 4

// ── Side panel: muscle visualizer ────────────────────────────
function VisualPanel({ storyTrigger, bearState, onBearPosition }) {
  const [focusGroup, setFocusGroup] = useState(null)

  useEffect(() => {
    if (!storyTrigger) return
    let cancelled = false
    muscleFocus(storyTrigger).then(muscle => {
      if (!cancelled) setFocusGroup(muscle)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [storyTrigger])

  useEffect(() => {
    if (bearState === 'idle') {
      setFocusGroup(null)
      onBearPosition(null)
    }
  }, [bearState])

  return (
    <div className="qna-visual-panel">
      <VoxelBrain
        focusGroup={focusGroup}
        autoRotate={bearState === 'idle'}
        style={{ width: '100%', height: '100%' }}
        onBearPosition={onBearPosition}
      />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function QnA({ symptomText, onComplete, onOsoMood, onBack }) {
  const [messages,      setMessages]      = useState([{ role: 'user', text: symptomText }])
  const [input,         setInput]         = useState('')
  const [loading,       setLoading]       = useState(true)
  const [turns,         setTurns]         = useState(0)
  const [bearState,     setBearState]     = useState('speak')
  const [storyTrigger,  setStoryTrigger]  = useState(symptomText)
  const [bearPos,       setBearPos]       = useState(null)
  const bottomRef   = useRef(null)
  const typeTimer   = useRef(null)

  const typeInto = (base, newSegment, duration) => {
    clearInterval(typeTimer.current)
    if (!duration || duration <= 0) { stopTyping(base + (base ? ' ' : '') + newSegment); return }
    const prefix = base + (base ? ' ' : '')
    const chars = newSegment.length
    const delay = (duration * 1000) / chars
    let i = 0
    typeTimer.current = setInterval(() => {
      i++
      setMessages(prev => {
        const next = [...prev]
        next[next.length - 1] = { ...next[next.length - 1], text: prefix + newSegment.slice(0, i) }
        return next
      })
      if (i >= chars) clearInterval(typeTimer.current)
    }, delay)
  }

  const stopTyping = (fullText) => {
    clearInterval(typeTimer.current)
    setMessages(prev => {
      const next = [...prev]
      next[next.length - 1] = { ...next[next.length - 1], text: fullText }
      return next
    })
  }

  const playStory = async (triggerText, chatReply, cancelled) => {
    const story = await muscleStory(triggerText)
    if (cancelled?.() || !story?.length) return

    let accumulated = ''

    // prefetch first segment immediately
    let nextBlob = prefetchAudio(story[0].script)

    for (let idx = 0; idx < story.length; idx++) {
      if (cancelled?.()) break
      const item = story[idx]
      const scriptText = item.script
      const blob = await nextBlob

      // prefetch next segment in parallel while this one plays
      if (idx + 1 < story.length) {
        nextBlob = prefetchAudio(story[idx + 1].script)
      }

      setStoryTrigger(scriptText)
      await speak(scriptText, {
        prefetchedBlob: blob,
        onDuration: (dur) => { typeInto(accumulated, scriptText, dur) },
        onEnd: () => {
          accumulated += (accumulated ? ' ' : '') + scriptText
          stopTyping(accumulated)
        },
      })
    }
  }

  useEffect(() => {
    let cancelled = false
    async function greet() {
      onOsoMood?.('speak')
      try {
        const opening = await chat([{ role: 'user', content: symptomText }])
        if (cancelled) return
        setMessages(prev => [...prev, { role: 'assistant', text: '' }])
        setLoading(false)
        await playStory(symptomText, opening, () => cancelled)
        if (!cancelled) { setBearState('idle'); onOsoMood?.('idle') }
      } catch (err) {
        console.error('[QnA] greet error:', err)
        if (cancelled) return
        const fallback = "Great question! Let's explore the muscles involved. Can you tell me a bit more about the movement or area you're curious about?"
        setMessages(prev => [...prev, { role: 'assistant', text: fallback }])
        setLoading(false)
        setBearState('idle')
        onOsoMood?.('idle')
      }
    }
    greet()
    return () => { cancelled = true; clearInterval(typeTimer.current) }
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

    setMessages(prev => [...prev, { role: 'assistant', text: '' }])
    setLoading(false)

    let done2 = false
    await playStory(val, reply, () => done2)
    done2 = true
    setBearState('idle')
    onOsoMood?.('idle')

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
    <div className="qna-layout">
      {/* Back button */}
      <div style={{ position: 'fixed', top: 16, left: 16, zIndex: 100 }}>
        <button className="outline-btn" onClick={() => { stopSpeaking(); onOsoMood?.('idle'); onBack() }}>← Back</button>
      </div>

      {/* Left: chat */}
      <div className="qna-chat-col">
        <div className="chat-feed">
          {messages.map((m, i) => {
            const isTyping = m.role === 'assistant' && i === messages.length - 1 && loading === false && bearState === 'speak'
            return (
              <div key={i} className={`bubble ${m.role === 'assistant' ? 'bubble--oso' : 'bubble--user'}`}>
                <div className="bubble-col">
                  <div className="bubble-body">
                    {m.text}{isTyping && <span className="type-cursor" />}
                  </div>
                </div>
              </div>
            )
          })}

          {loading && (
            <div className="bubble bubble--oso">
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
            <VoiceButton
              onInterim={t => setInput(t)}
              onFinal={t => { setInput(''); send(t) }}
              disabled={loading}
            />
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

      {/* Right: always-on visual panel */}
      <div style={{ position: 'relative', overflow: 'hidden', width: '100%', height: '100%' }}>
        <VisualPanel storyTrigger={storyTrigger} bearState={bearState} onBearPosition={setBearPos} />
        {bearPos && (
          <img
            src={BEAR_IMG[bearState] || BEAR_IMG.idle}
            alt="Oso"
            className={`qna-bear-img${bearState === 'speak' ? ' is-speaking' : ''}`}
            draggable={false}
            style={{
              position: 'absolute',
              left: `${bearPos.x + 200}px`,
              top: `${bearPos.y}px`,
              marginLeft: '-40px',
              marginTop: '-40px',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
    </div>
  )
}
