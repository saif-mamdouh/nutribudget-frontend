import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import {
  Zap, Camera, Upload, Salad,
  Target, TrendingUp, Droplets,
} from 'lucide-react'
import { productAPI, matchAPI, optimizerAPI } from '../services/api'
import { Spinner } from '../components/UI'
import { useAuthStore } from '../store/authStore'

// ── Macro rings config ────────────────────────────────────────────────────────
const RINGS = [
  { key: 'cal',  label: 'Calories', unit: 'kcal', color: '#4DB87A' },
  { key: 'prot', label: 'Protein',  unit: 'g',    color: '#3b82f6' },
  { key: 'carb', label: 'Carbs',    unit: 'g',    color: '#f59e0b' },
  { key: 'fat',  label: 'Fats',     unit: 'g',    color: '#a855f7' },
]

// ── NutritionScore ────────────────────────────────────────────────────────────
function calcNutritionScore(user, totalPlans, streak) {
  const profile = [
    user?.full_name        ? 8 : 0,
    user?.daily_calories   ? 8 : 0,
    user?.daily_protein_g  ? 8 : 0,
    user?.daily_carbs_g    ? 5 : 0,
    user?.daily_fats_g     ? 5 : 0,
    user?.daily_budget_egp ? 6 : 0,
  ].reduce((a,b)=>a+b,0)
  const macros = [
    (user?.daily_protein_g  >= 50)                                     ? 10 : user?.daily_protein_g  > 0 ? 5 : 0,
    (user?.daily_calories   >= 1200 && user?.daily_calories   <= 3500) ? 10 : user?.daily_calories   > 0 ? 5 : 0,
    (user?.daily_fats_g     >  0   && user?.daily_fats_g     <= 120)   ?  8 : 0,
    (user?.daily_carbs_g    >  0   && user?.daily_carbs_g    <= 450)   ?  7 : 0,
  ].reduce((a,b)=>a+b,0)
  const engage = Math.min(20,(totalPlans||0)*2) + Math.min(5,streak||0)
  return {
    total:   Math.min(100, profile + macros + engage),
    profile: { score: profile, max: 40 },
    macros:  { score: macros,  max: 35 },
    engage:  { score: engage,  max: 25 },
  }
}

function NutritionScoreWidget({ user, totalPlans, streak }) {
  const s   = calcNutritionScore(user, totalPlans, streak)
  const sc  = s.total
  const col = sc >= 80 ? '#4DB87A' : sc >= 55 ? '#f97316' : '#ef4444'
  const r   = 40, circ = 2 * Math.PI * r, dash = (sc/100)*circ
  const label = sc >= 80 ? 'Excellent 🌟' : sc >= 60 ? 'Good 👍' : sc >= 40 ? 'Fair ⚡' : 'Needs Work 💪'
  const tip = s.profile.score < 30
    ? { icon:'👤', text:'Complete your profile to boost score', link:'/profile' }
    : s.macros.score < 25
    ? { icon:'🎯', text:'Set balanced macro targets in profile', link:'/profile' }
    : s.engage.score < 15
    ? { icon:'📅', text:'Generate more plans to boost engagement', link:'/optimize' }
    : { icon:'✅', text:'Great! Keep logging your meals daily', link:'/optimize' }
  const components = [
    { label:'Profile Completeness', score:s.profile.score, max:40, col:'#3b82f6' },
    { label:'Macro Quality',        score:s.macros.score,  max:35, col:'#f97316' },
    { label:'Engagement & Plans',   score:s.engage.score,  max:25, col:'#a855f7' },
  ]
  return (
    <div className="card">
      <div style={{display:'grid',gridTemplateColumns:'auto 1fr auto',gap:'1.5rem',alignItems:'center'}}>
        <div className="flex flex-col items-center" style={{minWidth:100}}>
          <div className="relative" style={{width:96,height:96}}>
            <svg style={{width:96,height:96,transform:'rotate(-90deg)'}} viewBox="0 0 96 96">
              <circle cx="48" cy="48" r={r} fill="none" stroke="var(--border)" strokeWidth="8"/>
              <circle cx="48" cy="48" r={r} fill="none" stroke={col} strokeWidth="8"
                strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                style={{transition:'stroke-dasharray 1.2s ease'}}/>
            </svg>
            <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',
                         alignItems:'center',justifyContent:'center'}}>
              <span style={{fontSize:22,fontWeight:900,color:'var(--text)',fontFamily:'monospace'}}>{sc}</span>
              <span style={{fontSize:9,color:'var(--text-muted)'}}>/ 100</span>
            </div>
          </div>
          <p style={{fontSize:11,fontWeight:700,color:col,marginTop:6}}>{label}</p>
          <p style={{fontSize:9,color:'var(--text-muted)'}}>Nutrition Score</p>
        </div>
        <div>
          <p style={{fontSize:12,fontWeight:600,color:'var(--text)',marginBottom:10}}>⭐ Score Breakdown</p>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {components.map(c=>(
              <div key={c.label}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                  <span style={{fontSize:11,color:'var(--text-muted)'}}>{c.label}</span>
                  <span style={{fontSize:11,fontWeight:700,color:c.col}}>{c.score}/{c.max} pts</span>
                </div>
                <div style={{height:5,borderRadius:3,background:'var(--border)',overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:3,background:c.col,
                               width:`${(c.score/c.max)*100}%`,transition:'width 1s ease'}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{minWidth:140}}>
          <Link to={tip.link}>
            <div style={{background:'var(--primary-lt)',borderRadius:14,padding:'12px 14px',cursor:'pointer'}}>
              <p style={{fontSize:20,marginBottom:6}}>{tip.icon}</p>
              <p style={{fontSize:11,color:'var(--text)',lineHeight:1.4}}>{tip.text}</p>
              <div style={{display:'flex',alignItems:'center',gap:4,marginTop:8}}>
                <span style={{fontSize:10,fontWeight:600,color:'var(--primary)'}}>Improve →</span>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Macro Ring (single) ───────────────────────────────────────────────────────
function MacroRing({ label, unit, color, value, target }) {
  const pct  = target > 0 ? Math.min(1, value / target) : 0
  const over = value > target && target > 0
  const r    = 26, circ = 2 * Math.PI * r
  const dash = pct * circ
  const displayColor = over ? '#f87171' : color

  return (
    <div className="card flex flex-col items-center py-4 gap-1">
      <div className="relative" style={{width:68,height:68}}>
        <svg style={{width:68,height:68,transform:'rotate(-90deg)'}} viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="var(--border)" strokeWidth="6"/>
          <circle cx="32" cy="32" r={r} fill="none" stroke={displayColor} strokeWidth="6"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{transition:'stroke-dasharray 0.8s ease'}}/>
        </svg>
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',
                     alignItems:'center',justifyContent:'center'}}>
          <span style={{fontSize:13,fontWeight:900,color: over ? '#f87171' : 'var(--text)',fontFamily:'monospace'}}>
            {Math.round(pct * 100)}%
          </span>
        </div>
      </div>
      <p style={{fontSize:13,fontWeight:700,color: over ? '#f87171' : 'var(--text)',fontFamily:'monospace'}}>
        {value > 0 ? value.toFixed(0) : '—'}
        <span style={{fontSize:9,fontWeight:400,color:'var(--text-muted)',marginLeft:2}}>{unit}</span>
      </p>
      <p style={{fontSize:10,color:'var(--text-muted)'}}>
        {label}
      </p>
      <p style={{fontSize:9,color:'var(--text-muted)'}}>
        / {target > 0 ? target.toFixed(0) : '?'} {unit}
      </p>
      {over && (
        <span style={{fontSize:9,color:'#f87171',fontWeight:600}}>⚠️ Over</span>
      )}
    </div>
  )
}

