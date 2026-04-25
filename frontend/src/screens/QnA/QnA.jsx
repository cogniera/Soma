import { useState, useEffect, useRef } from 'react'
import { chat } from '../../services/claude'
import { speak } from '../../services/elevenlabs'
import VoiceButton from '../../components/VoiceButton/VoiceButton'

const MAX_TURNS = 4

const FIRST_QUESTION =
  "I'm sorry you're not feeling well. Let's figure this out together — can you tell me exactly where you're feeling it and how long it's been going on?"

export default function QnA({ symptomText, onComplete, onOsoMood }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: FIRST_QUESTION },
  ])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [turns, setTurns]     = useState(0)
  const bottomRef             = useRef(null)

  // Speak the opening question once on mount
  useEffect(() => {
    onOsoMood?.('speak')
    speak(FIRST_QUESTION, { onEnd: () => onOsoMood?.('idle') })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text) => {
    const val = text.trim()
    if (!val || loading) return

    const userMsg = { role: 'user', text: val }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // Build Claude message history
    const history = [
      { role: 'user', content: `My symptom: ${symptomText}` },
      ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text })),
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

    const assistantMsg = { role: 'assistant', text: reply }
    setMessages(prev => [...prev, assistantMsg])
    setLoading(false)

    onOsoMood?.('speak')
    await speak(reply, { onEnd: () => onOsoMood?.('idle') })

    if (newTurns >= MAX_TURNS) {
      setTimeout(() => {
        const fullHistory = [
          { role: 'user', content: `My symptom: ${symptomText}` },
          ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text })),
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
          <div key={i} className={`bubble ${m.role === 'assistant' ? 'bubble--oso' : 'bubble--user'}`}>
            {m.role === 'assistant' && <span className="bubble-avatar">🐻</span>}
            <div className="bubble-body">{m.text}</div>
          </div>
        ))}

        {loading && (
          <div className="bubble bubble--oso">
            <span className="bubble-avatar">🐻</span>
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
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
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
              <path d="M3 10h14M13 6l4 4-4 4" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
