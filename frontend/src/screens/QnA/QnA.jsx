import { useState, useEffect, useRef } from 'react'
import { chat, muscleStory, muscleFocus } from '../../services/claude'
import { speak, stopSpeaking } from '../../services/elevenlabs'
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

        <VoxelBrain
          focusGroup={focusGroup}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      </div>
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

  const typeInto = (text, duration) => {
    clearInterval(typeTimer.current)
    if (!duration || duration <= 0) return
    const chars = text.length
    const delay = (duration * 1000) / chars
    let i = 0
    typeTimer.current = setInterval(() => {
      i++
      setMessages(prev => {
        const next = [...prev]
        next[next.length - 1] = { ...next[next.length - 1], text: text.slice(0, i) }
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

    // type the chat reply in sync with the total narration duration
    const totalChars = chatReply.length
    let charsSoFar = 0

    for (const item of story) {
      if (cancelled?.()) break
      setStoryTrigger(item.script)
      await speak(item.script, {
        onDuration: (dur) => {
          // portion of chat reply to type during this segment
          const segChars = Math.round((item.script.length / story.reduce((s, i) => s + i.script.length, 0)) * totalChars)
          const start = charsSoFar
          const end = Math.min(charsSoFar + segChars, totalChars)
          charsSoFar = end
          const delay = dur ? (dur * 1000) / (end - start) : 30
          let i = start
          clearInterval(typeTimer.current)
          typeTimer.current = setInterval(() => {
            i++
            setMessages(prev => {
              const next = [...prev]
              next[next.length - 1] = { ...next[next.length - 1], text: chatReply.slice(0, i) }
              return next
            })
            if (i >= end) clearInterval(typeTimer.current)
          }, delay)
        },
      })
    }
    if (!cancelled?.()) stopTyping(chatReply)
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
      <div style={{ position: 'relative', overflow: 'hidden' }}>
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