// ── Weekly Chart ──────────────────────────────────────────────────────────────
function WeeklyChart({ target }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const headers = { Authorization: `Bearer ${token}` }

    // Build last 7 days labels
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      days.push({
        date:  d.toISOString().slice(0, 10),
        label: d.toLocaleDateString('en-EG', { weekday: 'short' }),
      })
    }

    // Fetch meal_logs for past 7 days
    fetch('/api/v1/optimize/weekly-calories', { headers })
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .then(res => {
        if (res?.days) {
          // Backend returns [{date, calories}]
          const map = Object.fromEntries((res.days || []).map(d => [d.date, d.calories]))
          setData(days.map(d => ({
            label:    d.label,
            calories: map[d.date] || 0,
            target:   target,
          })))
        } else {
          // Fallback: empty data
          setData(days.map(d => ({ label: d.label, calories: 0, target })))
        }
        setLoading(false)
      })
  }, [target])

  if (loading) return (
    <div className="card flex items-center justify-center" style={{height:180}}>
      <Spinner size="sm"/>
    </div>
  )

  const maxVal = Math.max(...data.map(d => d.calories), target * 1.2)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm" style={{color:'var(--text)'}}>
          📈 Weekly Calories
        </h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full"
              style={{background:'var(--primary-lt)', color:'var(--primary)'}}>
          Target: {target?.toLocaleString()} kcal/day
        </span>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{top:5,right:5,bottom:0,left:-20}}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
          <XAxis dataKey="label" tick={{fontSize:10, fill:'var(--text-muted)'}} axisLine={false} tickLine={false}/>
          <YAxis tick={{fontSize:9, fill:'var(--text-muted)'}} axisLine={false} tickLine={false}
                 domain={[0, maxVal]} tickFormatter={v => v > 0 ? `${(v/1000).toFixed(1)}k` : '0'}/>
          <Tooltip
            formatter={(v) => [`${v?.toLocaleString()} kcal`, 'Calories']}
            contentStyle={{background:'var(--card)',border:'1px solid var(--border)',
                           borderRadius:10,fontSize:11}}/>
          <ReferenceLine y={target} stroke="#4DB87A" strokeDasharray="4 4" strokeWidth={1.5}
            label={{value:'Target', position:'insideTopRight', fontSize:9, fill:'#4DB87A'}}/>
          <Line type="monotone" dataKey="calories" stroke="#4DB87A" strokeWidth={2.5}
            dot={{fill:'#4DB87A', r:3, strokeWidth:0}}
            activeDot={{r:5, fill:'#4DB87A'}}/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Smart Tip ─────────────────────────────────────────────────────────────────
