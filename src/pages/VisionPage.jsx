import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, Zap, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, RotateCcw, BookmarkPlus } from 'lucide-react'
import { visionAPI, optimizerAPI } from '../services/api'
import { MacroBar, Badge, Spinner, SectionHeader } from '../components/UI'
import { useAuthStore } from '../store/authStore'

// ── Helpers ───────────────────────────────────────────────────────────────────
const pct = (v, max) => Math.min(100, Math.round((v / max) * 100))

function ConfidenceBar({ confidence, label }) {
  const c = confidence * 100
  const color = c >= 75 ? '#4DB87A' : c >= 45 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-28 truncate" style={{color:'var(--text-muted)'}}>{label}</span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{background:'var(--border)'}}>
        <div className="h-full rounded-full transition-all" style={{width:`${c}%`, background:color}}/>
      </div>
      <span className="text-xs font-bold w-10 text-right" style={{color}}>{c.toFixed(0)}%</span>
    </div>
  )
}

function WarningBadge({ warning }) {
  const bg    = warning.level === 'danger' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)'
  const color = warning.level === 'danger' ? '#ef4444' : '#f59e0b'
  const border= warning.level === 'danger' ? '#ef444440' : '#f59e0b40'
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
         style={{background:bg, border:`1px solid ${border}`, color}}>
      <AlertTriangle className="w-3.5 h-3.5 shrink-0"/>
      {warning.label}
    </div>
  )
}

function MacroFitGauge({ score }) {
  const color = score >= 70 ? '#4DB87A' : score >= 45 ? '#f59e0b' : '#ef4444'
  const r = 28, circ = 2 * Math.PI * r, dash = (score / 100) * circ
  const label = score >= 70 ? 'مناسب' : score >= 45 ? 'متوسط' : 'ضعيف'
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-16 h-16 shrink-0">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} fill="none" stroke="var(--border)" strokeWidth="6"/>
          <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{transition:'stroke-dasharray 0.8s ease'}}/>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-black" style={{color:'var(--text)'}}>{score.toFixed(0)}</span>
          <span className="text-[8px]" style={{color:'var(--text-muted)'}}>/ 100</span>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold" style={{color}}>Macro Fit: {label}</p>
        <p className="text-xs" style={{color:'var(--text-muted)'}}>مدى توافق الوجبة مع أهدافك</p>
      </div>
    </div>
  )
}

// ── Dynamic macro fit ─────────────────────────────────────────────────────────
function calcMacroFit(scaled, user) {
  if (!scaled || !user) return null
  const daily_cal  = parseFloat(user.daily_calories   || 2000)
  const daily_prot = parseFloat(user.daily_protein_g  || 80)
  const daily_carb = parseFloat(user.daily_carbs_g    || 300)
  const daily_fat  = parseFloat(user.daily_fats_g     || 80)
  const daily_bdg  = parseFloat(user.daily_budget_egp || 150)
  const cal_pct  = daily_cal  > 0 ? parseFloat(((scaled.cal  / daily_cal)  * 100).toFixed(1)) : 0
  const prot_pct = daily_prot > 0 ? parseFloat(((scaled.prot / daily_prot) * 100).toFixed(1)) : 0
  const carb_pct = daily_carb > 0 ? parseFloat(((scaled.carb / daily_carb) * 100).toFixed(1)) : 0
  const fat_pct  = daily_fat  > 0 ? parseFloat(((scaled.fat  / daily_fat)  * 100).toFixed(1)) : 0
  const bdg_pct  = daily_bdg  > 0 ? parseFloat(((scaled.cost / daily_bdg)  * 100).toFixed(1)) : 0
  const gauss = (p, ideal=33, sigma=20) =>
    parseFloat((100 * Math.exp(-((p - ideal) ** 2) / (2 * sigma ** 2))).toFixed(1))
  const overall = parseFloat((
    gauss(cal_pct)*0.35 + gauss(prot_pct)*0.40 + gauss(carb_pct)*0.15 + gauss(fat_pct)*0.10
  ).toFixed(1))
  const warnings = []
  const warnLevel = p => p >= 80 ? 'danger' : p >= 60 ? 'warning' : 'ok'
  for (const [type, p, labelText] of [
    ['calories', cal_pct, `هتستهلك ${cal_pct.toFixed(0)}% من سعراتك اليومية`],
    ['fats',     fat_pct, `هتستهلك ${fat_pct.toFixed(0)}% من الدهون اليومية`],
    ['carbs',    carb_pct,`هتستهلك ${carb_pct.toFixed(0)}% من الكارب اليومي`],
    ['budget',   bdg_pct, `هتستهلك ${bdg_pct.toFixed(0)}% من ميزانيتك اليومية`],
  ]) {
    const lvl = warnLevel(p)
    if (lvl !== 'ok') warnings.push({ type, pct: p, label: labelText, level: lvl })
  }
  return { overall_score: overall, calorie_pct: cal_pct, protein_pct: prot_pct,
           carbs_pct: carb_pct, fats_pct: fat_pct, budget_pct: bdg_pct, warnings }
}

