import { Bot, Leaf, MessageCircle, Send, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import api from '../../api'

const quickPrompts = ['What is fresh today?', 'When is the next market?', 'How does pickup work?']

const localAnswer = (question) => {
  const query = question.toLowerCase()
  const db = api.snapshot()
  if (query.includes('fresh') || query.includes('stock') || query.includes('available')) {
    const items = db.products.filter((item) => item.available && item.stock > 0).slice(0, 3).map((item) => `${item.name} (${item.stock} left)`).join(', ')
    return `Fresh right now: ${items}. You can reserve any of these from the produce page.`
  }
  if (query.includes('market') || query.includes('when') || query.includes('time')) {
    const market = db.markets[0]
    return `The next market is ${market?.name || 'Farmers Market'} on ${market?.day || 'Saturday'}, ${market?.date || 'Weekly'}, from ${market?.hours || '8:00 AM — 2:00 PM'}.`
  }
  if (query.includes('pickup') || query.includes('pay')) return 'Reserve online, choose a pickup window, then collect from the farmer’s stall. Payment is made in person—there is no online payment.'
  if (query.includes('tomato')) return 'Local farms have fresh tomatoes in stock for market pickup this week.'
  return 'I can help with produce availability, market schedules, farmer locations, and pickup. Try asking what is fresh today.'
}

export default function AIChatbot() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([{ from: 'bot', text: 'Hi, I’m Sprout. Looking for something fresh?' }])

  const send = async (value = text) => {
    const clean = value.trim()
    if (!clean || loading) return

    setMessages((current) => [...current, { from: 'user', text: clean }])
    setText('')
    setLoading(true)

    try {
      // Feature 6: Call backend AI chat endpoint with live database intelligence
      const res = await api.ai.chat(clean, messages)
      const botReply = res?.reply || localAnswer(clean)
      setMessages((current) => [...current, { from: 'bot', text: botReply }])
    } catch {
      setMessages((current) => [...current, { from: 'bot', text: localAnswer(clean) }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="chatbot">
      {open && (
        <section className="chat-panel" aria-label="MarketLink assistant">
          <header>
            <span><Bot /></span>
            <div><b>Ask Sprout</b><small><i /> Live AI market assistant</small></div>
            <button onClick={() => setOpen(false)} aria-label="Close assistant"><X /></button>
          </header>
          <div className="chat-messages">
            {messages.map((message, index) => (
              <div key={index} className={`chat-message chat-message--${message.from}`}>
                {message.from === 'bot' && <Leaf />}
                <p style={{ whiteSpace: 'pre-line' }}>{message.text}</p>
              </div>
            ))}
            {loading && (
              <div className="chat-message chat-message--bot">
                <Leaf />
                <p>Sprout is thinking...</p>
              </div>
            )}
          </div>
          {messages.length < 3 && (
            <div className="quick-prompts">
              {quickPrompts.map((prompt) => (
                <button key={prompt} onClick={() => send(prompt)} disabled={loading}>
                  <Sparkles />{prompt}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={(event) => { event.preventDefault(); send() }}>
            <input aria-label="Ask about markets or produce" value={text} onChange={(event) => setText(event.target.value)} placeholder="Ask about markets or produce…" disabled={loading} />
            <button aria-label="Send" disabled={loading}><Send /></button>
          </form>
        </section>
      )}
      <button className="chat-toggle" onClick={() => setOpen((value) => !value)} aria-label="Open AI market assistant">
        {open ? <X /> : <MessageCircle />}
        <span>Ask Sprout</span>
      </button>
    </div>
  )
}