function SmartTip({ todayCal, todayProt, todayCarb, todayFat,
                    targetCal, targetProt, targetCarb, targetFat }) {

  const tip = (() => {
    const calPct  = targetCal  > 0 ? todayCal  / targetCal  : 0
    const protPct = targetProt > 0 ? todayProt / targetProt : 0
    const carbPct = targetCarb > 0 ? todayCarb / targetCarb : 0
    const fatPct  = targetFat  > 0 ? todayFat  / targetFat  : 0

    if (todayCal === 0)
      return { icon:'🍽️', color:'#4DB87A', msg:"ما سجلتش أكل لسه النهارده — ابدأ بـ Generate Plan أو Analyze Meal!" }
    if (protPct < 0.5)
      return { icon:'💪', color:'#3b82f6', msg:`بروتينك ناقص النهارده (${todayProt.toFixed(0)}g من ${targetProt}g) — جرب فراخ مشوية أو بيض في وجبتك الجاية.` }
    if (calPct > 1.1)
      return { icon:'⚠️', color:'#f87171', msg:`عدّيت الـ calories الهدف بـ ${(todayCal-targetCal).toFixed(0)} kcal — خفف في الوجبة الجاية.` }
    if (fatPct > 1.1)
      return { icon:'🧴', color:'#f59e0b', msg:`الدهون عالية شوية (${todayFat.toFixed(0)}g) — حاول تتجنب الأكل المقلي في العشا.` }
    if (carbPct < 0.4)
      return { icon:'⚡', color:'#f59e0b', msg:`الكارب ناقص — جرب كشري أو عيش أسمر في الغدا عشان طاقة أكتر.` }
    if (protPct >= 0.9 && calPct >= 0.8 && calPct <= 1.05)
      return { icon:'🌟', color:'#4DB87A', msg:`يوم ممتاز! ماكروزك متوازنة والـ calories في الهدف — كمّل كده!` }
    return { icon:'✅', color:'#4DB87A', msg:`أنت على الطريق الصح النهارده — فضلك كمّل وسجّل وجباتك.` }
  })()

  return (
    <div className="card" style={{borderColor: tip.color + '33', background: tip.color + '08'}}>
      <div className="flex items-start gap-3">
        <span style={{fontSize:24}}>{tip.icon}</span>
        <div>
          <p className="text-xs font-bold mb-0.5" style={{color: tip.color}}>Smart Tip</p>
          <p className="text-sm" style={{color:'var(--text)', lineHeight:1.5}}>{tip.msg}</p>
        </div>
      </div>
    </div>
  )
}

// ── Hydration ─────────────────────────────────────────────────────────────────
function Hydration() {
  const [cups, setCups] = useState(() => {
    try { return parseInt(sessionStorage.getItem('hydration') || '0') } catch { return 0 }
  })
  const add = () => {
    if (cups < 8) {
      const n = cups + 1
      setCups(n)
      try { sessionStorage.setItem('hydration', String(n)) } catch {}
    }
  }
  const reset = () => { setCups(0); try { sessionStorage.setItem('hydration','0') } catch {} }
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold" style={{color:'var(--text-muted)'}}>
          💧 Daily Hydration
        </p>
        <button onClick={reset} className="text-[10px]" style={{color:'var(--text-muted)'}}>reset</button>
      </div>
      <p className="text-xs mb-3" style={{color:'var(--text-muted)'}}>{cups} of 8 glasses today</p>
      <div className="flex gap-1 mb-3">
        {Array.from({length:8},(_,i)=>(
          <button key={i} onClick={add}
            className="flex-1 h-7 rounded-lg transition-all"
            style={{
              background: i < cups ? '#3b82f6' : 'var(--border)',
              transform:  i < cups ? 'scaleY(1.1)' : 'scaleY(1)',
            }}>
            {i < cups && <Droplets className="w-3 h-3 mx-auto text-white"/>}
          </button>
        ))}
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{background:'var(--border)'}}>
        <div className="h-full rounded-full transition-all"
             style={{width:`${(cups/8)*100}%`, background:'#3b82f6'}}/>
      </div>
      <p className="text-[10px] mt-1.5 text-center" style={{color:'var(--text-muted)'}}>
        {cups >= 8 ? '🎉 Goal reached!' : `${8-cups} more cups to go`}
      </p>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

// ── Presets for eat-out comparison ───────────────────────────────────────────
// سعر المقارنة الافتراضي لكل نوع وجبة
const MEAL_TYPE_DEFAULTS = {
  breakfast: { label: 'فطار',  icon: '🌅', presets: [
    { label: 'بسيط',  price: 30,  color: '#2D7A4F' },
    { label: 'متوسط', price: 60,  color: '#f97316' },
    { label: 'فاخر',  price: 120, color: '#a855f7' },
  ]},
  lunch: { label: 'غداء', icon: '☀️', presets: [
    { label: 'بسيط',  price: 60,  color: '#2D7A4F' },
    { label: 'متوسط', price: 120, color: '#f97316' },
    { label: 'فاخر',  price: 250, color: '#a855f7' },
  ]},
  dinner: { label: 'عشا',  icon: '🌙', presets: [
    { label: 'بسيط',  price: 50,  color: '#2D7A4F' },
    { label: 'متوسط', price: 100, color: '#f97316' },
    { label: 'فاخر',  price: 200, color: '#a855f7' },
  ]},
  snack: { label: 'سناك', icon: '🍎', presets: [
    { label: 'بسيط',  price: 20,  color: '#2D7A4F' },
    { label: 'متوسط', price: 40,  color: '#f97316' },
    { label: 'فاخر',  price: 80,  color: '#a855f7' },
  ]},
  default: { label: 'وجبة', icon: '🍽️', presets: [
    { label: 'بسيط',  price: 50,  color: '#2D7A4F' },
    { label: 'متوسط', price: 100, color: '#f97316' },
    { label: 'فاخر',  price: 200, color: '#a855f7' },
  ]},
}

