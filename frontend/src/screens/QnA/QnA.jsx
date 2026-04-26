import { useState, useEffect, useRef } from 'react'
import { chat, muscleStory } from '../../services/claude'
import { speak } from '../../services/elevenlabs'
import VoiceButton from '../../components/VoiceButton/VoiceButton'
import osoIdle from '../../assets/oso-idle.png'
import osoSpeak from '../../assets/oso-speak.png'

const BEAR_IMG = { idle: osoIdle, speak: osoSpeak }
const MAX_TURNS = 4

const FIRST_QUESTION =
  "I'm sorry you're not feeling well. Let's figure this out together - can you tell me exactly where you're feeling it and how long it's been going on?"

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
// muscle-by-muscle anatomy story via Gemma.
function Popup({ symptomText, onClose }) {
  const [story, setStory]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    muscleStory(symptomText)
      .then(s => { if (!cancelled) { setStory(s); setLoading(false) } })
      .catch(err => { if (!cancelled) { setError(err.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [symptomText])

  return (
    <div
      className="qna-popup-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
    >
      <div className="qna-popup-box">
        <button
          className="qna-popup-close"
          onClick={onClose}
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M4 4l10 10M14 4L4 14"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" />
          </svg>
        </button>

        <div className="muscle-story">
          <p className="muscle-story-eyebrow">Anatomy walkthrough</p>
          <h3 className="muscle-story-title">Muscles in your story</h3>

          {loading && (
            <div className="muscle-story-loading">
              <div className="triage-spinner" />
              <p>Building your visual…</p>
            </div>
          )}

          {error && !loading && (
            <p className="muscle-story-error">
              Couldn't build the story right now. Please try again.
            </p>
          )}

          {story && story.length > 0 && (
            <ol className="muscle-story-list">
              {story.map(s => (
                <li key={`${s.index}-${s.muscle}`} className="muscle-story-item">
                  <span className="muscle-story-index">{s.index}</span>
                  <div className="muscle-story-body">
                    <div className="muscle-story-name">
                      {s.muscle.replace(/_/g, ' ')}
                    </div>
                    <p className="muscle-story-script">{s.script}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {story && story.length === 0 && !loading && (
            <p className="muscle-story-error">
              No muscle story could be generated for that prompt.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function QnA({ symptomText, onComplete, onOsoMood }) {
  const [messages,  setMessages]  = useState([
    { role: 'assistant', text: FIRST_QUESTION },
  ])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [turns,     setTurns]     = useState(0)
  const [bearState, setBearState] = useState('speak')
  const [popupOpen, setPopupOpen] = useState(false)
  const bottomRef = useRef(null)

  const lastOsoIdx = loading
    ? -1
    : messages.reduce((last, m, i) => m.role === 'assistant' ? i : last, -1)

  useEffect(() => {
    onOsoMood?.('speak')
    speak(FIRST_QUESTION, {
      onEnd: () => { setBearState('idle'); onOsoMood?.('idle') },
    })
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
      onEnd: () => { setBearState('idle'); onOsoMood?.('idle') },
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

                {/* Expand button — only on Oso messages, not while loading */}
                {m.role === 'assistant' && !loading && (
                  <button
                    className="bubble-expand-btn"
                    onClick={() => setPopupOpen(true)}
                    aria-label="Open visual"
                  >
                    <ExpandIcon />
                    <span>Click to see visual</span>
                  </button>
                )}
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
            <VoiceButton onFinal={t => send(t)} disabled={loading} />
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
        />
      )}
    </>
  )
}