// ── Meal type options ─────────────────────────────────────────────────────────
const MEAL_TYPES = [
  { v: 'فطار',  label: 'فطار'  },
  { v: 'غداء',  label: 'غداء'  },
  { v: 'عشاء',  label: 'عشاء'  },
  { v: 'سناك',  label: 'سناك'  },
]

// ── Main Page ─────────────────────────────────────────────────────────────────

// ── Active Learning Stats Widget ─────────────────────────────────────────────
function ALStatsWidget() {
  const [stats,   setStats]   = useState(null)
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)

  const load = () => {
    if (stats) { setOpen(o => !o); return }
    setLoading(true)
    fetch('/api/v1/vision/corrections/stats', {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
    })
      .then(r => r.json())
      .then(d => { setStats(d); setOpen(true) })
      .finally(() => setLoading(false))
  }

  return (
    <div className="card" style={{borderColor:'var(--border)'}}>
      <button onClick={load}
        className="w-full flex items-center justify-between text-sm font-semibold"
        style={{color:'var(--primary)'}}>
        <span>🧠 Active Learning — تحسين الموديل</span>
        <span className="text-xs font-normal" style={{color:'var(--text-muted)'}}>
          {loading ? '⏳' : open ? '▲' : '▼'}
        </span>
      </button>

      {open && stats && (
        <div className="mt-3 space-y-3">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'إجمالي التصحيحات', value: stats.total_corrections, color: '#2D7A4F' },
              { label: 'تصحيحاتك', value: stats.user_corrections, color: '#3b82f6' },
            ].map(s => (
              <div key={s.label} className="p-2.5 rounded-xl text-center"
                   style={{background: s.color+'15'}}>
                <p className="text-xl font-bold font-mono" style={{color: s.color}}>{s.value}</p>
                <p className="text-[10px] mt-0.5" style={{color:'var(--text-muted)'}}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 p-2 rounded-xl"
               style={{background: stats.learning_status==='active' ? '#2D7A4F15' : '#f9741615'}}>
            <span className="text-sm">{stats.learning_status === 'active' ? '✅' : '🔄'}</span>
            <p className="text-xs" style={{color:'var(--text-muted)'}}>
              {stats.learning_status === 'active'
                ? `النظام يتعلم — ${stats.boosted_classes?.length || 0} class(es) تم تحسينها تلقائياً`
                : 'جاري جمع البيانات لبدء التحسين التلقائي'}
            </p>
          </div>

          {/* Top corrections */}
          {stats.top_corrections?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                 style={{color:'var(--text-muted)'}}>أكثر التصحيحات</p>
              <div className="space-y-1">
                {stats.top_corrections.slice(0, 5).map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span style={{color:'var(--text-muted)'}}>
                      <span style={{color:'#ef4444'}}>{c.from}</span>
                      {' → '}
                      <span style={{color:'#2D7A4F'}}>{c.to}</span>
                    </span>
                    <span className="font-mono font-bold" style={{color:'var(--primary)'}}>
                      ×{c.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Boosted classes */}
          {stats.boosted_classes?.length > 0 && (
            <div className="p-2 rounded-xl"
                 style={{background:'#2D7A4F10', border:'1px solid #2D7A4F30'}}>
              <p className="text-[10px] font-semibold mb-1" style={{color:'#2D7A4F'}}>
                🚀 تحسين تلقائي مفعّل
              </p>
              {stats.boosted_classes.map((b, i) => (
                <p key={i} className="text-[10px]" style={{color:'var(--text-muted)'}}>
                  {b.from} → {b.to} ({b.count} corrections)
                </p>
              ))}
            </div>
          )}

          <p className="text-[9px] text-center" style={{color:'var(--text-muted)'}}>
            {stats.model_version} · التصحيحات تُستخدم لتحسين دقة الـ YOLOv8
          </p>
        </div>
      )}
    </div>
  )
}

export default function VisionPage() {
  const { user } = useAuthStore()

  const [file,       setFile]       = useState(null)
  const [preview,    setPreview]    = useState(null)
  const [result,     setResult]     = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [showIngr,   setShowIngr]   = useState(false)
  const [portion,    setPortion]    = useState(1)
  const [correcting, setCorrecting] = useState(false)
  const [corrected,    setCorrected]    = useState(false)
  const [showCorrect,  setShowCorrect]  = useState(false)  // show correction input
  const [correctInput, setCorrectInput] = useState('')     // user typed correction

  // ── Add to Log state ──────────────────────────────────────────────────────
  const [logging,    setLogging]    = useState(false)
  const [logged,      setLogged]      = useState(false)
  const [logError,    setLogError]    = useState(null)
  const [dbCost,      setDbCost]      = useState(null)
  const [costLoading, setCostLoading] = useState(false)
  const [mealType,   setMealType]   = useState('غداء')

  const imageRef = useRef(null)

  const onDrop = useCallback(accepted => {
    const f = accepted[0]
    if (!f) return
    setFile(f); setPreview(URL.createObjectURL(f))
    setResult(null); setError(null); setPortion(1)
    setCorrected(false); setLogged(false); setLogError(null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg','.jpeg','.png','.webp'] },
    maxFiles: 1,
  })

  const clearFile = e => {
    e.stopPropagation()
    setFile(null); setPreview(null); setResult(null); setError(null)
    setLogged(false); setLogError(null)
  }

  const analyze = async () => {
    if (!file) return
    setLoading(true); setError(null); setLogged(false)
    try {
      const { data } = await visionAPI.analyze(file)
      setResult(data); setShowIngr(false); setPortion(1); setDbCost(null)
      setShowCorrect(false); setCorrectInput('')
      // Save to analyzed meals history in localStorage
      try {
        const prev = JSON.parse(localStorage.getItem('analyzed_meals') || '[]')
        const entry = {
          id:          Date.now(),
          meal_name:   data.meal_name,
          confidence:  data.confidence,
          calories:    data.estimated_macros?.calories || 0,
          protein_g:   data.estimated_macros?.protein_g || 0,
          carbs_g:     data.estimated_macros?.carbs_g || 0,
          fats_g:      data.estimated_macros?.fats_g || 0,
          cost_egp:    data.estimated_cost_egp || 0,
          analyzed_at: new Date().toISOString(),
        }
        localStorage.setItem('analyzed_meals', JSON.stringify([entry, ...prev].slice(0, 50)))
        window.dispatchEvent(new CustomEvent('analyzed-meals-updated'))
      } catch {}

      // Fetch accurate cost from DB using meal_search
      if (data?.meal_name) {
        setCostLoading(true)
        try {
          const token = localStorage.getItem('access_token')
          const res = await fetch('/api/v1/optimize/meal-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json',
                       Authorization: `Bearer ${token}` },
            body: JSON.stringify({ query: data.meal_name, top_k: 1 }),
          })
          if (res.ok) {
            const searchData = await res.json()
            const firstMatch = searchData?.results?.[0] || searchData?.[0]
            if (firstMatch?.total_cost_egp) {
              setDbCost(parseFloat(firstMatch.total_cost_egp.toFixed(1)))
            }
          }
        } catch {}
        setCostLoading(false)
      }
    } catch (e) {
      setError(e.response?.data?.detail || 'فشل التحليل. جرب تاني.')
    } finally { setLoading(false) }
  }

  // ── Active Learning correction ────────────────────────────────────────────
  const sendCorrection = async (correctClass) => {
    if (!result || !file) return
    setCorrecting(true)
    try {
      // Await FileReader properly (old code had async bug)
      const b64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload  = () => resolve(reader.result.split(',')[1].substring(0, 500))
        reader.onerror = () => reject(new Error('FileReader failed'))
        reader.readAsDataURL(file)
      })

      // Use English class_name from top3[0] so boost query matches YOLO output
      // (result.meal_name is Arabic — won't match DB queries)
      const predictedEnglish = result.top3?.[0]?.class_name || result.meal_name

      await visionAPI.correct({
        predicted_class: predictedEnglish,   // ← English: "pizza" ✅ matches YOLO
        correct_class:   correctClass,        // ← English: "shawarma" ✅
        confidence:      result.confidence,
        image_base64:    b64,
      })
      setCorrected(true)
    } catch(e) {
      console.warn('Correction failed:', e?.message)
      // Still mark as corrected visually — backend correction is non-critical
      setCorrected(true)
    } finally {
      setCorrecting(false)
    }
  }

  // ── Add to Today's Log + History ─────────────────────────────────────────
  const addToLog = async () => {
    if (!result) return
    setLogging(true); setLogError(null)
    try {
      const mealData = {
        recipe_name: result.meal_name,
        meal_type:   mealType,
        calories:    Math.round(scaled?.cal  || 0),
        protein_g:   parseFloat((scaled?.prot || 0).toFixed(1)),
        carbs_g:     parseFloat((scaled?.carb || 0).toFixed(1)),
        fats_g:      parseFloat((scaled?.fat  || 0).toFixed(1)),
        cost_egp:    parseFloat((scaled?.cost || 0).toFixed(2)),
      }

      // 1. Save to meal_plans FIRST → get plan_id for linking
      const authH = { 'Content-Type':'application/json',
        Authorization:`Bearer ${localStorage.getItem('access_token')}` }
      let planId = null
      try {
        const planRes = await fetch('/api/v1/optimize/add-meal', {
          method: 'POST', headers: authH,
          body: JSON.stringify(mealData),
        }).then(r => r.ok ? r.json() : null)
        planId = planRes?.plan_id || null
      } catch {}

      // 2. Log to meal_logs WITH plan_id → delete from History also clears Daily Goals
      await optimizerAPI.logMeal({
        ...mealData,
        source:  'vision',
        plan_id: planId,   // ← link so delete cleans up both tables
      })

      setLogged(true)
    } catch (e) {
      setLogError(e.response?.data?.detail || 'فشل الحفظ. جرب تاني.')
    } finally { setLogging(false) }
  }

  // ── Scaled macros ─────────────────────────────────────────────────────────
  const scaled = result ? {
    cal:  (result.estimated_macros?.calories  || 0) * portion,
    prot: (result.estimated_macros?.protein_g || 0) * portion,
    carb: (result.estimated_macros?.carbs_g   || 0) * portion,
    fat:  (result.estimated_macros?.fats_g    || 0) * portion,
    cost: (result.estimated_cost_egp || 0) * portion,
  } : null

  const dynamicMacroFit = useMemo(
    () => calcMacroFit(scaled, user),
    [scaled?.cal, scaled?.prot, scaled?.carb, scaled?.fat, scaled?.cost]
  )

  const PORTIONS = [
    { v: 0.5, label: '½ حجم' },
    { v: 1,   label: 'عادي'  },
    { v: 1.5, label: 'كبير'  },
    { v: 2,   label: 'كبير جداً' },
  ]

  return (
    <div className="page-enter space-y-5 max-w-5xl">
      <SectionHeader
        title="Meal Analyzer"
        subtitle="YOLOv8 AI + Nutrition DB — identify food & estimate macros"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Left: Upload ── */}
        <div className="space-y-4">
          <div {...getRootProps()} className={`card relative cursor-pointer border-2 border-dashed transition-all
              ${isDragActive ? 'border-[var(--primary)] bg-[var(--primary-lt)]' : 'hover:border-[var(--primary)]'}`}
               style={{minHeight:240, display:'flex', alignItems:'center', justifyContent:'center'}}>
            <input {...getInputProps()}/>
            {preview ? (
              <>
                <img src={preview} ref={imageRef} alt="food"
                  className="w-full h-60 object-cover rounded-xl"/>
                <button onClick={clearFile}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/80">
                  <X className="w-4 h-4 text-white"/>
                </button>
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg text-[10px] font-medium"
                     style={{background:'rgba(0,0,0,.6)', color:'#fff'}}>
                  {file?.name} · {(file?.size/1024).toFixed(0)} KB
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Upload className="w-10 h-10 mx-auto mb-3" style={{color:'var(--text-muted)'}}/>
                <p className="text-sm font-medium" style={{color:'var(--text)'}}>
                  {isDragActive ? 'ارمي الصورة هنا' : 'ارفع صورة أكلتك'}
                </p>
                <p className="text-xs mt-1" style={{color:'var(--text-muted)'}}>
                  JPEG, PNG, WebP — max 10MB
                </p>
              </div>
            )}
          </div>

          <button onClick={analyze} disabled={!file || loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            style={{opacity: (!file || loading) ? 0.5 : 1}}>
            {loading ? <Spinner size="sm"/> : <Zap className="w-5 h-5"/>}
            {loading ? 'جاري التحليل...' : 'تحليل الوجبة'}
          </button>

          {error && (
            <div className="card border-red-500/30 bg-red-50/10 text-red-400 text-sm p-3 rounded-xl">
              ❌ {error}
            </div>
          )}

          {!result && !loading && (
            <div className="card">
              <p className="text-xs font-semibold uppercase tracking-wide mb-3"
                 style={{color:'var(--text-muted)'}}>HOW IT WORKS</p>
              <ol className="space-y-2">
                {[
                  'YOLOv8 deep learning model identifies the food in your photo',
                  'Labels matched to our Egyptian recipes database',
                  'Macros calculated from ingredients & nutrition facts',
                  'Personalized advice based on your health goal',
                ].map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                          style={{background:'var(--primary-lt)', color:'var(--primary)'}}>{i+1}</span>
                    <span className="text-xs" style={{color:'var(--text-muted)'}}>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* ── Right: Results ── */}
        {!result && !loading && (
          <div className="card flex items-center justify-center" style={{minHeight:300}}>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
                   style={{background:'var(--primary-lt)'}}>
                <Upload className="w-7 h-7" style={{color:'var(--primary)'}}/>
              </div>
              <p className="font-semibold text-sm" style={{color:'var(--text)'}}>Results will appear here</p>
              <p className="text-xs mt-1" style={{color:'var(--text-muted)'}}>Upload and analyze a meal photo</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="card flex items-center justify-center" style={{minHeight:300}}>
            <div className="text-center">
              <Spinner size="lg"/>
              <p className="text-sm mt-3" style={{color:'var(--text-muted)'}}>Analyzing meal...</p>
            </div>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-3">

            {/* ── Meal name + confidence ── */}
            <div className="card">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-xl font-black" style={{color:'var(--text)'}}>{result.meal_name}</h2>
                  <p className="text-xs mt-0.5" style={{color:'var(--text-muted)'}}>{result.analysis_notes}</p>
                </div>
                <span className="text-sm font-bold px-3 py-1.5 rounded-xl shrink-0"
                      style={{
                        background: result.confidence >= 0.75 ? 'rgba(77,184,122,0.15)' : 'rgba(245,158,11,0.15)',
                        color:      result.confidence >= 0.75 ? '#4DB87A' : '#f59e0b',
                      }}>
                  {(result.confidence * 100).toFixed(0)}% confident
                </span>
              </div>
              {result.top3?.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t" style={{borderColor:'var(--border)'}}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-2"
                     style={{color:'var(--text-muted)'}}>Top predictions</p>
                  {result.top3.map((p, i) => (
                    <ConfidenceBar key={i}
                      label={`${i+1}. ${p.class_name_ar || p.class_name}`}
                      confidence={p.confidence}/>
                  ))}
                </div>
              )}
            </div>

            {/* ── Low confidence warning ── */}
            {result.confidence < 0.70 && (
              <div className="flex items-center gap-3 p-3 rounded-2xl"
                   style={{background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)'}}>
                <AlertTriangle className="w-5 h-5 shrink-0" style={{color:'#f59e0b'}}/>
                <div>
                  <p className="text-sm font-semibold" style={{color:'#f59e0b'}}>
                    النتيجة مش متأكدة ({(result.confidence * 100).toFixed(0)}%)
                  </p>
                  <p className="text-xs mt-0.5" style={{color:'var(--text-muted)'}}>
                    تأكد يدوياً من نوع الوجبة — الـ AI مش واثق من التحليل ده
                  </p>
                </div>
              </div>
            )}

            {/* ── Personalization advice ── */}
            {result.personalization && (
              <div className="card"
                   style={{
                     borderColor: result.personalization.verdict === 'good' ? '#4DB87A33'
                                : result.personalization.verdict === 'bad'  ? '#ef444433' : '#f59e0b33',
                     background:  result.personalization.verdict === 'good' ? 'rgba(77,184,122,0.06)'
                                : result.personalization.verdict === 'bad'  ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
                   }}>
                <p className="text-sm font-semibold" style={{color:'var(--text)'}}>
                  {result.personalization.message}
                </p>
                {result.personalization.suggestion && (
                  <p className="text-xs mt-1" style={{color:'var(--text-muted)'}}>
                    💡 {result.personalization.suggestion}
                  </p>
                )}
                {user?.goal && (
                  <p className="text-[10px] mt-1.5 font-medium" style={{color:'var(--primary)'}}>
                    بناءً على هدفك: {user.goal.replace('_', ' ')}
                  </p>
                )}
              </div>
            )}

            {/* ── Warnings (dynamic) ── */}
            {dynamicMacroFit?.warnings?.length > 0 && (
              <div className="space-y-2">
                {dynamicMacroFit.warnings.map((w, i) => <WarningBadge key={i} warning={w}/>)}
              </div>
            )}

            {/* ── Macro Fit (dynamic) ── */}
            {dynamicMacroFit && (
              <div className="card">
                <MacroFitGauge score={dynamicMacroFit.overall_score}/>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {[
                    {label:'Calories', pct: dynamicMacroFit.calorie_pct},
                    {label:'Protein',  pct: dynamicMacroFit.protein_pct},
                    {label:'Carbs',    pct: dynamicMacroFit.carbs_pct},
                    {label:'Budget',   pct: dynamicMacroFit.budget_pct},
                  ].map(({label, pct}) => {
                    const color = pct >= 80 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#4DB87A'
                    return (
                      <div key={label} className="text-center p-2 rounded-xl"
                           style={{background:'var(--primary-lt)'}}>
                        <p className="text-xs font-bold" style={{color}}>{pct?.toFixed(0)}%</p>
                        <p className="text-[9px]" style={{color:'var(--text-muted)'}}>{label}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Portion Sizing ── */}
            <div className="card">
              <p className="text-xs font-semibold uppercase tracking-wide mb-2"
                 style={{color:'var(--text-muted)'}}>Portion Size</p>
              <div className="flex gap-2 mb-3">
                {PORTIONS.map(({v, label}) => (
                  <button key={v} onClick={() => setPortion(v)}
                    className="flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all"
                    style={portion === v
                      ? {background:'var(--primary)', color:'#fff'}
                      : {background:'var(--primary-lt)', color:'var(--text-muted)'}}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  {label:'Cal',     val:scaled?.cal,  unit:'kcal', color:'#f97316'},
                  {label:'Protein', val:scaled?.prot, unit:'g',    color:'#3b82f6'},
                  {label:'Carbs',   val:scaled?.carb, unit:'g',    color:'#f59e0b'},
                  {label:'Fats',    val:scaled?.fat,  unit:'g',    color:'#a855f7'},
                ].map(({label, val, unit, color}) => (
                  <div key={label} className="text-center p-2 rounded-xl"
                       style={{background:'var(--primary-lt)'}}>
                    <p className="text-sm font-bold" style={{color}}>
                      {val?.toFixed(0)}<span className="text-[9px] font-normal ml-0.5">{unit}</span>
                    </p>
                    <p className="text-[9px]" style={{color:'var(--text-muted)'}}>{label}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-3 pt-2 border-t"
                   style={{borderColor:'var(--border)'}}>
                <div>
                  <span className="text-xs" style={{color:'var(--text-muted)'}}>
                    {dbCost ? 'Market Price (DB)' : 'Estimated Cost'}
                  </span>
                  {costLoading && (
                    <span className="text-[10px] ml-2" style={{color:'var(--text-muted)'}}>جاري البحث...</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-lg font-black" style={{color:'var(--primary)'}}>
                    {dbCost
                      ? (dbCost * portion).toFixed(1)
                      : scaled?.cost?.toFixed(1)
                    } EGP
                    {portion !== 1 && (
                      <span className="text-xs font-normal ml-1" style={{color:'var(--text-muted)'}}>
                        (×{portion})
                      </span>
                    )}
                  </span>
                  {dbCost && (
                    <p className="text-[10px]" style={{color:'var(--primary)'}}>
                      ✓ من قاعدة البيانات
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Add to Today's Log ── */}
            <div className="card" style={{borderColor:'var(--border)'}}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2"
                 style={{color:'var(--text-muted)'}}>إضافة لسجل اليوم</p>

              {/* Meal type selector */}
              <div className="flex gap-2 mb-3">
                {MEAL_TYPES.map(({v, label}) => (
                  <button key={v} onClick={() => setMealType(v)}
                    className="flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all"
                    style={mealType === v
                      ? {background:'var(--primary)', color:'#fff'}
                      : {background:'var(--primary-lt)', color:'var(--text-muted)'}}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Log button */}
              {!logged ? (
                <button
                  onClick={addToLog}
                  disabled={logging}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: logging ? 'var(--primary-lt)' : 'var(--primary)',
                    color: logging ? 'var(--text-muted)' : '#fff',
                    opacity: logging ? 0.7 : 1,
                  }}>
                  {logging
                    ? <><Spinner size="sm"/> جاري الحفظ...</>
                    : <><BookmarkPlus className="w-4 h-4"/> أضف {result.meal_name} كـ {mealType}</>
                  }
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                     style={{background:'rgba(77,184,122,0.10)', color:'#4DB87A'}}>
                  <CheckCircle2 className="w-4 h-4"/>
                  اتحفظت في سجل اليوم ✅
                </div>
              )}

              {logError && (
                <p className="text-xs mt-2 text-center" style={{color:'#ef4444'}}>{logError}</p>
              )}
            </div>

            {/* ── Ingredients (collapsible) ── */}
            {result.ingredients?.length > 0 && (
              <div className="card">
                <button onClick={() => setShowIngr(s => !s)}
                  className="flex items-center justify-between w-full">
                  <span className="text-sm font-semibold" style={{color:'var(--text)'}}>
                    Detected Ingredients ({result.ingredients.length})
                  </span>
                  {showIngr
                    ? <ChevronUp   className="w-4 h-4" style={{color:'var(--text-muted)'}}/>
                    : <ChevronDown className="w-4 h-4" style={{color:'var(--text-muted)'}}/>}
                </button>
                {showIngr && (
                  <div className="mt-3 space-y-2">
                    {result.ingredients.map((ing, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-xl"
                           style={{background:'var(--primary-lt)'}}>
                        <div>
                          <p className="text-xs font-semibold" style={{color:'var(--text)'}}>{ing.name}</p>
                          <p className="text-[10px]" style={{color:'var(--text-muted)'}}>
                            {(ing.quantity_g * portion).toFixed(0)}g · {(ing.calories * portion).toFixed(0)} kcal
                          </p>
                        </div>
                        <span className="text-xs font-bold" style={{color:'#3b82f6'}}>
                          {(ing.protein_g * portion).toFixed(1)}g prot
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Active Learning — New UX ── */}
            {!corrected && (
              <div className="card" style={{borderColor:'var(--border)'}}>
                {!showCorrect ? (
                  /* Step 1: Is the result correct? */
                  <div>
                    <p className="text-sm font-semibold mb-3 flex items-center gap-2"
                       style={{color:'var(--text)'}}>
                      <span>🧠</span>
                      النتيجة صح؟
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setCorrected(true) }}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                        style={{background:'rgba(77,184,122,0.12)', color:'#4DB87A',
                                border:'1px solid rgba(77,184,122,0.25)'}}>
                        <CheckCircle2 className="w-4 h-4"/> آه، صح
                      </button>
                      <button
                        onClick={() => setShowCorrect(true)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                        style={{background:'rgba(239,68,68,0.08)', color:'#ef4444',
                                border:'1px solid rgba(239,68,68,0.2)'}}>
                        <AlertTriangle className="w-4 h-4"/> لأ، ده...
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Step 2: What is the correct meal? */
                  <div>
                    <p className="text-sm font-semibold mb-3 flex items-center gap-2"
                       style={{color:'var(--text)'}}>
                      <RotateCcw className="w-4 h-4" style={{color:'var(--primary)'}}/>
                      إيه الوجبة الصح؟
                    </p>

                    {/* Quick suggestions from top3 */}
                    {result.top3?.length > 1 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {result.top3.slice(1).map((p, i) => (
                          <button key={i}
                            onClick={() => {
                              sendCorrection(p.class_name)
                            }}
                            disabled={correcting}
                            className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all"
                            style={{background:'var(--primary-lt)', color:'var(--primary)'}}>
                            {correcting ? '⏳' : (p.class_name_ar || p.class_name)}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Manual input */}
                    <div className="flex gap-2">
                      <input
                        className="input flex-1 text-sm"
                        placeholder="اكتب اسم الوجبة بالإنجليزي..."
                        value={correctInput}
                        onChange={e => setCorrectInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && correctInput.trim()) {
                            sendCorrection(correctInput.trim())
                          }
                        }}
                      />
                      <button
                        onClick={() => correctInput.trim() && sendCorrection(correctInput.trim())}
                        disabled={correcting || !correctInput.trim()}
                        className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                        style={{background:'var(--primary)'}}>
                        {correcting ? '⏳' : 'إرسال'}
                      </button>
                    </div>
                    <button onClick={() => setShowCorrect(false)}
                      className="text-xs mt-2" style={{color:'var(--text-muted)'}}>
                      ← رجوع
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Active Learning Stats — admin/debug only, hidden by default */}
            {false && <ALStatsWidget />}

            {corrected && (
              <div className="card flex items-center justify-between gap-2"
                   style={{color:'#4DB87A', background:'rgba(77,184,122,0.08)',
                           border:'1px solid #4DB87A33'}}>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4"/>
                  شكراً! هيساعد في تحسين الموديل.
                </div>
                <button onClick={clearFile}
                  className="text-xs px-3 py-1.5 rounded-xl font-semibold shrink-0"
                  style={{background:'var(--primary)', color:'#fff'}}>
                  تحليل صورة تانية
                </button>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}