function getMealTypeCfg(mealType) {
  const t = (mealType || '').toLowerCase()
  return MEAL_TYPE_DEFAULTS[t] || MEAL_TYPE_DEFAULTS.default
}

// ── MealPriceRow: سعر مقارنة مستقل لكل وجبة ─────────────────────────────────
function MealPriceRow({ meal, index }) {
  const cfg      = getMealTypeCfg(meal.meal_type)
  const storageKey = `eatOutPrice_${meal.meal_type || 'default'}_${index}`

  const [eatOutPrice, setEatOutPrice] = useState(() => {
    const saved = localStorage.getItem(`eatOutPrice_type_${meal.meal_type || 'default'}`)
    return saved ? parseInt(saved) : cfg.presets[1].price  // default = متوسط
  })
  const [editMode, setEditMode] = useState(false)
  const [editVal,  setEditVal]  = useState('')

  const savePrice = (price) => {
    setEatOutPrice(price)
    // نحفظ السعر بالـ meal_type عشان لو في فطار تاني يتطبق عليه نفس السعر
    localStorage.setItem(`eatOutPrice_type_${meal.meal_type || 'default'}`, String(price))
    setEditMode(false)
  }
  const commitEdit = () => {
    const v = parseInt(editVal)
    if (v > 0 && v < 5000) savePrice(v)
    setEditMode(false)
  }

  const mealCost   = meal.cost_egp   || 0
  const mealLabel  = meal.recipe_name || meal.meal_name || `وجبة ${index + 1}`
  const saved      = Math.max(0, eatOutPrice - mealCost)
  const overspent  = mealCost > eatOutPrice
  const savePct    = eatOutPrice > 0 ? Math.round((saved / eatOutPrice) * 100) : 0
  const activePreset = cfg.presets.find(p => p.price === eatOutPrice)

  return (
    <div className="rounded-2xl p-3" style={{background:'var(--primary-lt)', border:'1px solid var(--border)'}}>
      {/* Meal header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold truncate" style={{color:'var(--text)'}}>{mealLabel}</p>
          <p className="text-[9px]" style={{color:'var(--text-muted)'}}>{cfg.label}</p>
        </div>
        {/* Result badge */}
        <div className="text-right shrink-0">
          <p className="text-sm font-black" style={{color: overspent ? '#f87171' : '#2D7A4F'}}>
            {overspent ? '-' : '+'}{Math.abs(saved).toFixed(0)}
            <span className="text-[9px] font-normal ml-0.5">EGP</span>
          </p>
          <p className="text-[9px]" style={{color:'var(--text-muted)'}}>
            {overspent ? 'صرفت أكتر' : `وفّرت ${savePct}%`}
          </p>
        </div>
      </div>

      {/* Preset buttons per meal type */}
      <div className="flex gap-1 mb-2">
        {cfg.presets.map(p => (
          <button key={p.label} onClick={() => savePrice(p.price)}
            className="flex-1 py-1 rounded-lg text-[9px] font-semibold transition-all"
            style={{
              background: eatOutPrice === p.price ? p.color : 'var(--border)',
              color:      eatOutPrice === p.price ? '#fff'  : 'var(--text-muted)',
            }}>
            {p.label}<br/>
            <span style={{opacity:0.85, fontSize:8}}>{p.price}</span>
          </button>
        ))}
        <button onClick={() => { setEditMode(m => !m); setEditVal(String(eatOutPrice)) }}
          className="flex-1 py-1 rounded-lg text-[9px] font-semibold transition-all"
          style={{
            background: editMode || !activePreset ? '#3b82f6' : 'var(--border)',
            color:      editMode || !activePreset ? '#fff'    : 'var(--text-muted)',
          }}>
          يدوي<br/>
          <span style={{opacity:0.85, fontSize:8}}>{!activePreset ? eatOutPrice : '...'}</span>
        </button>
      </div>

      {editMode && (
        <div className="flex gap-1.5 mb-2">
          <input autoFocus type="number" min={10} max={5000}
            placeholder={`سعر ${cfg.label} برا`}
            value={editVal}
            onChange={e => setEditVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && commitEdit()}
            className="flex-1 text-[11px] px-2 py-1 rounded-lg"
            style={{background:'var(--bg)', border:'1px solid var(--primary)',
                    color:'var(--text)', outline:'none'}}
          />
          <button onClick={commitEdit}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
            style={{background:'var(--primary)', color:'#fff'}}>✓</button>
        </div>
      )}

      {/* Progress: إنت صرفت كام مقارنة بسعر برا */}
      <div className="space-y-0.5">
        <div className="flex justify-between text-[9px]" style={{color:'var(--text-muted)'}}>
          <span>صرفت: {mealCost.toFixed(0)} EGP</span>
          <span>برا: {eatOutPrice} EGP</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{background:'var(--border)'}}>
          <div className="h-full rounded-full transition-all"
               style={{
                 width: `${Math.min(100, (mealCost / eatOutPrice) * 100)}%`,
                 background: overspent
                   ? '#f87171'
                   : `linear-gradient(90deg, #2D7A4F, #4DB87A)`,
               }}/>
        </div>
      </div>
    </div>
  )
}

