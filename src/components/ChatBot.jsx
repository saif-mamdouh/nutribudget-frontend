import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, Trash2, Loader2, ChevronDown } from 'lucide-react'
import { chatAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'

const QUICK_SUGGESTIONS = {
  weight_loss:  ['أفضل فطار لخسارة الوزن؟', 'كم سعرة في الكشري؟', 'بدائل صحية للأكل السريع؟'],
  muscle_gain:  ['أعلى مصادر البروتين في مصر؟', 'وجبة ما بعد التمرين؟', 'كمية البروتين في فراخ مشوية؟'],
  maintenance:  ['نصيحة لوجبة متوازنة؟', 'كيف أحسب سعراتي اليومية؟', 'أكلات صحية بميزانية محدودة؟'],
}

const DAILY_TIPS = {
  weight_loss:  ['اشرب كوب ماء قبل كل وجبة 💧', 'الفطار المبكر يساعد على حرق الدهون ☀️', 'البروتين في كل وجبة يقلل الجوع 🥚'],
  muscle_gain:  ['البروتين بعد التمرين بـ 30 دقيقة مهم 💪', 'نم 8 ساعات — العضلات بتكبر وانت نايم 😴', 'الكارب قبل التمرين بيديك طاقة ⚡'],
  maintenance:  ['تنويع الأكل مهم للفيتامينات 🥗', 'الأكل البطيء يساعد على الشبع 🍽️', 'الخضار في كل وجبة أساسي 🥦'],
}

export default function ChatBot() {
  const { user }    = useAuthStore()
  const goal        = user?.goal || 'maintenance'
  const suggestions = QUICK_SUGGESTIONS[goal] || QUICK_SUGGESTIONS.maintenance
  const tips        = DAILY_TIPS[goal]        || DAILY_TIPS.maintenance
  const dailyTip    = tips[new Date().getDate() % tips.length]

  const [open,        setOpen]       = useState(false)
  const [messages,    setMessages]   = useState([])
  const [input,       setInput]      = useState('')
  const [loading,     setLoading]    = useState(false)
  const [histLoading, setHistLoading]= useState(false)
  const [unread,      setUnread]     = useState(0)
  const endRef = useRef(null)

  // Load chat history when chat opens
  useEffect(() => {
    if (!open) return
    setHistLoading(true)
    chatAPI.history()
      .then(r => {
        const msgs = r.data?.messages || []
        if (msgs.length > 0) {
          setMessages(msgs.map(m => ({ role: m.role, text: m.content })))
        } else {
          setMessages([{
            role: 'assistant',
            text: `مرحباً ${user?.full_name?.split(' ')[0] || ''}! 🌿\n\n💡 نصيحة اليوم: ${dailyTip}\n\nكيف أقدر أساعدك؟`
          }])
        }
      })
      .catch(() => {
        setMessages([{
          role: 'assistant',
          text: 'Hi! I\'m NutriBot, your nutrition assistant 🌿\nHow can I help?'
        }])
      })
      .finally(() => setHistLoading(false))
  }, [open])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setMessages(prev => [...prev, { role: 'user', text: msg }])
    setInput('')
    setLoading(true)
    try {
      const { data } = await chatAPI.send(msg)
      const reply = data.reply || 'عذراً، حدث خطأ.'
      setMessages(prev => [...prev, { role: 'assistant', text: reply }])
      if (!open) setUnread(u => u + 1)
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: '⚠️ Connection failed. Check that the backend is running.'
      }])
    } finally {
      setLoading(false)
    }
  }

  const clearHistory = async () => {
    if (!window.confirm('Clear all messages? This cannot be undone.')) return
    await chatAPI.clearHistory().catch(() => {})
    setMessages([{ role: 'assistant', text: 'Chat cleared. How can I help? 🌿' }])
  }

  return (
    <>
      {/* Floating button */}
      <button onClick={() => { setOpen(true); setUnread(0) }}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110"
        style={{ background: 'linear-gradient(135deg,#1B5E38,#3A9460)' }}>
        <MessageCircle className="w-6 h-6 text-white"/>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
             style={{ height: 480, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3"
               style={{ background: 'linear-gradient(135deg,#1B5E38,#3A9460)' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">🤖</div>
              <div>
                <p className="text-white text-sm font-bold">NutriBot</p>
                <p className="text-green-200 text-[10px]">AI Nutritionist · Remembers you ✨</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={clearHistory}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-all" title="Clear chat">
                <Trash2 className="w-3.5 h-3.5 text-white/70"/>
              </button>
              <button onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-all">
                <ChevronDown className="w-4 h-4 text-white"/>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {histLoading ? (
              <div className="flex justify-center pt-8">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary)' }}/>
              </div>
            ) : messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && <span className="text-base mr-1.5 mt-0.5 shrink-0">🤖</span>}
                <div className="max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap"
                     style={m.role === 'user'
                       ? { background: 'var(--primary)', color: '#fff', borderBottomRightRadius: 4 }
                       : { background: 'var(--primary-lt)', color: 'var(--text)', borderBottomLeftRadius: 4 }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <span className="text-base mr-1.5">🤖</span>
                <div className="px-3 py-2 rounded-2xl" style={{ background: 'var(--primary-lt)' }}>
                  <div className="flex gap-1 items-center h-4">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                           style={{ background: 'var(--primary)', animationDelay: `${i*0.15}s` }}/>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef}/>
          </div>

          {/* Quick suggestions */}
          {messages.length <= 2 && !loading && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => sendMessage(s)}
                  className="text-[10px] px-2 py-1 rounded-full transition-all hover:opacity-80"
                  style={{ background: 'var(--primary-lt)', color: 'var(--primary)' }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 p-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask anything... اسأل أي حاجة"
              disabled={loading}
              className="flex-1 text-xs px-3 py-2 rounded-xl outline-none"
              style={{ background: 'var(--primary-lt)', color: 'var(--text)', border: '1px solid var(--border)' }}/>
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
              className="p-2 rounded-xl transition-all hover:opacity-80"
              style={{ background: 'var(--primary)', opacity: (!input.trim() || loading) ? 0.5 : 1 }}>
              <Send className="w-4 h-4 text-white"/>
            </button>
          </div>
        </div>
      )}
    </>
  )
}