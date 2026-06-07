import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, Send, Trash2, Loader2, ChevronDown, Database, Zap, CalendarDays } from 'lucide-react'
import { chatAPI, optimizerAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'

const QUICK_SUGGESTIONS = {
  weight_loss: ['أفضل فطار لخسارة الوزن؟', 'كم سعرة في الكشري؟', 'بدائل صحية للأكل السريع؟'],
  muscle_gain: ['أعلى مصادر البروتين في مصر؟', 'وجبة ما بعد التمرين؟', 'كمية البروتين في فراخ مشوية؟'],
  maintenance: ['نصيحة لوجبة متوازنة؟', 'كيف أحسب سعراتي اليومية؟', 'أكلات صحية بميزانية محدودة؟'],
}

const DAILY_TIPS = {
  weight_loss: ['اشرب كوب ماء قبل كل وجبة 💧', 'الفطار المبكر يساعد على حرق الدهون ☀️', 'البروتين في كل وجبة يقلل الجوع 🥚'],
  muscle_gain: ['البروتين بعد التمرين بـ 30 دقيقة مهم 💪', 'نم 8 ساعات — العضلات بتكبر وانت نايم 😴', 'الكارب قبل التمرين بيديك طاقة ⚡'],
  maintenance: ['تنويع الأكل مهم للفيتامينات 🥗', 'الأكل البطيء يساعد على الشبع 🍽️', 'الخضار في كل وجبة أساسي 🥦'],
}

const THINKING = ['بدور في الوجبات المتاحة...', 'بحسب السعرات بتاعتك...', 'بشوف الأسعار الحالية...', 'جاري التحليل...']

// ── Today's progress mini-bar ─────────────────────────────────────────────────
function TodayBar({ data }) {
  if (!data?.targets?.calories) return null
  const pct = Math.min(100, ((data.totals?.calories || 0) / data.targets.calories) * 100)
  const remaining = data.remaining?.calories || 0
  const overBudget = remaining < 0

  return (
    <div className="mx-3 mb-2 p-2 rounded-xl" style={{ background: 'var(--primary-lt)' }}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-medium" style={{ color: 'var(--primary)' }}>
          🎯 سعرات اليوم
        </span>
        <span className="text-[10px]" style={{ color: overBudget ? '#ef4444' : 'var(--text)' }}>
          {overBudget ? `+${Math.abs(remaining).toFixed(0)} زيادة` : `باقي ${remaining.toFixed(0)} kcal`}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: overBudget ? '#ef4444' : 'linear-gradient(90deg,#1B5E38,#3A9460)'
          }}
        />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
          {(data.totals?.calories || 0).toFixed(0)} kcal مسجل
        </span>
        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
          {data.targets.calories} kcal هدف
        </span>
      </div>
    </div>
  )
}

// ── Action card (log meal / create plan) ──────────────────────────────────────
function ActionCard({ action, onConfirm, onDismiss }) {
  if (!action) return null
  const isLog  = action.action === 'log_meal'
  const isPlan = action.action === 'create_plan'

  return (
    <div className="mx-1 mt-1 p-2.5 rounded-xl border"
         style={{ background: 'var(--bg-card)', borderColor: 'var(--primary)', borderWidth: 1 }}>
      <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--primary)' }}>
        {isLog  && `📝 تسجيل وجبة: ${action.recipe_name}`}
        {isPlan && `📅 إنشاء meal plan — ميزانية ${action.budget_egp} EGP`}
      </p>
      <div className="flex gap-1.5">
        <button onClick={() => onConfirm(action)}
          className="flex-1 text-[10px] py-1 rounded-lg text-white transition-all hover:opacity-80"
          style={{ background: 'var(--primary)' }}>
          تأكيد ✓
        </button>
        <button onClick={onDismiss}
          className="flex-1 text-[10px] py-1 rounded-lg transition-all hover:opacity-70"
          style={{ background: 'var(--border)', color: 'var(--text)' }}>
          إلغاء
        </button>
      </div>
    </div>
  )
}