// ── Widget 1: Savings vs Eating Out ──────────────────────────────────────────
function SavingsWidget({ todayBudget, todayMeals = [] }) {
  const hasMealsData = todayMeals.length > 0

  // Fallback لو مفيش meals — نستخدم سعر واحد عام
  const [fallbackPrice, setFallbackPrice] = useState(() => {
    const saved = localStorage.getItem('eatOutPrice')
    return saved ? parseInt(saved) : 120
  })

  const FALLBACK_PRESETS = [
    { label: 'عادي',  price: 60,  color: '#2D7A4F' },
    { label: 'متوسط', price: 120, color: '#f97316' },
    { label: 'فاخر',  price: 250, color: '#a855f7' },
  ]

  const fallbackSaved   = Math.max(0, fallbackPrice - todayBudget)
  const fallbackSavePct = fallbackPrice > 0 ? Math.round(fallbackSaved / fallbackPrice * 100) : 0

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">💵</span>
        <p className="text-sm font-semibold" style={{color:'var(--text)'}}>وفّرت النهارده</p>
        {hasMealsData && (
          <span className="text-[9px] px-2 py-0.5 rounded-full ml-auto font-semibold"
                style={{background:'var(--primary-lt)', color:'var(--primary)'}}>
            {todayMeals.length} وجبة
          </span>
        )}
      </div>

      {todayBudget === 0 && !hasMealsData ? (
        <p className="text-xs text-center py-3" style={{color:'var(--text-muted)'}}>
          سجّل وجبة عشان تشوف توفيرك 💡
        </p>
      ) : hasMealsData ? (
        /* ── Per-meal breakdown ── */
        <div className="space-y-2">
          {todayMeals.map((meal, i) => (
            <MealPriceRow key={`${meal.id || i}`} meal={meal} index={i} />
          ))}

          {/* Total */}
          {todayMeals.length > 1 && (() => {
            const totalCost = todayMeals.reduce((s, m) => s + (m.cost_egp || 0), 0)
            // نجمع الـ eatOutPrice لكل وجبة من localStorage
            const totalEatOut = todayMeals.reduce((s, m) => {
              const cfg = getMealTypeCfg(m.meal_type)
              const saved = localStorage.getItem(`eatOutPrice_type_${m.meal_type || 'default'}`)
              const price = saved ? parseInt(saved) : cfg.presets[1].price
              return s + price
            }, 0)
            const totalSaved  = Math.max(0, totalEatOut - totalCost)
            const totalPct    = totalEatOut > 0 ? Math.round(totalSaved / totalEatOut * 100) : 0
            return (
              <div className="mt-3 pt-3" style={{borderTop:'1px solid var(--border)'}}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-semibold" style={{color:'var(--text-muted)'}}>
                    إجمالي اليوم
                  </p>
                  <p className="text-base font-black" style={{color: totalSaved > 0 ? '#2D7A4F' : '#f87171'}}>
                    {totalSaved > 0 ? '+' : ''}{totalSaved.toFixed(0)} EGP
                    <span className="text-[10px] font-normal ml-1" style={{color:'var(--text-muted)'}}>
                      ({totalPct}% وفّرت)
                    </span>
                  </p>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{background:'var(--border)'}}>
                  <div className="h-full rounded-full transition-all"
                       style={{width:`${Math.min(100, totalPct)}%`,
                               background:'linear-gradient(90deg,#2D7A4F,#4DB87A)'}}/>
                </div>
                <p className="text-[9px] mt-1 text-center" style={{color:'var(--text-muted)'}}>
                  {totalCost.toFixed(0)} EGP صرفت · بدل {totalEatOut} EGP لو أكلت برا
                </p>
              </div>
            )
          })()}
        </div>
      ) : (
        /* ── Fallback: سعر واحد عام ── */
        <>
          <div className="flex gap-1.5 mb-3">
            {FALLBACK_PRESETS.map(p => (
              <button key={p.label} onClick={() => { setFallbackPrice(p.price); localStorage.setItem('eatOutPrice', String(p.price)) }}
                className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                style={{
                  background: fallbackPrice === p.price ? p.color : 'var(--border)',
                  color:      fallbackPrice === p.price ? '#fff'  : 'var(--text-muted)',
                }}>
                {p.label}<br/><span style={{opacity:0.85}}>{p.price} EGP</span>
              </button>
            ))}
          </div>
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-2xl font-black" style={{color: fallbackSaved > 0 ? '#2D7A4F' : '#f87171'}}>
                {fallbackSaved.toFixed(0)} EGP
                <span className="text-xs font-normal ml-1" style={{color:'var(--text-muted)'}}>وفّرت</span>
              </p>
              <p className="text-[10px] mt-0.5" style={{color:'var(--text-muted)'}}>
                {todayBudget.toFixed(0)} EGP بدل {fallbackPrice} EGP
              </p>
            </div>
            <span className="text-2xl font-black" style={{color: fallbackSaved > 0 ? '#2D7A4F' : '#f87171'}}>
              {fallbackSavePct}%
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{background:'var(--border)'}}>
            <div className="h-full rounded-full transition-all"
                 style={{width:`${Math.min(100,fallbackSavePct)}%`,
                         background:'linear-gradient(90deg,#2D7A4F,#4DB87A)'}}/>
          </div>
        </>
      )}
    </div>
  )
}

