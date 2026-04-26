import { useState, useEffect, useRef } from 'react'
import { chat } from '../../services/claude'
import { speak } from '../../services/elevenlabs'
import VoiceButton from '../../components/VoiceButton/VoiceButton'
import osoIdle from '../../assets/oso-idle.png'
import osoSpeak from '../../assets/oso-speak.png'

const BEAR_IMG = {
  idle: osoIdle,
  speak: osoSpeak,
}
const MAX_TURNS = 4

const FIRST_QUESTION =
  "I'm sorry you're not feeling well. Let's figure this out together - can you tell me exactly where you're feeling it and how long it's been going on?"

// ── Bear avatar components ────────────────────────────────────

/** The live, full-size bear that pops into place next to the latest Oso message */
function LiveAvatar({ state }) {
  return (
    <div className={`bubble-avatar--live${state === 'speak' ? ' is-speaking' : ''}`}>
      <img
        // key forces a re-mount (re-triggering the pop animation)
        // every time a new message becomes the "latest"
        key={state}
        src={BEAR_IMG[state] || BEAR_IMG.idle}
        alt="Oso"
        className="oso-avatar-img"
        draggable={false}
      />
    </div>
  )
}

/** Small faded placeholder that keeps column alignment for past messages */
function PastAvatar() {
  return <div className="bubble-avatar--past">🐻</div>
}


export default function QnA({ symptomText, onComplete, onOsoMood }) {
  const [messages,   setMessages]   = useState([
    { role: 'assistant', text: FIRST_QUESTION },
  ])
  const [input,      setInput]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [turns,      setTurns]      = useState(0)
  const [bearState,  setBearState]  = useState('speak') // 'idle' | 'speak'
  const bottomRef = useRef(null)

  // ── Find the index of the most recent assistant message ─────
  // We recompute this on every render so the "live" avatar always
  // tracks the latest bubble, including while loading.
  const lastOsoIdx = loading
    ? -1   // loading bubble takes over; no past message is "live"
    : messages.reduce((last, m, i) =>
        m.role === 'assistant' ? i : last, -1)

  // ── Speak the opening question once on mount ─────────────────
  useEffect(() => {
    onOsoMood?.('speak')
    speak(FIRST_QUESTION, {
      onEnd: () => {
        setBearState('idle')
        onOsoMood?.('idle')
      },
    })
  }, [])

  // ── Auto-scroll to bottom ────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // ── Send a message ───────────────────────────────────────────
  const send = async (text) => {
    const val = text.trim()
    if (!val || loading) return

    setMessages(prev => [...prev, { role: 'user', text: val }])
    setInput('')
    setLoading(true)
    setBearState('speak')
    onOsoMood?.('speak')

    const history = [
      { role: 'user', content: `My symptom: ${symptomText}` },
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
      onEnd: () => {
        setBearState('idle')
        onOsoMood?.('idle')
      },
    })

    if (newTurns >= MAX_TURNS) {
      setTimeout(() => {
        const fullHistory = [
          { role: 'user', content: `My symptom: ${symptomText}` },
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
    <div className="screen qna-screen">
      <div className="chat-feed">

        {messages.map((m, i) => (
          <div
            key={i}
            className={`bubble ${m.role === 'assistant' ? 'bubble--oso' : 'bubble--user'}`}
          >
            {m.role === 'assistant' && (
              // Live avatar only on the most recent Oso message;
              // past messages get a small faded placeholder.
              i === lastOsoIdx
                ? <LiveAvatar state={bearState} />
                : <PastAvatar />
            )}
            <div className="bubble-body">{m.text}</div>
          </div>
        ))}

        {/* Loading bubble — bear is always "live" while thinking */}
        {loading && (
          <div className="bubble bubble--oso">
            <LiveAvatar state="speak" />
            <div className="bubble-body typing">
              <span /><span /><span />
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
          <VoiceButton onFinal={t => send(t)} disabled={loading} />
          <button
            className="send-icon-btn"
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            aria-label="Send"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M3 10h14M13 6l4 4-4 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}