// ── Main ChatBot ──────────────────────────────────────────────────────────────
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
  const [streaming,   setStreaming]  = useState(false)
  const [histLoading, setHistLoading]= useState(false)
  const [unread,      setUnread]     = useState(0)
  const [thinkIdx,    setThinkIdx]   = useState(0)
  const [todayData,   setTodayData]  = useState(null)
  const [pendingAction, setPendingAction] = useState(null)
  const [useStream,   setUseStream]  = useState(true)   // toggle streaming on/off

  const endRef    = useRef(null)
  const thinkRef  = useRef(null)
  const abortRef  = useRef(null)

  // Rotate thinking phrase
  useEffect(() => {
    if (loading) {
      setThinkIdx(0)
      thinkRef.current = setInterval(() => setThinkIdx(i => (i + 1) % THINKING.length), 1800)
    } else {
      clearInterval(thinkRef.current)
    }
    return () => clearInterval(thinkRef.current)
  }, [loading])

  // Load history + today summary when opened
  useEffect(() => {
    if (!open) return
    setHistLoading(true)

    Promise.all([
      chatAPI.history(),
      chatAPI.today().catch(() => null),   // new endpoint — graceful fallback
    ]).then(([histRes, todayRes]) => {
      const msgs = histRes.data?.messages || []
      setMessages(msgs.length > 0
        ? msgs.map(m => ({ role: m.role, text: m.content }))
        : [{ role: 'assistant', text: `مرحباً ${user?.full_name?.split(' ')[0] || ''}! 🌿\n\n💡 نصيحة اليوم: ${dailyTip}\n\nكيف أقدر أساعدك؟` }]
      )
      if (todayRes?.data) setTodayData(todayRes.data)
    }).catch(() => {
      setMessages([{ role: 'assistant', text: 'مرحباً! أنا NutriBot 🌿 كيف أساعدك؟' }])
    }).finally(() => setHistLoading(false))
  }, [open])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // ── Send with streaming ───────────────────────────────────────────────────
  const sendStream = useCallback(async (msg) => {
    setLoading(true)
    setStreaming(true)
    // Add empty assistant message that we'll fill token by token
    setMessages(prev => [...prev, { role: 'assistant', text: '', streaming: true }])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const token = localStorage.getItem('access_token') || ''
      const resp = await fetch('/api/v1/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: msg }),
        signal: controller.signal,
      })

      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let ragMatched = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.token) {
              ragMatched = data.rag_matched
              setMessages(prev => {
                const last = prev[prev.length - 1]
                return [...prev.slice(0, -1), { ...last, text: last.text + data.token }]
              })
            }
            if (data.done) {
              setMessages(prev => {
                const last = prev[prev.length - 1]
                // Check for action JSON in final text
                let action = null
                let displayText = last.text.trim()
                try {
                  const parsed = JSON.parse(displayText)
                  if (parsed.action) {
                    action = parsed
                    // Hide raw JSON — show friendly message instead
                    displayText = parsed.action === 'log_meal'
                      ? `حابب أسجل وجبة "${parsed.recipe_name}" — تأكد من الكارت أدناه 👇`
                      : `حابب أعمل meal plan بميزانية ${parsed.budget_egp} EGP — تأكد من الكارت أدناه 👇`
                  }
                } catch {}
                return [...prev.slice(0, -1), { ...last, text: displayText, streaming: false, ragMatched, action }]
              })
              if (!open) setUnread(u => u + 1)
            }
            if (data.error) throw new Error(data.error)
          } catch {}
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        setMessages(prev => [...prev.slice(0, -1), {
          role: 'assistant', text: '⚠️ فشل الاتصال. تأكد أن الـ backend شغال.'
        }])
      }
    } finally {
      setLoading(false)
      setStreaming(false)
    }
  }, [open])

  // ── Send standard (non-streaming) ────────────────────────────────────────
  const sendStandard = useCallback(async (msg) => {
    setLoading(true)
    try {
      const { data } = await chatAPI.send(msg)
      const reply = data.reply || 'عذراً، حدث خطأ.'
      setMessages(prev => [...prev, {
        role: 'assistant', text: reply,
        ragMatched: data.rag_matched,
        action: data.action || null,
      }])
      if (data.action) setPendingAction(data.action)
      if (!open) setUnread(u => u + 1)
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: '⚠️ فشل الاتصال.' }])
    } finally {
      setLoading(false)
    }
  }, [open])

  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setMessages(prev => [...prev, { role: 'user', text: msg }])
    setInput('')
    setPendingAction(null)
    if (useStream) await sendStream(msg)
    else           await sendStandard(msg)
  }, [input, loading, useStream, sendStream, sendStandard])

  // ── Action handlers ───────────────────────────────────────────────────────
  const handleActionConfirm = async (action) => {
    setPendingAction(null)

    // ── تسجيل وجبة ──────────────────────────────────────────────────────────
    if (action.action === 'log_meal') {
      try {
        // /chat/log-meal: يجيب الماكروز من nutrition_facts
        // ويكتب في meal_logs (Dashboard) + meal_plans (History) مع بعض
        const { data } = await chatAPI.logMeal({
          recipe_name: action.recipe_name,
          meal_type:   action.meal_type || 'snack',
        })
        const macros = data.macros || {}
        const source = data.macros_source === 'nutrition_facts' ? '📊 من قاعدة البيانات' : '📊 تقديري'
        const cal    = macros.calories  ? `${macros.calories.toFixed(0)} kcal` : '—'
        const prot   = macros.protein_g ? `بروتين ${macros.protein_g.toFixed(1)}g` : ''
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: `✅ تم تسجيل "${data.recipe_name}"!\n${source}: ${cal} | ${prot}\n\n📋 هتلاقيه في الـ History والـ Dashboard اتحدث 👆`
        }])
      } catch (e) {
        const msg = e?.response?.data?.detail || 'حدث خطأ أثناء التسجيل'
        setMessages(prev => [...prev, { role: 'assistant', text: `❌ ${msg}` }])
      }
      // رفرش الـ progress bar
      try {
        const r = await chatAPI.today()
        setTodayData(r.data)
      } catch {
        try {
          const r = await optimizerAPI.todayLogs()
          const items = r.data?.meals || []
          const totals = {
            calories:  items.reduce((s, i) => s + (i.calories  || 0), 0),
            protein_g: items.reduce((s, i) => s + (i.protein_g || 0), 0),
            carbs_g:   items.reduce((s, i) => s + (i.carbs_g   || 0), 0),
            fats_g:    items.reduce((s, i) => s + (i.fats_g    || 0), 0),
            cost_egp:  items.reduce((s, i) => s + (i.cost_egp  || 0), 0),
          }
          setTodayData(prev => ({ ...prev, items, totals,
            remaining: {
              calories: (prev?.targets?.calories || 0) - totals.calories,
              budget:   (prev?.targets?.budget_egp || 0) - totals.cost_egp,
            }
          }))
        } catch {}
      }
    }

    // ── إنشاء meal plan ──────────────────────────────────────────────────────
    if (action.action === 'create_plan') {
      setMessages(prev => [...prev, { role: 'assistant', text: '📅 جاري إنشاء الـ meal plan...' }])
      try {
        // optimizerAPI.mealPlan موجود في api.js
        // بيستقبل: { budget_egp, period, ... }
        const { data } = await optimizerAPI.mealPlan({
          budget_egp: action.budget_egp,
          period:     action.period || 'daily',
        })
        const planName = data?.plan_name || 'الخطة الجديدة'
        const cost     = data?.total_cost_egp?.toFixed(1) || '—'
        const cals     = data?.total_calories?.toFixed(0) || '—'
        setMessages(prev => [...prev.slice(0, -1), {
          role: 'assistant',
          text: `✅ تم إنشاء "${planName}"!\n📊 ${cals} kcal | ${cost} EGP\nافتح صفحة الـ Meal Plan لتفاصيل أكثر 🗓️`
        }])
      } catch (e) {
        const msg = e?.response?.data?.detail || 'حدث خطأ أثناء إنشاء الخطة'
        setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', text: `❌ ${msg}` }])
      }
    }
  }

  const clearHistory = async () => {
    if (!window.confirm('مسح كل الرسائل؟ لا يمكن التراجع.')) return
    await chatAPI.clearHistory().catch(() => {})
    setMessages([{ role: 'assistant', text: 'تم المسح. كيف أساعدك؟ 🌿' }])
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
             style={{ height: 520, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3"
               style={{ background: 'linear-gradient(135deg,#1B5E38,#3A9460)' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">🤖</div>
              <div>
                <p className="text-white text-sm font-bold">NutriBot</p>
                <p className="text-green-200 text-[10px]">بيعرف أسعارنا الحقيقية ✨</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Stream toggle */}
              <button onClick={() => setUseStream(s => !s)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-all"
                title={useStream ? 'Streaming ON' : 'Streaming OFF'}>
                <Zap className={`w-3.5 h-3.5 ${useStream ? 'text-yellow-300' : 'text-white/40'}`}/>
              </button>
              <button onClick={clearHistory}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-all" title="مسح الشات">
                <Trash2 className="w-3.5 h-3.5 text-white/70"/>
              </button>
              <button onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-all">
                <ChevronDown className="w-4 h-4 text-white"/>
              </button>
            </div>
          </div>

          {/* Today's progress bar */}
          {todayData && <TodayBar data={todayData} />}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {histLoading ? (
              <div className="flex justify-center pt-8">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary)' }}/>
              </div>
            ) : messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-end gap-1.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {m.role === 'assistant' && <span className="text-base mb-0.5 shrink-0">🤖</span>}
                  <div className="max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap"
                       style={m.role === 'user'
                         ? { background: 'var(--primary)', color: '#fff', borderBottomRightRadius: 4 }
                         : { background: 'var(--primary-lt)', color: 'var(--text)', borderBottomLeftRadius: 4 }}>
                    {m.text}
                    {m.streaming && (
                      <span className="inline-block w-0.5 h-3 ml-0.5 animate-pulse"
                            style={{ background: 'var(--primary)', verticalAlign: 'middle' }}/>
                    )}
                  </div>
                </div>

                {/* RAG badge */}
                {m.role === 'assistant' && m.ragMatched && !m.streaming && (
                  <div className="flex items-center gap-1 mt-0.5 ml-8">
                    <Database className="w-2.5 h-2.5" style={{ color: 'var(--primary)' }}/>
                    <span className="text-[9px]" style={{ color: 'var(--primary)' }}>من قاعدة بياناتنا</span>
                  </div>
                )}

                {/* Action card */}
                {m.role === 'assistant' && m.action && (
                  <div className="ml-8 mt-1 w-full max-w-[85%]">
                    <ActionCard
                      action={m.action}
                      onConfirm={handleActionConfirm}
                      onDismiss={() => setMessages(prev =>
                        prev.map((msg, idx) => idx === i ? { ...msg, action: null } : msg)
                      )}
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Thinking indicator (only for non-streaming) */}
            {loading && !streaming && (
              <div className="flex justify-start items-end gap-1.5">
                <span className="text-base mb-0.5">🤖</span>
                <div className="px-3 py-2 rounded-2xl rounded-bl-sm" style={{ background: 'var(--primary-lt)' }}>
                  <p className="text-[10px] mb-1.5" style={{ color: 'var(--primary)' }}>{THINKING[thinkIdx]}</p>
                  <div className="flex gap-1">
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
              placeholder="اسأل أي حاجة..."
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