// ── Widget 2: Daily Food Score ────────────────────────────────────────────────
function FoodScoreWidget({ todayCal, todayProt, targetCal, targetProt, todayBudget, targetBudget }) {
  const scores = [
    { label:"Protein",  pct: Math.min(100, targetProt>0   ? todayProt/targetProt*100     : 0), color:"#3b82f6" },
    { label:"Calories", pct: Math.min(100, targetCal>0    ? todayCal/targetCal*100       : 0), color:"#f97316" },
    { label:"Budget",   pct: Math.min(100, targetBudget>0 ? todayBudget/targetBudget*100 : 0), color:"#2D7A4F" },
  ]
  const avg   = scores.reduce((s,x) => s + x.pct, 0) / scores.length
  const grade = avg >= 90 ? "A+" : avg >= 80 ? "A" : avg >= 70 ? "B+" : avg >= 60 ? "B" : avg >= 50 ? "C" : "D"
  const gCol  = avg >= 70 ? "#2D7A4F" : avg >= 50 ? "#f97316" : "#ef4444"
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🎯</span>
          <p className="text-sm font-semibold" style={{color:"var(--text)"}}>تقييم يومك</p>
        </div>
        <span className="text-2xl font-black" style={{color:gCol}}>{grade}</span>
      </div>
      <div className="space-y-2">
        {scores.map(s => (
          <div key={s.label}>
            <div className="flex justify-between text-[10px] mb-0.5">
              <span style={{color:"var(--text-muted)"}}>{s.label}</span>
              <span className="font-bold" style={{color:s.color}}>{Math.round(s.pct)}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{background:"var(--border)"}}>
              <div className="h-full rounded-full transition-all"
                   style={{width:`${s.pct}%`, background:s.color}}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Widget 3: Recipe of the Day ───────────────────────────────────────────────
function RecipeOfDay() {
  const [recipe, setRecipe] = useState(null)
  useEffect(() => {
    const token = localStorage.getItem("access_token")
    fetch("/api/v1/recipes/?limit=1&offset=" + Math.floor(Math.random() * 280), {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => { if (d?.length) setRecipe(d[0]) })
      .catch(() => {})
  }, [])
  if (!recipe) return null
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🍳</span>
        <p className="text-sm font-semibold" style={{color:"var(--text)"}}>جرب النهارده</p>
      </div>
      <div className="p-3 rounded-xl" style={{background:"var(--primary-lt)"}}>
        <p className="text-sm font-bold mb-1" style={{color:"var(--primary)"}}>{recipe.recipe_name}</p>
        <div className="flex items-center gap-3 text-[10px]" style={{color:"var(--text-muted)"}}>
          {recipe.prep_time && <span>⏱ {recipe.prep_time} min</span>}
          {recipe.meal_type && <span>🍽️ {recipe.meal_type}</span>}
        </div>
      </div>
      <a href="/recipes" className="block mt-2 text-center text-[11px] font-semibold py-1.5 rounded-xl transition-all"
         style={{background:"var(--border)", color:"var(--text)"}}>
        عرض الوصفات →
      </a>
    </div>
  )
}

export default function Dashboard() {
  const { user }     = useAuthStore()
  const [stats,      setStats]      = useState(null)
  const [history,    setHistory]    = useState([])
  const [totalPlans, setTotalPlans] = useState(0)
  const [streak,     setStreak]     = useState(0)
  const [todayMacros,setTodayMacros]= useState(null)
  const [todayMeals, setTodayMeals] = useState([])
  const [loading,    setLoading]    = useState(true)

  const fetchDashboard = () => {
    const token   = localStorage.getItem('access_token')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    Promise.all([
      productAPI.stats().catch(()=>null),
      matchAPI.stats().catch(()=>null),
      optimizerAPI.history(4).catch(()=>({data:{}})),
      optimizerAPI.todayLogs().catch(()=>null),
      fetch('/api/v1/users/me/streak', {headers}).then(r=>r.ok?r.json():null).catch(()=>null),
    ]).then(([p,m,h,todayLogs,streakData]) => {
      setStats(p?.data)
      const plans = h?.data?.plans || h?.data || []
      setHistory(Array.isArray(plans) ? plans.slice(0,4) : [])
      setTotalPlans(h?.data?.total || plans.length)
      if (streakData?.streak !== undefined) setStreak(streakData.streak)
      if (todayLogs?.data?.totals && todayLogs.data.totals.calories > 0) {
        setTodayMacros(todayLogs.data.totals)
        setTodayMeals(todayLogs.data.meals || [])
      } else if (todayLogs?.totals && todayLogs.totals.calories > 0) {
        setTodayMacros(todayLogs.totals)
        setTodayMeals(todayLogs.meals || [])
      }
      localStorage.removeItem('plans_dirty')
      setLoading(false)
    })
  }

  useEffect(() => {
    fetchDashboard()
    const poll = setInterval(() => {
      if (localStorage.getItem('plans_dirty')) fetchDashboard()
    }, 2000)
    const onEvent = () => fetchDashboard()
    window.addEventListener('plans-updated', onEvent)
    return () => {
      clearInterval(poll)
      window.removeEventListener('plans-updated', onEvent)
    }
  }, [])

  const todayCal    = todayMacros?.calories  || 0
  const todayProt   = todayMacros?.protein_g || 0
  const todayCarb   = todayMacros?.carbs_g   || 0
  const todayFat    = todayMacros?.fats_g    || 0
  const todayBudget = todayMacros?.cost_egp  || 0

  const targetCal  = user?.daily_calories  || 2000
  const targetProt = user?.daily_protein_g || 80
  const targetCarb = user?.daily_carbs_g   || 250
  const targetFat  = user?.daily_fats_g    || 70

  if (loading) return (
    <div className="flex items-center justify-center h-screen"><Spinner size="lg"/></div>
  )

  return (
    <div className="page-enter space-y-5 min-h-screen pb-6">

      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl text-white"
           style={{background:'linear-gradient(135deg,#1B5E38 0%,#256641 45%,#3A9460 100%)',
                   boxShadow:'0 8px 32px rgba(27,94,56,0.4)'}}>
        <div className="absolute -right-8 -top-8 w-56 h-56 rounded-full opacity-[0.15]"
             style={{background:'radial-gradient(circle,#fff,transparent)'}}/>
        <div className="relative p-7">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <p className="text-green-200 text-xs font-medium mb-1">
                {new Date().toLocaleDateString('en-EG',{weekday:'long',day:'numeric',month:'long'})}
              </p>
              <h1 className="text-3xl font-bold mb-1.5">
                Good morning{user?.full_name?`, ${user.full_name.split(' ')[0]}`:''} 👋
              </h1>
              <p className="text-green-100 text-sm">
                Daily target: <strong>{(user?.daily_calories||0).toLocaleString()} kcal</strong>
                {' · '}Budget: <strong>{user?.daily_budget_egp} EGP</strong>
              </p>
            </div>
            <div className="flex-1 max-w-md grid grid-cols-3 gap-4">
              {[
                {label:'Protein',pct:Math.min(100,targetProt>0?todayProt/targetProt*100:0),val:`${todayProt.toFixed(0)}g`,icon:'💪'},
                {label:'Carbs',  pct:Math.min(100,targetCarb>0?todayCarb/targetCarb*100:0),val:`${todayCarb.toFixed(0)}g`,icon:'⚡'},
                {label:'Fats',   pct:Math.min(100,targetFat >0?todayFat /targetFat *100:0),val:`${todayFat.toFixed(0)}g`, icon:'🧴'},
              ].map(m => (
                <div key={m.label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[11px] text-green-200 font-medium">{m.icon} {m.label}</span>
                    <span className="text-[11px] text-white font-bold">{Math.round(m.pct)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/20">
                    <div className="h-full rounded-full bg-white transition-all" style={{width:`${m.pct}%`}}/>
                  </div>
                  <p className="text-[10px] text-green-200/70 mt-0.5">{m.val}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Link to="/optimize">
              <button className="btn bg-white font-semibold text-sm px-5 py-2.5" style={{color:'var(--primary)'}}>
                <Zap className="w-4 h-4"/> Generate Plan
              </button>
            </Link>
            <Link to="/vision">
              <button className="btn text-white text-sm font-semibold px-5 py-2.5"
                      style={{background:'rgba(255,255,255,0.2)'}}>
                <Camera className="w-4 h-4"/> Analyze Meal
              </button>
            </Link>
          </div>
        </div>
      </div>

      <NutritionScoreWidget user={user} totalPlans={totalPlans} streak={streak}/>

      <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1rem'}}>
        <div className="card text-center py-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{color:'var(--text-muted)'}}>💰 Today's Budget</p>
          <p className="text-2xl font-black font-mono" style={{color:todayBudget>(user?.daily_budget_egp||999)?'#f87171':'var(--primary)'}}>
            {todayBudget>0?todayBudget.toFixed(0):'—'}{todayBudget>0&&<span className="text-sm font-normal"> EGP</span>}
          </p>
          <p className="text-[10px] mt-1" style={{color:'var(--text-muted)'}}>
            {todayBudget>0?`of ${user?.daily_budget_egp||'?'} EGP`:'No meals logged'}
          </p>
          {todayBudget>0&&user?.daily_budget_egp>0&&(
            <div className="h-1 rounded-full mt-2 overflow-hidden mx-4" style={{background:'var(--border)'}}>
              <div className="h-full rounded-full transition-all"
                   style={{width:`${Math.min(100,(todayBudget/user.daily_budget_egp)*100)}%`,
                           background:todayBudget>user.daily_budget_egp?'#f87171':'var(--primary)'}}/>
            </div>
          )}
        </div>
        <div className="card text-center py-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{color:'var(--text-muted)'}}>🔥 Current Streak</p>
          <p className="text-2xl font-black font-mono" style={{color:streak>=7?'#a855f7':streak>=3?'#f97316':'var(--text)'}}>
            {streak>0?streak:'—'}{streak>0&&<span className="text-sm font-normal"> days</span>}
          </p>
          <p className="text-[10px] mt-1" style={{color:'var(--text-muted)'}}>
            {streak>=7?'🏆 Amazing!':streak>=3?'⚡ Keep going!':streak>0?'🌱 Just started':'Start your streak'}
          </p>
        </div>
        <div className="card text-center py-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{color:'var(--text-muted)'}}>📋 Plans Generated</p>
          <p className="text-2xl font-black font-mono" style={{color:'var(--primary)'}}>{totalPlans||history.length||'—'}</p>
          <p className="text-[10px] mt-1" style={{color:'var(--text-muted)'}}>total meal plans</p>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem'}}>
        {RINGS.map(r => (
          <MacroRing key={r.key} label={r.label} unit={r.unit} color={r.color}
            value={r.key==='cal'?todayCal:r.key==='prot'?todayProt:r.key==='carb'?todayCarb:todayFat}
            target={r.key==='cal'?targetCal:r.key==='prot'?targetProt:r.key==='carb'?targetCarb:targetFat}/>
        ))}
      </div>

      <SmartTip todayCal={todayCal} todayProt={todayProt} todayCarb={todayCarb} todayFat={todayFat}
                targetCal={targetCal} targetProt={targetProt} targetCarb={targetCarb} targetFat={targetFat}/>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

        <div className="space-y-5">
          <WeeklyChart target={targetCal}/>
          <Hydration/>
          <SavingsWidget todayBudget={todayBudget} todayMeals={todayMeals}/>
          <div className="grid grid-cols-2 gap-4">
            <FoodScoreWidget
              todayCal={todayCal} todayProt={todayProt}
              targetCal={targetCal} targetProt={targetProt}
              todayBudget={todayBudget} targetBudget={user?.daily_budget_egp || 200}
            />
            <RecipeOfDay/>
          </div>
        </div>

        <div className="space-y-5">

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-sm" style={{color:'var(--text)'}}>Recent Plans</h3>
                <p className="text-xs" style={{color:'var(--text-muted)'}}>Your last generated meal plans</p>
              </div>
              <Link to="/history" className="text-xs font-semibold" style={{color:'var(--primary)'}}>View all →</Link>
            </div>
            {history.length===0 ? (
              <div className="text-center py-8">
                <p className="text-2xl mb-2">📋</p>
                <p className="text-sm mb-3" style={{color:'var(--text-muted)'}}>No plans yet</p>
                <Link to="/optimize"><button className="btn-primary text-xs px-4 py-2">Generate First Plan</button></Link>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((plan,i) => {
                  const isWeekly  = plan.period==='weekly'
                  const isDaily   = plan.period==='daily'
                  const icon      = isWeekly?'🗓️':isDaily?'☀️':'🍽️'
                  const typeLabel = isWeekly?'Weekly':isDaily?'Daily':'Single'
                  const typeColor = isWeekly?'#a855f7':isDaily?'#f97316':'#4DB87A'
                  const mealNames = plan.meal_names?.slice(0,2)||[]
                  return (
                    <Link key={i} to="/history" className="block p-3 rounded-xl transition-all hover:opacity-80"
                          style={{background:'var(--primary-lt)'}}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <span className="text-lg shrink-0 mt-0.5">{icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold" style={{color:'var(--text)'}}>{typeLabel} #{plan.plan_id}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                                    style={{background:`${typeColor}20`,color:typeColor}}>{plan.status||'optimal'}</span>
                            </div>
                            {mealNames.length>0
                              ? <p className="text-[10px] mt-0.5 truncate" style={{color:'var(--text-muted)'}}>{mealNames.join(' · ')}{plan.meal_names?.length>2&&` +${plan.meal_names.length-2}`}</p>
                              : <p className="text-[10px] mt-0.5" style={{color:'var(--text-muted)'}}>{plan.total_calories?.toFixed(0)} kcal · {plan.total_cost_egp?.toFixed(0)} EGP</p>
                            }
                            <p className="text-[9px] mt-0.5" style={{color:'var(--text-muted)',opacity:0.6}}>{plan.created_at?.slice(0,10)}</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold shrink-0" style={{color:'var(--primary)'}}>{plan.total_cost_egp?.toFixed(0)} EGP</p>
                      </div>
                      {plan.macro_bars && (
                        <div className="mt-2 space-y-1">
                          {plan.macro_bars.map(b=>(
                            <div key={b.label} className="h-1 rounded-full overflow-hidden" style={{background:'var(--border)'}}>
                              <div className="h-full rounded-full" style={{width:`${Math.min(100,(b.val/b.max)*100)}%`,background:b.col}}/>
                            </div>
                          ))}
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="font-semibold text-sm mb-4" style={{color:'var(--text)'}}>Quick Actions</h3>
            <div className="grid gap-2" style={{gridTemplateColumns:`repeat(${user?.is_admin ? 6 : 4}, 1fr)`}}>
              {[
                {to:'/optimize',    Icon:Zap,        label:'Optimize Plan',   desc:'MILP solver'},
                {to:'/vision',      Icon:Camera,     label:'Scan Meal',       desc:'AI recognition'},
                {to:'/personalize', Icon:Target,     label:'Personalized',    desc:'Adaptive plan'},
                {to:'/history',     Icon:TrendingUp, label:'View History',    desc:'Past plans'},
                ...(user?.is_admin?[
                  {to:'/products',  Icon:Upload,     label:'Upload Products', desc:'Market prices'},
                  {to:'/nutrition', Icon:Salad,      label:'Add Nutrition',   desc:'Build food DB'},
                ]:[]),
              ].map(({to,Icon,label,desc})=>(
                <Link key={to} to={to}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all hover:scale-[1.03]"
                  style={{background:'var(--primary-lt)'}}>
                  <div className="p-2.5 rounded-xl" style={{background:'var(--primary-md)'}}>
                    <Icon className="w-4 h-4" style={{color:'var(--primary)'}}/>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-semibold leading-tight" style={{color:'var(--text)'}}>{label}</p>
                    <p className="text-[9px] mt-0.5" style={{color:'var(--text-muted)'}}>{desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}