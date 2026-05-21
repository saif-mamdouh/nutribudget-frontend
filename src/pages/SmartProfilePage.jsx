import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Zap, Brain, Calculator, ArrowRight,
  User, Target, Activity, ChevronRight,
  CheckCircle2, AlertCircle, Sparkles,
} from 'lucide-react'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'
import { Card, Button, Spinner, Alert, SectionHeader, MacroBar } from '../components/UI'

// ── API calls ─────────────────────────────────────────────────────────────────
const pipelineAPI = {
  parseText:    (text)  => api.post('/profile/parse-text',     { text }),
  calcMacros:   (data)  => api.post('/profile/calculate-macros', data),
  fullPipeline: (text)  => api.post('/profile/full-pipeline',  { text }),
  saveTargets:  (data)  => api.post('/profile/save-targets',    data),
}

// ── Constants ─────────────────────────────────────────────────────────────────
const ACTIVITY_OPTS = [
  { key: 'sedentary',    ar: 'مكتبي',         en: 'Sedentary',     sub: 'No exercise' },
  { key: 'light',        ar: 'خفيف',           en: 'Light',         sub: '1-3 days/week' },
  { key: 'moderate',     ar: 'متوسط',          en: 'Moderate',      sub: '3-5 days/week' },
  { key: 'active',       ar: 'نشيط',           en: 'Active',        sub: '6-7 days/week' },
  { key: 'very_active',  ar: 'نشيط جداً',      en: 'Very Active',   sub: 'Athlete / labor' },
]

const GOAL_OPTS = [
  { key: 'weight_loss',    ar: 'إنقاص وزن',    en: 'Weight Loss',    emoji: '🔥', color: 'orange' },
  { key: 'maintenance',    ar: 'ثبات وزن',     en: 'Maintenance',    emoji: '⚖️', color: 'blue' },
  { key: 'muscle_gain',    ar: 'بناء عضل',     en: 'Muscle Gain',    emoji: '💪', color: 'emerald' },
  { key: 'general_health', ar: 'صحة عامة',     en: 'General Health', emoji: '🌿', color: 'violet' },
]

// ── Donut-style macro display ─────────────────────────────────────────────────
function MacroSummary({ macros }) {
  const items = [
    { label: 'Calories',  value: macros.calories,   unit: 'kcal', color: 'orange',  max: 3500 },
    { label: 'Protein',   value: macros.protein_g,  unit: 'g',    color: 'blue',    max: 250  },
    { label: 'Carbs',     value: macros.carbs_g,    unit: 'g',    color: 'emerald', max: 400  },
    { label: 'Fats',      value: macros.fats_g,     unit: 'g',    color: 'violet',  max: 150  },
  ]
  return (
    <div className="space-y-3">
      {items.map(i => (
        <MacroBar key={i.label} label={i.label} value={i.value}
          max={i.max} unit={` ${i.unit}`} color={i.color} />
      ))}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SmartProfilePage() {
  const navigate   = useNavigate()
  const { fetchMe, user }= useAuthStore()

  // Input mode
  const [mode, setMode] = useState('manual')   // 'nlp' | 'manual'

  // NLP state
  const [nlpText,    setNlpText]    = useState('')
  const [nlpResult,  setNlpResult]  = useState(null)

  // Manual form
  // Auto-load from saved profile
  const [form, setForm] = useState({
    age:            user?.age              || 25,
    weight_kg:      user?.weight_kg        || 70,
    height_cm:      user?.height_cm        || 170,
    gender:         user?.gender           || 'male',
    activity_level: user?.activity_level   || 'moderate',
    goal:           user?.goal             || 'general_health',
    budget_egp:     user?.daily_budget_egp || 200,
  })

  // Banner: show if profile is pre-loaded
  const profileLoaded = !!(user?.age && user?.weight_kg && user?.height_cm)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Results
  const [macros,   setMacros]   = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [saved,    setSaved]    = useState(false)

  // ── NLP pipeline ──────────────────────────────────────────────────────────
  const runNLP = async () => {
    if (!nlpText.trim()) return
    setLoading(true); setError(null); setMacros(null)
    try {
      const { data } = await pipelineAPI.fullPipeline(nlpText)
      setNlpResult(data.parsed_profile)
      if (data.macro_targets?.calories > 0) {
        setMacros(data.macro_targets)
        // Sync form with extracted values
        if (data.parsed_profile) {
          const p = data.parsed_profile
          if (p.age)            setF('age', p.age)
          if (p.weight_kg)      setF('weight_kg', p.weight_kg)
          if (p.height_cm)      setF('height_cm', p.height_cm)
          if (p.gender)         setF('gender', p.gender)
          if (p.activity_level) setF('activity_level', p.activity_level)
          if (p.goal)           setF('goal', p.goal)
        }
      } else {
        setError(data.message)
      }
    } catch (e) {
      setError(e.response?.data?.detail || 'NLP parsing failed')
    } finally { setLoading(false) }
  }

  // ── Manual calculation ────────────────────────────────────────────────────
  const runManual = async () => {
    setLoading(true); setError(null); setMacros(null)
    try {
      const { data } = await pipelineAPI.calcMacros(form)
      setMacros(data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Calculation failed')
    } finally { setLoading(false) }
  }

  // ── Save to profile ───────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!macros) { setError('احسب الـ macros الأول'); return }
    setLoading(true); setError(null)
    try {
      // Build full payload: physical info + calculated macros
      const payload = {
        age:               form.age,
        weight_kg:         form.weight_kg,
        height_cm:         form.height_cm,
        gender:            form.gender,
        activity_level:    form.activity_level,
        goal:              form.goal,
        daily_budget_egp:  form.budget_egp,
        // Calculated macros from the macro calculator
        daily_calories:    Math.round(macros.calories  || 0),
        daily_protein_g:   parseFloat((macros.protein_g || 0).toFixed(1)),
        daily_carbs_g:     parseFloat((macros.carbs_g   || 0).toFixed(1)),
        daily_fats_g:      parseFloat((macros.fats_g    || 0).toFixed(1)),
      }
      // Use PATCH /users/me directly — no separate save-targets endpoint needed
      await api.patch('/users/me', payload)
      await fetchMe()
      setSaved(true)
      setTimeout(() => navigate('/optimize'), 1500)
    } catch (e) {
      setError(e.response?.data?.detail || 'فشل الحفظ. جرب تاني.')
    } finally { setLoading(false) }
  }

  // ── Optimize now ─────────────────────────────────────────────────────────
  const handleOptimize = () => {
    if (macros) navigate('/optimize', { state: { macros } })
  }

  return (
    <div className="page-enter space-y-6 max-w-4xl">
      <SectionHeader
        title="Smart Profile Setup"
        subtitle="3-layer AI pipeline: NLP → Macro Calculator → Meal Optimizer"
      />

      {/* Pipeline visualization */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { n: 1, label: 'NLP Understanding', sub: 'Arabic/English text', icon: Brain,      active: mode === 'nlp' },
          { n: 2, label: 'Macro Calculator',  sub: 'Mifflin-St Jeor',     icon: Calculator, active: true },
          { n: 3, label: 'MILP Optimizer',    sub: 'Recipe selection',    icon: Zap,        active: false },
        ].map((step, i) => (
          <div key={step.n} className="flex items-center gap-2 shrink-0">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
              step.active
                ? 'border-[#2D7A4F] bg-green-50 dark:bg-green-900/20'
                : 'border-slate-200 dark:border-[#143D22] bg-white dark:bg-[#0C2118]'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step.active ? 'bg-[#2D7A4F] text-white' : 'bg-slate-200 dark:bg-[#134d26] text-slate-500'
              }`}>{step.n}</div>
              <step.icon className={`w-4 h-4 ${step.active ? 'text-[#2D7A4F] dark:text-[#4DB87A]' : 'text-slate-400'}`} />
              <div>
                <p className={`text-xs font-semibold ${step.active ? 'text-[#1B5E38] dark:text-[#4DB87A]' : 'text-slate-500 dark:text-[#56A870]'}`}>
                  {step.label}
                </p>
                <p className="text-[10px] text-slate-400">{step.sub}</p>
              </div>
            </div>
            {i < 2 && <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />}
          </div>
        ))}
      </div>

      {/* Profile pre-loaded banner */}
      {profileLoaded && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl
                        bg-emerald-50 dark:bg-emerald-900/20
                        border border-emerald-200 dark:border-emerald-800/40">
          <span className="text-emerald-500 text-lg">✅</span>
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              Profile auto-loaded
            </p>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70">
              Age {user.age} · {user.weight_kg}kg · {user.height_cm}cm · {user.gender} · {user.goal?.replace('_',' ')}
            </p>
          </div>
          <span className="ml-auto text-xs text-emerald-500 font-medium">
            From My Profile →
          </span>
        </div>
      )}

      {/* Mode selector */}
      <div className="flex bg-slate-100 dark:bg-[#0C2118] rounded-xl p-1 gap-1 w-fit">
        {[
          { key: 'nlp',    label: '✨ Smart Input (Arabic/English)', icon: Sparkles },
          { key: 'manual', label: '⚙️  Manual Input',               icon: User },
        ].map(m => (
          <button key={m.key} onClick={() => setMode(m.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              mode === m.key
                ? 'bg-white dark:bg-[#134d26] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Left: Input ─────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* NLP Mode */}
          {mode === 'nlp' && (
            <Card>
              <h3 className="font-semibold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
                <Brain className="w-4 h-4 text-[#2D7A4F] dark:text-[#4DB87A]" /> اكتب بالعربي أو الإنجليزي
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#56A870] mb-3">
                MiniLM NLP Engine — بيفهم نصك ويستخرج بياناتك تلقائياً (Layer 1 — NLP)
              </p>
              <textarea
                className="input resize-none h-32 text-sm leading-relaxed mb-3"
                placeholder={`مثال:\n"أنا 28 سنة، وزني 85 كيلو، طولي 178، بتمرن 4 مرات في الأسبوع، عايز أبني عضل، ميزانيتي 250 جنيه في اليوم"`}
                value={nlpText}
                onChange={e => setNlpText(e.target.value)}
                dir="auto"
              />
              {/* Example prompts */}
              <div className="space-y-1.5 mb-4">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Quick examples:</p>
                {[
                  'أنا بنت 22 سنة، 60 كيلو، 162 سم، عايزة أنزل وزن، بمشي كل يوم',
                  'Male, 35, 95kg, 180cm, gym 5x/week, goal: muscle gain, budget 300 EGP',
                  'عندي 40 سنة، وزني 75، طولي 170، مكتبي، عايز أتحسن صحتي',
                ].map((ex, i) => (
                  <button key={i} onClick={() => setNlpText(ex)}
                    className="w-full text-left text-[11px] text-slate-500 dark:text-[#56A870]
                               hover:text-[#2D7A4F] dark:text-[#4DB87A] hover:bg-green-50 dark:hover:bg-green-500/10
                               px-3 py-1.5 rounded-lg transition-all border border-transparent
                               hover:border-green-200 dark:hover:border-green-800/40 truncate">
                    {ex}
                  </button>
                ))}
              </div>
              <Button variant="primary" className="w-full" onClick={runNLP}
                loading={loading} icon={<Brain className="w-4 h-4" />}>
                Analyze Text
              </Button>

              {/* NLP result */}
              {nlpResult && (
                <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-[#134d26]/40 text-xs space-y-1.5">
                  <p className="font-semibold text-slate-700 dark:text-green-100 mb-2">
                    🧠 Extracted Profile
                    <span className={`ml-2 text-[10px] ${nlpResult.confidence > 0.7 ? 'text-emerald-500' : 'text-[#2D7A4F] dark:text-[#4DB87A]'}`}>
                      {(nlpResult.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </p>
                  {[
                    ['Age',      nlpResult.age,            'سنة'],
                    ['Weight',   nlpResult.weight_kg,      'kg'],
                    ['Height',   nlpResult.height_cm,      'cm'],
                    ['Gender',   nlpResult.gender,         ''],
                    ['Activity', nlpResult.activity_level, ''],
                    ['Goal',     nlpResult.goal,           ''],
                  ].map(([label, val, unit]) => val && (
                    <div key={label} className="flex justify-between">
                      <span className="text-slate-500 dark:text-[#56A870]">{label}</span>
                      <span className="font-medium text-slate-700 dark:text-green-100">
                        {val} {unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Manual Mode */}
          {mode === 'manual' && (
            <Card>
              <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#2D7A4F] dark:text-[#4DB87A]" /> Manual Input
              </h3>

              {/* Gender */}
              <div className="mb-4">
                <p className="label">Gender</p>
                <div className="grid grid-cols-2 gap-2">
                  {[['male', '♂ Male (ذكر)'], ['female', '♀ Female (أنثى)']].map(([k, l]) => (
                    <button key={k} onClick={() => setF('gender', k)}
                      className={`py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                        form.gender === k
                          ? 'border-[#2D7A4F] bg-green-50 dark:bg-green-900/20 text-[#1B5E38] dark:text-[#4DB87A]'
                          : 'border-slate-200 dark:border-[#143D22] text-slate-600 dark:text-[#56A870]'
                      }`}>{l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-3 mb-4">
                {[
                  { k: 'age',       l: 'Age',    u: 'y',  min: 10,  max: 80,  step: 1 },
                  { k: 'weight_kg', l: 'Weight', u: 'kg', min: 30,  max: 200, step: 1 },
                  { k: 'height_cm', l: 'Height', u: 'cm', min: 100, max: 220, step: 1 },
                  { k: 'budget_egp',l: 'Daily Budget', u: 'EGP', min: 50, max: 1000, step: 10 },
                ].map(({ k, l, u, min, max, step }) => (
                  <div key={k}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700 dark:text-green-100">{l}</span>
                      <span className="font-mono text-[#2D7A4F] dark:text-[#4DB87A]">{form[k]} {u}</span>
                    </div>
                    <input type="range" min={min} max={max} step={step} value={form[k]}
                      onChange={e => setF(k, parseFloat(e.target.value))}
                      className="w-full accent-green-600" />
                  </div>
                ))}
              </div>

              {/* Activity */}
              <div className="mb-4">
                <p className="label">Activity Level</p>
                <div className="space-y-1.5">
                  {ACTIVITY_OPTS.map(a => (
                    <button key={a.key} onClick={() => setF('activity_level', a.key)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm
                                  border transition-all ${
                        form.activity_level === a.key
                          ? 'border-[#2D7A4F] bg-green-50 dark:bg-green-900/20'
                          : 'border-slate-200 dark:border-[#143D22] hover:border-[#86efac]'
                      }`}>
                      <span className={form.activity_level === a.key ? 'text-[#1B5E38] dark:text-[#4DB87A] font-medium' : 'text-slate-600 dark:text-[#56A870]'}>
                        {a.ar} — {a.en}
                      </span>
                      <span className="text-xs text-slate-400">{a.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Goal */}
              <div className="mb-5">
                <p className="label">Goal</p>
                <div className="grid grid-cols-2 gap-2">
                  {GOAL_OPTS.map(g => (
                    <button key={g.key} onClick={() => setF('goal', g.key)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm
                                  border-2 transition-all ${
                        form.goal === g.key
                          ? 'border-[#2D7A4F] bg-green-50 dark:bg-green-900/20'
                          : 'border-slate-200 dark:border-[#143D22] hover:border-[#86efac]'
                      }`}>
                      <span className="text-lg">{g.emoji}</span>
                      <div className="text-left">
                        <p className={`text-xs font-semibold ${form.goal === g.key ? 'text-[#1B5E38] dark:text-[#4DB87A]' : 'text-slate-600 dark:text-[#56A870]'}`}>{g.ar}</p>
                        <p className="text-[10px] text-slate-400">{g.en}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <Button variant="primary" className="w-full" onClick={runManual}
                loading={loading} icon={<Calculator className="w-4 h-4" />}>
                Calculate My Macros
              </Button>
            </Card>
          )}
        </div>

        {/* ── Right: Results ───────────────────────────────────────────────── */}
        <div className="space-y-4">
          {error && <Alert type="error" message={error} />}

          {!macros && !loading && (
            <Card className="py-16 text-center">
              <div className="p-4 rounded-2xl bg-[var(--primary-lt)] dark:bg-[#134d26]/60 w-fit mx-auto mb-4">
                <Target className="w-8 h-8 text-slate-300 dark:text-white0" />
              </div>
              <p className="font-semibold text-slate-500 dark:text-[#56A870] mb-1">
                Your targets will appear here
              </p>
              <p className="text-xs text-slate-400">
                {mode === 'nlp' ? 'Write your profile in Arabic or English' : 'Fill in your details and click Calculate'}
              </p>
            </Card>
          )}

          {loading && (
            <Card className="py-12 flex flex-col items-center gap-3">
              <Spinner size="lg" />
              <p className="text-sm text-slate-500 dark:text-[#56A870]">
                {mode === 'nlp' ? '🧠 MiniLM is analyzing your text...' : '⚡ Calculating macros...'}
              </p>
            </Card>
          )}

          {macros && (
            <>
              {/* BMR / TDEE card */}
              <Card>
                <h3 className="font-semibold text-slate-800 dark:text-white mb-3">
                  📊 Calculation Breakdown
                </h3>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'BMR',        value: macros.bmr?.toFixed(0),  unit: 'kcal', tip: 'Mifflin-St Jeor' },
                    { label: 'TDEE',       value: macros.tdee?.toFixed(0), unit: 'kcal', tip: `×${macros.activity_multiplier}` },
                    { label: 'Target',     value: macros.calories?.toFixed(0), unit: 'kcal',
                      tip: macros.deficit_surplus > 0 ? `+${macros.deficit_surplus}` : `${macros.deficit_surplus}` },
                  ].map(item => (
                    <div key={item.label} className="text-center p-3 rounded-xl bg-slate-50 dark:bg-[#134d26]/40">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
                      <p className="text-lg font-bold font-mono text-slate-800 dark:text-white">
                        {item.value}
                      </p>
                      <p className="text-[10px] text-slate-400">{item.unit}</p>
                      <p className="text-[9px] text-[#2D7A4F] dark:text-[#4DB87A] mt-0.5">{item.tip}</p>
                    </div>
                  ))}
                </div>

                {macros.bmi && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl
                                  bg-slate-50 dark:bg-[#134d26]/40 text-sm mb-4">
                    <span className="text-slate-600 dark:text-[#56A870]">BMI</span>
                    <span className="font-mono font-semibold text-slate-700 dark:text-green-100">
                      {macros.bmi} — <span className="text-[#2D7A4F] dark:text-[#4DB87A] font-normal text-xs">{macros.bmi_category}</span>
                    </span>
                  </div>
                )}

                <MacroSummary macros={macros} />
              </Card>

              {/* Daily breakdown */}
              <Card>
                <h3 className="font-semibold text-slate-800 dark:text-white mb-3">
                  🎯 Daily Targets
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Calories',  value: macros.calories?.toFixed(0),  unit: 'kcal', color: 'text-[#2D7A4F] dark:text-[#4DB87A]' },
                    { label: 'Protein',   value: macros.protein_g?.toFixed(0), unit: 'g',    color: 'text-blue-500' },
                    { label: 'Carbs',     value: macros.carbs_g?.toFixed(0),   unit: 'g',    color: 'text-emerald-500' },
                    { label: 'Fats',      value: macros.fats_g?.toFixed(0),    unit: 'g',    color: 'text-violet-500' },
                    { label: 'Fiber',     value: macros.fiber_g?.toFixed(0),   unit: 'g',    color: 'text-teal-500' },
                    { label: 'Budget',    value: macros.budget_egp?.toFixed(0),unit: 'EGP',  color: 'text-sand-500' },
                  ].map(item => (
                    <div key={item.label}
                      className="flex items-center justify-between px-3 py-2 rounded-xl
                                 bg-slate-50 dark:bg-[#134d26]/40">
                      <span className="text-xs text-slate-500 dark:text-[#56A870]">{item.label}</span>
                      <span className={`text-sm font-bold font-mono ${item.color}`}>
                        {item.value} <span className="text-[10px] font-normal text-slate-400">{item.unit}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Weekly summary */}
              <Card className="border-green-200 dark:border-green-800/40 bg-green-50/30 dark:bg-green-900/10">
                <p className="text-xs font-semibold text-[#2D7A4F] dark:text-[#4DB87A] uppercase tracking-wider mb-2">
                  📅 Weekly (×7)
                </p>
                <div className="flex gap-4 text-sm">
                  <div><span className="text-slate-500">Calories:</span> <strong className="font-mono text-[#2D7A4F] dark:text-[#4DB87A]">{macros.weekly_calories?.toLocaleString()} kcal</strong></div>
                  <div><span className="text-slate-500">Protein:</span> <strong className="font-mono text-blue-500">{macros.weekly_protein_g?.toFixed(0)}g</strong></div>
                  <div><span className="text-slate-500">Budget:</span> <strong className="font-mono text-[#2D7A4F] dark:text-[#4DB87A]">{macros.weekly_budget_egp?.toFixed(0)} EGP</strong></div>
                </div>
              </Card>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button variant="primary" onClick={handleOptimize}
                  icon={<Zap className="w-4 h-4" />}>
                  Optimize Meals →
                </Button>
                <Button variant="outline" onClick={handleSave} loading={loading}>
                  {saved ? '✅ Saved!' : '💾 Save to Profile'}
                </Button>
              </div>
              {saved && (
                <Alert type="success" message="✅ Targets saved! Redirecting to optimizer..." />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
