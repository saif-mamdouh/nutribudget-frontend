import { useState, useEffect, useMemo } from 'react'
import { optimizerAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { Zap, ShoppingCart, UtensilsCrossed, CalendarDays, Coffee, Search, X,
         Heart, BookmarkPlus, Scale, CheckCircle2 } from 'lucide-react'
import { Card, Button, StatCard, MacroBar, Badge, Spinner, Alert, SectionHeader } from '../components/UI'

// ── API helpers ───────────────────────────────────────────────────────────────
const authH = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('access_token')}`,
})
const mealPlanAPI  = (d) => fetch('/api/v1/optimize/meal-plan',   { method:'POST', headers:authH(), body:JSON.stringify(d) }).then(r=>r.json())
const mealSearchAPI= (d) => fetch('/api/v1/optimize/meal-search', { method:'POST', headers:authH(), body:JSON.stringify(d) }).then(r=>r.json())
const addMealAPI   = (d) => fetch('/api/v1/optimize/add-meal',    { method:'POST', headers:authH(), body:JSON.stringify(d) }).then(r=>r.json())

// ── Constants ─────────────────────────────────────────────────────────────────
const MODES = [
  { key: 'meal',     label: 'Meal Plan',      icon: UtensilsCrossed, desc: 'Real Egyptian recipes (recommended)' },
  { key: 'search',   label: 'Find a Meal',    icon: Search,          desc: 'Search by name + optional budget/protein' },
  { key: 'calendar', label: 'Weekly Calendar',icon: ShoppingCart,    desc: 'Visual 7-day meal schedule' },
]
const PLAN_TYPES = [
  { key: 'single', label: 'Single', icon: Coffee      },
  { key: 'daily',  label: 'Daily (3)', icon: Zap      },
  { key: 'weekly', label: 'Weekly (21)', icon: CalendarDays },
]
const MEAL_TYPES = [
  { key: null,    label: 'Any'           },
  { key: 'فطار', label: 'Breakfast فطار' },
  { key: 'غداء', label: 'Lunch غداء'    },
  { key: 'عشاء', label: 'Dinner عشاء'   },
]

// ── Slider ────────────────────────────────────────────────────────────────────

// ── Goal Presets ──────────────────────────────────────────────────────────────
const GOAL_PRESETS = [
  {
    key: 'muscle',
    label: 'بناء عضل 🏋️',
    desc: 'بروتين عالي',
    color: '#3b82f6',
    apply: (user) => ({
      budget:   Math.round((user?.daily_budget_egp || 200) * 1.2 / 10) * 10,
      calories: Math.round((user?.daily_calories   || 2500) / 100) * 100,
      protein:  Math.round((user?.weight_kg || 75) * 2.0 / 5) * 5,
      carbs:    200, fats: 60,
    }),
  },
  {
    key: 'cut',
    label: 'حرق دهون 🔥',
    desc: 'عجز سعراتي',
    color: '#ef4444',
    apply: (user) => ({
      budget:   user?.daily_budget_egp || 150,
      calories: Math.round(((user?.daily_calories || 2000) * 0.8) / 100) * 100,
      protein:  Math.round((user?.weight_kg || 75) * 1.8 / 5) * 5,
      carbs:    100, fats: 50,
    }),
  },
  {
    key: 'budget',
    label: 'توفير 💰',
    desc: 'أقل تكلفة',
    color: '#2D7A4F',
    apply: (user) => ({
      budget:   Math.round((user?.daily_budget_egp || 100) * 0.7 / 10) * 10,
      calories: user?.daily_calories || 2000,
      protein:  user?.daily_protein_g || 60,
      carbs:    0, fats: 0,
    }),
  },
]

function GoalPresets({ user, planType, onApply }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-medium uppercase tracking-wider mb-2"
         style={{color:'var(--text-muted)'}}>اختار هدفك</p>
      <div className="grid grid-cols-3 gap-2">
        {GOAL_PRESETS.map(g => {
          const vals = g.apply(user)
          return (
            <button key={g.key} onClick={() => onApply(vals)}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-center transition-all hover:scale-105"
              style={{borderColor: g.color+'40', background: g.color+'10'}}>
              <span className="text-sm font-bold" style={{color: g.color}}>{g.label}</span>
              <span className="text-[10px]" style={{color:'var(--text-muted)'}}>{g.desc}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Macro Distribution Donut ──────────────────────────────────────────────────
function MacroDonut({ protein_g, carbs_g, fats_g }) {
  const protCal = protein_g * 4
  const carbCal = carbs_g  * 4
  const fatCal  = fats_g   * 9
  const total   = protCal + carbCal + fatCal || 1

  const protPct = Math.round(protCal / total * 100)
  const carbPct = Math.round(carbCal / total * 100)
  const fatPct  = 100 - protPct - carbPct

  // SVG donut
  const cx = 50, cy = 50, r = 36, stroke = 18
  const circ = 2 * Math.PI * r

  const segments = [
    { pct: protPct, color: '#3b82f6', label: 'Protein',  val: `${protein_g?.toFixed(0)}g` },
    { pct: carbPct, color: '#f97316', label: 'Carbs',    val: `${carbs_g?.toFixed(0)}g`   },
    { pct: fatPct,  color: '#a855f7', label: 'Fats',     val: `${fats_g?.toFixed(0)}g`    },
  ]

  let offset = 0
  const arcs = segments.map(s => {
    const dash   = (s.pct / 100) * circ
    const gap    = circ - dash
    const rotate = (offset / 100) * 360 - 90
    offset += s.pct
    return { ...s, dash, gap, rotate }
  })

  return (
    <div className="card">
      <p className="text-sm font-semibold mb-3" style={{color:'var(--text)'}}>
        📊 توزيع الماكروز
      </p>
      <div className="flex items-center gap-4">
        {/* Donut SVG */}
        <div className="shrink-0">
          <svg viewBox="0 0 100 100" width="90" height="90">
            {arcs.map((a, i) => (
              <circle key={i}
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke={a.color}
                strokeWidth={stroke}
                strokeDasharray={`${a.dash} ${a.gap}`}
                strokeDashoffset={0}
                transform={`rotate(${a.rotate} ${cx} ${cy})`}
                style={{transition:'all 0.5s ease'}}
              />
            ))}
            <text x={cx} y={cy-6}  textAnchor="middle" fontSize="11" fontWeight="bold" fill="var(--text)">{Math.round(total/4)} kcal</text>
            <text x={cx} y={cy+8}  textAnchor="middle" fontSize="7.5"  fill="var(--text-muted)">from macros</text>
          </svg>
        </div>

        {/* Legend */}
        <div className="space-y-2 flex-1">
          {arcs.map((a, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{background: a.color}}/>
                <span className="text-xs" style={{color:'var(--text-muted)'}}>{a.label}</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold font-mono" style={{color: a.color}}>{a.pct}%</span>
                <span className="text-[10px] ml-1.5" style={{color:'var(--text-muted)'}}>{a.val}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Sensitivity Analysis ──────────────────────────────────────────────────────
function SensitivityAnalysis({ result, budget, calories, protein }) {
  if (!result?.data) return null
  const d = result.data
  if (d.plan_type === 'single') return null  // not relevant for single meal

  const protPerEgp  = d.total_protein_g  / (d.total_cost_egp || 1)
  const calPerEgp   = d.total_calories   / (d.total_cost_egp || 1)
  const budgetUsed  = d.budget_used_pct || 0
  const budgetLeft  = budget - d.total_cost_egp
  const isSingle    = d.plan_type === 'single'
  const calsMet     = d.calories_met
  const protMet     = d.protein_met
  const budgetTight = budgetUsed > 85  // budget is actually the constraint

  const insights = []

  // ── Case 1: everything met ────────────────────────────────────────────────
  if (calsMet && protMet) {
    if (budgetLeft > 10) {
      insights.push({
        icon: '✅', color: '#2D7A4F',
        text: `الخطة محققة! وفّرت ${Math.round(budgetLeft)} EGP — ممكن تستخدمها لتنويع أكتر أو تخفّض الـ budget`
      })
    } else {
      insights.push({
        icon: '✅', color: '#2D7A4F',
        text: `الخطة مثالية — كل الأهداف محققة بكفاءة عالية`
      })
    }
    return (
      <div className="card space-y-2">
        <p className="text-sm font-semibold mb-1" style={{color:'var(--text)'}}>🔍 توصيات الخطة</p>
        {insights.map((ins, i) => (
          <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl"
               style={{background: ins.color+'10', border: `1px solid ${ins.color}30`}}>
            <span className="text-sm shrink-0">{ins.icon}</span>
            <p className="text-xs leading-relaxed" style={{color: ins.color}}>{ins.text}</p>
          </div>
        ))}
      </div>
    )
  }

  // ── Case 2: Single meal — budget not the issue ────────────────────────────
  if (isSingle && !budgetTight) {
    if (!calsMet || !protMet) {
      insights.push({
        icon: '💡', color: '#f97316',
        text: `الـ plan نوعه Single Meal — هيكمّل يوم كامل لو غيّرت لـ Daily (3 وجبات)`
      })
    }
  }

  // ── Case 3: Budget IS the bottleneck ─────────────────────────────────────
  if (budgetTight) {
    if (!protMet) {
      const protDiff   = protein - d.total_protein_g
      const egpNeeded  = protDiff / protPerEgp
      insights.push({
        icon: '🎯', color: '#3b82f6',
        text: `الـ budget محدود (${Math.round(budgetUsed)}% مستخدم) — زيادة ${Math.round(egpNeeded)} EGP هتحقق هدف الـ protein`
      })
    }
    if (!calsMet) {
      const calDiff   = calories - d.total_calories
      const egpNeeded = calDiff / calPerEgp
      insights.push({
        icon: '🔋', color: '#a855f7',
        text: `ناقص ${Math.round(calDiff)} kcal — زيادة ${Math.round(egpNeeded)} EGP هيكمّلها`
      })
    }
    insights.push({
      icon: '📊', color: '#2D7A4F',
      text: `بتوفير ${Math.round(protPerEgp * 10)} g protein لكل 10 EGP · ${Math.round(calPerEgp * 10)} kcal لكل 10 EGP`
    })
  }

  // ── Case 4: Budget fine but targets not met → other constraints ───────────
  if (!budgetTight && (!calsMet || !protMet) && !isSingle) {
    insights.push({
      icon: '⚙️', color: '#f97316',
      text: `الـ budget كافي (${Math.round(budgetUsed)}% مستخدم بس) — المشكلة في تنوع المكونات المتاحة أو الـ max_items`
    })
    insights.push({
      icon: '💡', color: '#2D7A4F',
      text: `جرّب تزيد الـ Max Repeat أو تغيّر الـ source (Carrefour/Hyperone/Spinneys)`
    })
  }

  if (!insights.length) return null

  return (
    <div className="card space-y-2">
      <p className="text-sm font-semibold mb-1" style={{color:'var(--text)'}}>🔍 توصيات الخطة</p>
      {insights.map((ins, i) => (
        <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl"
             style={{background: ins.color+'10', border: `1px solid ${ins.color}30`}}>
          <span className="text-sm shrink-0">{ins.icon}</span>
          <p className="text-xs leading-relaxed" style={{color: ins.color}}>{ins.text}</p>
        </div>
      ))}
      <p className="text-[10px] text-center mt-1" style={{color:'var(--text-muted)'}}>
        بناءً على نتائج الـ MILP solver · {d.solver_message}
      </p>
    </div>
  )
}


function Slider({ label, unit, value, min, max, step, onChange }) {
  const pct  = Math.round(((value - min) / (max - min)) * 100)
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState('')

  const commit = () => {
    const v = parseFloat(draft)
    if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)))
    setEditing(false)
  }

  return (
    <div>
      {/* Label + editable value */}
      <div className="flex justify-between items-center text-sm mb-1.5">
        <span className="font-medium text-slate-700 dark:text-green-100">{label}</span>
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              type="number" value={draft} min={min} max={max} step={step}
              onChange={e => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={e => { if (e.key==='Enter') commit(); if (e.key==='Escape') setEditing(false) }}
              className="w-24 text-right font-mono text-xs px-2 py-0.5 rounded-lg border"
              style={{background:'var(--bg)', borderColor:'var(--primary)', color:'var(--primary)'}}
            />
            <span className="text-xs" style={{color:'var(--text-muted)'}}>{unit}</span>
          </div>
        ) : (
          <button
            onClick={() => { setDraft(String(value)); setEditing(true) }}
            className="font-mono text-sm font-semibold hover:underline transition-all"
            style={{color:'var(--primary)'}}
            title="اضغط لتعديل القيمة مباشرة">
            {value?.toLocaleString()} {unit}
          </button>
        )}
      </div>

      {/* Slider */}
      <div className="relative">
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="w-full cursor-pointer"
          style={{accentColor:'#2D7A4F'}}
        />
        {/* Min / Max labels */}
        <div className="flex justify-between mt-0.5">
          <span className="text-[10px]" style={{color:'var(--text-muted)'}}>{min.toLocaleString()}</span>
          <span className="text-[10px] font-semibold" style={{color:'var(--primary)'}}>{pct}%</span>
          <span className="text-[10px]" style={{color:'var(--text-muted)'}}>{max.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

// ── Meal card with ingredient breakdown ───────────────────────────────────────
function MealCard({ meal, index }) {
  const [open, setOpen] = useState(false)
  const slotColors = { breakfast: 'orange', lunch: 'blue', dinner: 'violet' }
  const slotAr     = { breakfast: 'فطار',   lunch: 'غداء', dinner: 'عشاء' }
  return (
    <div className="p-4 rounded-xl border border-slate-100 dark:border-[#143D22] hover:border-orange-200 dark:hover:border-orange-700 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0 text-[#2D7A4F] text-xs font-bold">{index+1}</div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 dark:text-white text-sm truncate">{meal.recipe_name}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {meal.day  && <span className="text-[10px] text-slate-400">Day {meal.day}</span>}
              {meal.slot && <Badge variant={slotColors[meal.slot]||'gray'}>{slotAr[meal.slot]||meal.slot}</Badge>}
              {meal.prep_time > 0 && <span className="text-[10px] text-slate-400">{meal.prep_time} min</span>}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-[#2D7A4F] dark:text-[#4DB87A]">{meal.cost_egp?.toFixed(1)} EGP</p>
          <p className="text-[10px] text-slate-400 font-mono">{meal.calories?.toFixed(0)} kcal · {meal.protein_g?.toFixed(1)}g</p>
        </div>
      </div>
      <button onClick={()=>setOpen(o=>!o)} className="mt-2.5 text-[11px] text-slate-400 hover:text-[#2D7A4F] dark:text-[#4DB87A] transition-colors">
        {open ? '▲ Hide' : '▼ Ingredients'}
      </button>
      {open && (
        <div className="mt-3">
          <div className="grid grid-cols-4 gap-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 pb-1.5 border-b border-slate-100 dark:border-[#143D22]">
            <span className="col-span-2">Ingredient</span><span className="text-right">Cal</span><span className="text-right">Cost</span>
          </div>
          {/* Products Used label */}
          <div className="flex items-center gap-1.5 mt-2 mb-1.5">
            <ShoppingCart className="w-3 h-3" style={{color:'var(--primary)'}}/>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{color:'var(--primary)'}}>Products Used</span>
          </div>
          <div className="space-y-1 mt-1">
            {meal.ingredients?.map((ing,i)=>(
              <div key={i} className="px-2.5 py-1.5 rounded-lg"
                   style={{background:'var(--bg)', border:'1px solid var(--border)'}}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[11px] leading-tight" style={{color:'var(--text)'}}>
                      {ing.display_name || ing.name}
                    </p>
                    {ing.product_name ? (
                      <p className="text-[10px] mt-0.5 truncate" style={{color:'var(--text-muted)'}}>
                        📦 {ing.product_name}
                        {ing.source && ing.source !== 'Estimated'
                          ? <span className="ml-1 font-bold" style={{color:'var(--primary)'}}>· {ing.source}</span>
                          : <span className="ml-1 text-amber-500"> · est.</span>}
                      </p>
                    ) : (
                      <p className="text-[10px] text-amber-500 mt-0.5">📍 Estimated</p>
                    )}
                    <p className="text-[9px] mt-0.5" style={{color:'var(--text-muted)'}}>
                      {ing.weight_g}g
                      {ing.protein_g > 0 && <span className="ml-1 text-blue-400">· {ing.protein_g?.toFixed(1)}g prot</span>}
                    </p>
                    {/* Pack info row */}
                    {ing.pack_price_egp > 0 && (
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        {ing.pack_weight_g}g pack = {ing.pack_price_egp?.toFixed(1)} EGP
                        {ing.pack_servings > 1 && (
                          <span className="ml-1 text-emerald-500">· {ing.pack_servings} servings</span>
                        )}
                      </p>
                    )}
                  </div>
                  <span className="text-right font-mono text-slate-500 text-[11px] pt-0.5">
                    {ing.calories > 0 ? `${ing.calories?.toFixed(0)} kcal` : '—'}
                  </span>
                  <span className={`text-right font-mono font-semibold text-[11px] pt-0.5 ${ing.cost_egp > 0 ? 'text-[#2D7A4F] dark:text-[#4DB87A]' : 'text-slate-400'}`}>
                    {ing.cost_egp > 0 ? `${ing.cost_egp?.toFixed(1)} EGP` : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1 px-2 pt-2 mt-1 border-t border-slate-100 dark:border-[#143D22] text-[11px] font-semibold">
            <span className="col-span-2 text-slate-600 dark:text-[#56A870]">Total (1 serving)</span>
            <span className="text-right font-mono text-emerald-500">{meal.calories?.toFixed(0)} kcal</span>
            <span className="text-right font-mono text-[#2D7A4F] dark:text-[#4DB87A]">{meal.cost_egp?.toFixed(1)} EGP</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Meal Search Panel ─────────────────────────────────────────────────────────
function MealSearchPanel({ onResult }) {
  const [query,   setQuery]   = useState('')
  const [budget,  setBudget]  = useState('')
  const [protein, setProtein] = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const EXAMPLES = [
    { text:'كشري',         budget:150,  protein:null },
    { text:'فراخ مشوية',  budget:null, protein:40   },
    { text:'فول مدمس',    budget:50,   protein:null },
    { text:'شاورما',      budget:200,  protein:35   },
  ]

  const search = async () => {
    if (!query.trim()) return
    setLoading(true); setError(null)
    try {
      const data = await mealSearchAPI({
        query:      query.trim(),
        budget_egp: budget  ? parseFloat(budget)  : null,
        protein_g:  protein ? parseFloat(protein) : null,
        top_k: 5,
      })
      if (data.status === 'error') throw new Error(data.message)
      onResult(data)
    } catch(e) { setError(e.message||'Search failed') }
    finally { setLoading(false) }
  }

  return (
    <Card>
      <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
        <Search className="w-4 h-4 text-[#2D7A4F] dark:text-[#4DB87A]" /> Find a Meal
      </h3>

      {/* Meal name */}
      <div className="mb-4">
        <label className="label">Meal Name (Arabic or English)</label>
        <div className="relative">
          <input className="input pr-8" placeholder="كشري، فراخ مشوية، pizza..." dir="auto"
            value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()} />
          {query && (
            <button onClick={()=>setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Optional constraints */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="label text-xs">Budget (EGP) <span className="text-slate-400 font-normal">optional</span></label>
          <input className="input text-sm" type="number" min="0" placeholder="e.g. 150"
            value={budget} onChange={e=>setBudget(e.target.value)} />
        </div>
        <div>
          <label className="label text-xs">Min Protein (g) <span className="text-slate-400 font-normal">optional</span></label>
          <input className="input text-sm" type="number" min="0" placeholder="e.g. 30"
            value={protein} onChange={e=>setProtein(e.target.value)} />
        </div>
      </div>

      {/* Examples */}
      <div className="mb-4">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Quick examples</p>
        <div className="grid grid-cols-2 gap-1.5">
          {EXAMPLES.map((ex,i)=>(
            <button key={i}
              onClick={()=>{ setQuery(ex.text); setBudget(ex.budget?String(ex.budget):''); setProtein(ex.protein?String(ex.protein):'') }}
              className="text-left text-[11px] px-3 py-2 rounded-xl border border-slate-200 dark:border-[#143D22] hover:border-orange-300 text-slate-600 dark:text-[#56A870] transition-all">
              <span className="font-medium">{ex.text}</span>
              <span className="text-slate-400 ml-1">
                {ex.budget&&`${ex.budget} EGP`}{ex.budget&&ex.protein&&' · '}{ex.protein&&`${ex.protein}g`}
              </span>
            </button>
          ))}
        </div>
      </div>

      {error && <Alert type="error" message={error} className="mb-3" />}

      <Button variant="primary" className="w-full" onClick={search} loading={loading} icon={<Search className="w-4 h-4"/>}>
        {loading ? 'Searching...' : 'Find Meals'}
      </Button>
      <p className="text-[10px] text-slate-400 text-center mt-3">MiniLM semantic search · 300 Egyptian recipes</p>
    </Card>
  )
}

// ── Grocery List helpers ──────────────────────────────────────────────────────
const GROCERY_CAT_MAP = {
  '🥩 Meat':        ['beef','chicken','lamb','fish','shrimp','liver','kofta','ground_beef','minced_beef','ground_lamb','chicken_breast','chicken_thigh','beef_steak','tilapia','salmon','tuna_canned','sujuk'],
  '🥛 Dairy':       ['eggs','milk','butter','yogurt','cheese','mozzarella','cream','white_cheese','labneh','cream_cheese','ghee'],
  '🥦 Vegetables':  ['tomato','onion','garlic','potato','eggplant','zucchini','carrot','spinach','bell_pepper','green_pepper','cucumber','mushroom','peas','okra','cauliflower','broccoli','lettuce','fresh_molokhia','frozen_molokhia'],
  '🍞 Grains':      ['rice','pasta','lentils','chickpeas','flour','bread','bread_baladi','toast_bread','burger_bun','phyllo_dough','kunafa_dough','bulgur','spaghetti','foul','foul_medames'],
  '🫙 Sauces':      ['vegetable_oil','olive_oil','tahini','mayonnaise','ketchup','vinegar','soy_sauce','tomato_sauce','tomato_paste','garlic_sauce'],
  '🌿 Spices':      ['salt','black_pepper','cumin','paprika','turmeric','cinnamon','allspice','parsley','coriander','mint','spices','mixed_spices','zaatar'],
  '🍯 Sweets':      ['honey','sugar','chocolate','vanilla','sugar_syrup','qater','nuts','almonds','walnuts'],
}

function getGroceryCat(key) {
  if (!key) return '📦 Other'
  const k = key.toLowerCase()
  for (const [cat, keys] of Object.entries(GROCERY_CAT_MAP))
    if (keys.includes(k)) return cat
  return '📦 Other'
}

function buildGroceryList(meals) {
  // Aggregate ingredients across all meals
  const agg = {}
  meals?.forEach(meal => {
    meal.ingredients?.forEach(ing => {
      const key = ing.name || ing.ingredient_key || ''
      if (!key) return
      if (!agg[key]) {
        agg[key] = {
          key,
          display_name:   ing.display_name || ing.name || key,
          product_name:   ing.product_name || ing.display_name || key,
          source:         ing.source || '',
          price_per_100g: ing.price_per_100g || 0,
          unit_weight_g:  ing.unit_weight_g || 0,
          total_g:        0,
          total_cost:     0,
          category:       getGroceryCat(key),
        }
      }
      agg[key].total_g    += ing.weight_g || 0
      agg[key].total_cost += ing.cost_egp || 0
    })
  })
  return Object.values(agg).sort((a,b) => a.category.localeCompare(b.category))
}

function GroceryListPanel({ meals, totalCost, defaultOpen = false }) {
  const items   = buildGroceryList(meals)
  const [open, setOpen] = useState(defaultOpen)
  if (!items.length) return null

  const grouped = {}
  items.forEach(item => {
    if (!grouped[item.category]) grouped[item.category] = []
    grouped[item.category].push(item)
  })

  const copyList = () => {
    let txt = '🛒 NutriBudget Grocery List\n'
    txt += `Total: ${totalCost?.toFixed(0)} EGP\n\n`
    Object.entries(grouped).forEach(([cat, catItems]) => {
      txt += `${cat}\n`
      catItems.forEach(item => {
        const packs = item.unit_weight_g > 0 ? Math.ceil(item.total_g / item.unit_weight_g) : null
        txt += `• ${item.product_name}  ${Math.round(item.total_g)}g`
        if (packs) txt += `  (${packs} pack${packs>1?'s':''})`
        txt += `  →  ${item.total_cost.toFixed(1)} EGP\n`
      })
      txt += '\n'
    })
    navigator.clipboard.writeText(txt).then(() => alert('✅ Copied to clipboard!'))
  }

  return (
    <div className="card mt-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setOpen(!open)}
          className="flex items-center gap-2 flex-1 text-left">
          <span className="text-sm" style={{color:'var(--text-muted)'}}>{open ? '▼' : '▶'}</span>
          <div>
            <p className="text-sm font-bold" style={{color:'var(--text)'}}>🛒 Grocery List</p>
            <p className="text-[10px]" style={{color:'var(--text-muted)'}}>
              {items.length} ingredients · {totalCost?.toFixed(1)} EGP total
            </p>
          </div>
        </button>
        <button onClick={copyList}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium"
          style={{background:'var(--primary-lt)', color:'var(--primary)'}}>
          📋 Copy List
        </button>
      </div>
      {!open ? null : (<>
      <div className="space-y-3">
        {Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold" style={{color:'var(--text)'}}>{cat}</span>
              <span className="text-xs font-semibold" style={{color:'var(--primary)'}}>
                {catItems.reduce((s,i) => s+i.total_cost, 0).toFixed(1)} EGP
              </span>
            </div>
            <div className="space-y-1.5">
              {catItems.map((item, i) => {
                const packs = item.unit_weight_g > 0 ? Math.ceil(item.total_g / item.unit_weight_g) : null
                const packPrice = item.unit_weight_g > 0 ? (item.price_per_100g * item.unit_weight_g / 100).toFixed(1) : null
                return (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl"
                       style={{background:'var(--primary-lt)'}}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{color:'var(--text)'}}>
                        {item.product_name}
                      </p>
                      <p className="text-[10px]" style={{color:'var(--text-muted)'}}>
                        {Math.round(item.total_g)}g needed
                        {packs && ` · Buy ${packs} × ${item.unit_weight_g}g`}
                        {item.source && ` · ${item.source}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-xs font-bold" style={{color:'var(--primary)'}}>
                        {item.total_cost.toFixed(1)} EGP
                      </p>
                      {packPrice && packs && (
                        <p className="text-[10px]" style={{color:'var(--text-muted)'}}>
                          {packs} pack = {(parseFloat(packPrice)*packs).toFixed(1)} EGP
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{borderColor:'var(--border)'}}>
        <span className="text-xs" style={{color:'var(--text-muted)'}}>Total Grocery Cost</span>
        <span className="text-lg font-black" style={{color:'var(--primary)'}}>{totalCost?.toFixed(1)} EGP</span>
      </div>
      </>)}
    </div>
  )
}

// ── Weekly Calendar View ──────────────────────────────────────────────────────
// Day names — 0-indexed matching JS getDay() (0=Sun)
const DAYS_AR = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']

// Returns the Arabic day name for day N in the plan,
// starting from today (Day 1 = today, Day 2 = tomorrow, ...)
const getDayName = (dayNum) => {
  const todayIdx = new Date().getDay()  // 0=Sun, 1=Mon, ..., 6=Sat
  return DAYS_AR[(todayIdx + dayNum - 1) % 7]
}
const MEAL_COLORS = { 'فطار':'#f97316', 'غداء':'#4DB87A', 'عشاء':'#a855f7' }

function SwapModal({ day, mealType, planId, onSwapped, onClose }) {
  const [search,  setSearch]  = useState('')
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(false)
  const [swapErr, setSwapErr] = useState('')

  useEffect(() => {
    setLoading(true)
    import('../services/api').then(({ recipeAPI }) => {
      recipeAPI.list({ meal_type: mealType, limit: 100 })
        .then(r => {
          // handle both list formats: array or { items: [] }
          const list = Array.isArray(r.data) ? r.data : (r.data?.items || r.data?.recipes || [])
          setRecipes(list)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    })
  }, [mealType])

  const filtered = recipes.filter(r => {
    const name = r.recipe_name || r.name || ''
    return !search || name.toLowerCase().includes(search.toLowerCase())
  })

  const doSwap = async (recipe) => {
    setSwapErr('')
    // handle both id field names
    const recipeId = recipe.recipe_id || recipe.id
    if (!recipeId) { setSwapErr('Recipe ID missing'); return }
    if (!planId)   { setSwapErr('Plan ID missing — generate a weekly plan first'); return }
    try {
      const { optimizerAPI } = await import('../services/api')
      // Try both param name conventions — backend may use day_num or day, new_recipe_id or recipe_id
      const res = await optimizerAPI.swapMeal(planId, {
        day_num:       day,
        day:           day,         // belt & suspenders
        meal_type:     mealType,
        new_recipe_id: recipeId,
        recipe_id:     recipeId,    // belt & suspenders
      })
      console.log('[SwapMeal] response:', res.data)  // 🔍 temp debug
      onSwapped(res.data)
      onClose()
    } catch(e) {
      const msg = e?.response?.data?.detail || e?.message || 'Swap failed'
      setSwapErr(msg)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{background:'rgba(0,0,0,0.7)'}}>
      <div className="card w-full max-w-md max-h-[80vh] flex flex-col"
           style={{background:'var(--bg-card)'}}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-bold" style={{color:'var(--text)'}}>
              Swap Meal — Day {day} · {mealType}
            </p>
            <p className="text-xs" style={{color:'var(--text-muted)'}}>Choose a replacement</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70"
                  style={{color:'var(--text-muted)'}}><X className="w-4 h-4"/></button>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search recipes..." className="input mb-3 text-sm"/>
        {swapErr && (
          <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2 mb-2">
            ⚠️ {swapErr}
          </p>
        )}
        <div className="flex-1 overflow-y-auto space-y-2">
          {loading
            ? <div className="flex justify-center py-8"><Spinner size="md"/></div>
            : filtered.length === 0
              ? <p className="text-center text-xs py-8" style={{color:'var(--text-muted)'}}>
                  No {mealType} recipes found
                </p>
              : filtered.map((r, i) => {
                  const name     = r.recipe_name || r.name || 'Unknown'
                  const recipeId = r.recipe_id   || r.id
                  return (
                    <button key={recipeId || i} onClick={() => doSwap(r)}
                      className="w-full flex items-center justify-between p-3 rounded-xl text-left hover:opacity-80 transition-all"
                      style={{background:'var(--primary-lt)'}}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{color:'var(--text)'}}>{name}</p>
                        <p className="text-xs" style={{color:'var(--text-muted)'}}>
                          {r.prep_time} min
                          {r.calories && ` · ${r.calories?.toFixed?.(0)} kcal`}
                          {r.cost_egp && ` · ${r.cost_egp?.toFixed?.(1)} EGP`}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-lg font-medium ml-2 shrink-0"
                            style={{background:`${MEAL_COLORS[mealType]}20`, color:MEAL_COLORS[mealType]}}>
                        {mealType}
                      </span>
                    </button>
                  )
                })
          }
        </div>
      </div>
    </div>
  )
}

function WeeklyCalendarView({ weeklyPlan: propPlan, setWeeklyPlan, freshStart = false, onLoaded }) {
  const [plan,         setPlan]        = useState(propPlan || null)
  const [loadingPlan,  setLoadingPlan] = useState(true)
  const [swapping,     setSwapping]    = useState(null)
  const [logged,       setLogged]      = useState({})
  const [logLoading,   setLogLoading]  = useState({})
  const [dayLogging,   setDayLogging]  = useState(null)
  const [planHistory,  setPlanHistory] = useState([])
  const [showHistory,  setShowHistory] = useState(false)
  const [histLoading,  setHistLoading] = useState(false)

  useEffect(() => {
    setLoadingPlan(true)
    optimizerAPI.weeklyActive()
      .then(r => {
        const p = r.data?.plan || (r.data?.plan_id || r.data?.id ? r.data : null)
        if (p) { setPlan(p); setWeeklyPlan?.(p) }
        else if (propPlan) setPlan(propPlan)
      })
      .catch(() => { if (propPlan) setPlan(propPlan) })
      .finally(() => setLoadingPlan(false))

    import('../services/api').then(({ optimizerAPI: oapi }) => {
      oapi.weeklyHistory()
        .then(r => setPlanHistory(r.data?.plans || []))
        .catch(() => {})
    }).catch(() => {})

    // freshStart = new plan just generated → skip old logs so UI shows unlogged
    if (!freshStart) {
      optimizerAPI.todayLogs()
        .then(r => {
          const logMap = {}
          const logs = r.data?.meals || r.data?.logs || []
          logs.forEach(m => { logMap[`${m.day_num}-${m.meal_type}`] = m.id })
          setLogged(logMap)
        }).catch(() => {})
    }
    onLoaded?.()   // notify parent that freshStart is consumed
  }, [])

  // Switch to a different historical weekly plan
  const switchPlan = async (planId) => {
    setHistLoading(true); setShowHistory(false)
    try {
      const r = await optimizerAPI.weeklyById(planId)
      const p = r.data?.plan || r.data
      if (p) { setPlan(p); setWeeklyPlan?.(p) }
      // Reset logged state since it's a different plan
      setLogged({})
      // Reload today's logs for this plan
      const logsRes = await optimizerAPI.todayLogs()
      const logMap = {}
      const logs = logsRes.data?.meals || logsRes.data?.logs || []
      logs.forEach(m => { logMap[`${m.day_num}-${m.meal_type}`] = m.id })
      setLogged(logMap)
    } catch {}
    finally { setHistLoading(false) }
  }

  const toggleLog = async (meal) => {
    const key    = `${meal.day}-${meal.meal_type}`
    const logId  = logged[key]          // undefined → not logged; number → log ID
    setLogLoading(p => ({ ...p, [key]: true }))
    try {
      if (logId) {
        // Unlog using the log ID in the URL
        await optimizerAPI.unlogMeal(logId)
        setLogged(p => { const n = { ...p }; delete n[key]; return n })
      } else {
        // Log and capture the returned ID
        const res = await optimizerAPI.logMeal({
          plan_id: plan.plan_id ?? plan.id, recipe_id: meal.recipe_id,
          recipe_name: meal.recipe_name, meal_type: meal.meal_type,
          day_num: meal.day, calories: meal.calories, protein_g: meal.protein_g,
          carbs_g: meal.carbs_g, fats_g: meal.fats_g, cost_egp: meal.cost_egp,
        })
        // Backend returns { id, logged: true }
        const newId = res.data?.id || res.id || Date.now()
        setLogged(p => ({ ...p, [key]: newId }))
      }
    } catch { alert('Error logging meal') }
    finally { setLogLoading(p => ({ ...p, [key]: false })) }
  }

  // Log all meals of a given day at once
  const logAllDay = async (dayNum) => {
    if (!plan) return
    const dayMeals = (plan.meals || []).filter(m => m.day === dayNum)
    if (!dayMeals.length) return

    // ── Optimistic update ──
    setDayLogging(dayNum)
    setLogged(prev => {
      const next = { ...prev }
      dayMeals.forEach(m => {
        const key = `${m.day}-${m.meal_type}`
        if (!next[key]) next[key] = -1
      })
      return next
    })

    // ── Log to meal_logs (Daily Goals) ──
    for (const meal of dayMeals) {
      const key = `${meal.day}-${meal.meal_type}`
      if (logged[key] && logged[key] !== -1) continue
      try {
        const res = await optimizerAPI.logMeal({
          plan_id: plan.plan_id ?? plan.id, recipe_id: meal.recipe_id,
          recipe_name: meal.recipe_name, meal_type: meal.meal_type,
          day_num: meal.day, calories: meal.calories, protein_g: meal.protein_g,
          carbs_g: meal.carbs_g, fats_g: meal.fats_g, cost_egp: meal.cost_egp,
        })
        const realId = res.data?.id || res.data?.log_id || Date.now()
        setLogged(p => ({ ...p, [key]: realId }))
      } catch {
        setLogged(p => { const n = { ...p }; if (n[key] === -1) delete n[key]; return n })
      }
    }

    // ── Save to History (meal_plans) — one entry per day ──
    // Only save today's day (makes history meaningful)
    if (dayNum === currentDay) {
      const totalCal  = dayMeals.reduce((s,m) => s+(m.calories||0),  0)
      const totalProt = dayMeals.reduce((s,m) => s+(m.protein_g||0), 0)
      const totalCarb = dayMeals.reduce((s,m) => s+(m.carbs_g||0),   0)
      const totalFat  = dayMeals.reduce((s,m) => s+(m.fats_g||0),    0)
      const totalCost = dayMeals.reduce((s,m) => s+(m.cost_egp||0),  0)
      const dayName   = getDayName(dayNum) || `Day ${dayNum}`
      const authH = { 'Content-Type':'application/json',
        Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      fetch('/api/v1/optimize/add-meal', {
        method: 'POST', headers: authH,
        body: JSON.stringify({
          recipe_name: `${dayName} — ${dayMeals.map(m=>m.recipe_name).join('، ')}`,
          meal_type:   'غداء',
          calories:    Math.round(totalCal),
          protein_g:   parseFloat(totalProt.toFixed(1)),
          carbs_g:     parseFloat(totalCarb.toFixed(1)),
          fats_g:      parseFloat(totalFat.toFixed(1)),
          cost_egp:    parseFloat(totalCost.toFixed(2)),
        })
      }).catch(() => {})  // non-critical
    }

    setDayLogging(null)
  }

  const handleSwapped = (data) => {
    if (!plan) return
    // Backend may return: { new_meal, new_totals } OR the full updated plan
    if (data?.meals) {
      // Full plan returned
      setPlan(data)
      setWeeklyPlan?.(data)
      return
    }
    // Partial update
    const newMeal   = data?.new_meal
    const newTotals = data?.new_totals
    if (!newMeal) return
    const updated = {
      ...plan,
      meals: plan.meals.map(m =>
        m.day === newMeal.day && m.meal_type === newMeal.meal_type ? newMeal : m
      ),
      ...(newTotals && {
        total_cost_egp:  newTotals.cost      ?? plan.total_cost_egp,
        total_calories:  newTotals.calories  ?? plan.total_calories,
        total_protein_g: newTotals.protein   ?? plan.total_protein_g,
      }),
    }
    setPlan(updated)
    setWeeklyPlan?.(updated)
  }

  if (loadingPlan) return (
    <div className="card flex justify-center items-center" style={{minHeight:300}}>
      <Spinner size="lg"/>
    </div>
  )

  if (!plan) return (
    <div className="card flex items-center justify-center text-center" style={{minHeight:300}}>
      <div>
        <p className="text-2xl mb-2">📅</p>
        <p className="text-sm font-semibold" style={{color:'var(--text)'}}>No weekly plan yet</p>
        <p className="text-xs mt-1" style={{color:'var(--text-muted)'}}>
          Go to Meal Plan → Weekly (21) → Optimize
        </p>
      </div>
    </div>
  )

  const currentDay = plan.current_day
  const createdDate = plan.created_at ? new Date(plan.created_at).toLocaleDateString('en-EG',
    {day:'numeric', month:'short', year:'numeric'}) : ''

  return (
    <div className="space-y-4">
      {/* Plan header + history switcher */}
      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold" style={{color:'var(--text)'}}>
                📅 {plan.plan_name || 'Weekly Plan'}
              </p>
              {/* History switcher button */}
              {planHistory.length > 1 && (
                <div className="relative">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-[10px] px-2 py-1 rounded-lg font-medium flex items-center gap-1"
                    style={{background:'var(--primary-lt)', color:'var(--primary)'}}
                  >
                    🕑 {planHistory.length} plans {showHistory ? '▲' : '▼'}
                  </button>
                  {showHistory && (
                    <div className="absolute top-full left-0 mt-1 z-20 rounded-xl shadow-2xl border min-w-[220px]"
                         style={{background:'var(--bg-card)', borderColor:'var(--border)'}}>
                      {planHistory.map((p, i) => (
                        <button
                          key={p.plan_id}
                          onClick={() => switchPlan(p.plan_id)}
                          disabled={p.plan_id === plan.plan_id}
                          className="w-full text-left px-3 py-2.5 hover:opacity-80 transition-all first:rounded-t-xl last:rounded-b-xl"
                          style={{
                            background: p.plan_id === plan.plan_id ? 'var(--primary-lt)' : 'transparent',
                            borderBottom: i < planHistory.length-1 ? '1px solid var(--border)' : 'none'
                          }}
                        >
                          <p className="text-xs font-semibold" style={{color:'var(--text)'}}>
                            {i === 0 ? '⭐ ' : ''}{p.plan_name}
                            {p.plan_id === plan.plan_id ? ' ✓' : ''}
                          </p>
                          <p className="text-[10px]" style={{color:'var(--text-muted)'}}>
                            {p.meal_count} meals · {p.total_cost_egp?.toFixed(0)} EGP
                            · {new Date(p.created_at).toLocaleDateString('en-EG', {day:'numeric',month:'short'})}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{color:'var(--text-muted)'}}>
              Created {createdDate}
              {currentDay && ` · Today is Day ${currentDay}`}
            </p>
          </div>
          <div className="flex gap-3">
            {[
              {label:'Total Cost',    val:`${plan.total_cost_egp?.toFixed(0)} EGP`, color:'#4DB87A'},
              {label:'Weekly Cal',   val:`${plan.total_calories?.toFixed(0)} kcal`, color:'#f97316'},
              {label:'Avg/Day',      val:`${(plan.total_cost_egp/7).toFixed(0)} EGP`, color:'#a855f7'},
            ].map(({label,val,color}) => (
              <div key={label} className="text-center px-3 py-1.5 rounded-xl"
                   style={{background:'var(--primary-lt)'}}>
                <p className="text-sm font-black" style={{color}}>{val}</p>
                <p className="text-[9px]" style={{color:'var(--text-muted)'}}>{label}</p>
              </div>
            ))}
          </div>
        </div>
        {histLoading && (
          <p className="text-xs text-center mt-2" style={{color:'var(--text-muted)'}}>
            Loading plan...
          </p>
        )}
      </div>

      {/* Today's meals highlight */}
      {currentDay && (() => {
        const todayMeals = (plan.meals || []).filter(m => m.day === currentDay)
        if (!todayMeals.length) return null
        return (
          <div className="card" style={{border:'1px solid #4DB87A30', background:'rgba(77,184,122,0.06)'}}>
            <p className="text-xs font-bold mb-2" style={{color:'#4DB87A'}}>
              ✅ Today's Meals (Day {currentDay})
            </p>
            <div className="grid grid-cols-3 gap-2">
              {['فطار','غداء','عشاء'].map(type => {
                const meal = todayMeals.find(m => m.meal_type === type)
                return (
                  <div key={type} className="p-2 rounded-xl text-center"
                       style={{background:`${MEAL_COLORS[type]}15`}}>
                    <p className="text-[9px] font-semibold" style={{color:MEAL_COLORS[type]}}>{type}</p>
                    <p className="text-xs font-semibold mt-0.5" style={{color:'var(--text)'}}>
                      {meal?.recipe_name || '—'}
                    </p>
                    {meal && <p className="text-[9px]" style={{color:'var(--text-muted)'}}>
                      {meal.calories?.toFixed(0)} kcal
                    </p>}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* 7-day grid */}
      {Array.from({length:7},(_,i)=>i+1).map(day => {
        const meals   = (plan.meals || []).filter(m => m.day === day)
        const dayTotal= meals.reduce((s,m) => s+(m.cost_egp||0), 0)
        const isToday = day === currentDay
        return (
          <div key={day} className="card"
               style={isToday ? {border:'1px solid #4DB87A40', background:'rgba(77,184,122,0.04)'} : {}}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{background: isToday ? '#4DB87A' : 'var(--primary)', color:'#fff'}}>
                  {day}
                </span>
                <div>
                  <span className="text-sm font-semibold" style={{color:'var(--text)'}}>
                    {getDayName(day)}
                  </span>
                  {isToday && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{background:'#4DB87A20', color:'#4DB87A'}}>Today</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className="text-xs font-bold" style={{color:'var(--primary)'}}>
                    {dayTotal.toFixed(1)} EGP
                  </span>
                  {/* Calorie progress mini bar */}
                  {(() => {
                    const dayCal = meals.reduce((s,m) => s + (m.calories||0), 0)
                    const target = 2000  // could be user target
                    const pct    = Math.min(100, Math.round(dayCal/target*100))
                    const color  = pct >= 90 ? '#4DB87A' : pct >= 60 ? '#f97316' : '#ef4444'
                    return (
                      <div className="mt-0.5">
                        <div className="flex justify-between text-[9px] mb-0.5"
                             style={{color:'var(--text-muted)'}}>
                          <span>{Math.round(dayCal)} kcal</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1 rounded-full w-24" style={{background:'var(--border)'}}>
                          <div className="h-1 rounded-full transition-all"
                               style={{width:`${pct}%`, background:color}}/>
                        </div>
                      </div>
                    )
                  })()}
                </div>
                {/* Log all meals for this day */}
                {meals.length > 0 && (
                  <button
                    onClick={() => logAllDay(day)}
                    disabled={dayLogging === day}
                    className="text-[10px] font-semibold px-2 py-1 rounded-lg transition-all"
                    style={{
                      background: meals.every(m => !!logged[`${m.day}-${m.meal_type}`])
                        ? 'rgba(77,184,122,0.25)' : 'var(--primary-lt)',
                      color: meals.every(m => !!logged[`${m.day}-${m.meal_type}`])
                        ? '#4DB87A' : 'var(--primary)',
                      opacity: dayLogging === day ? 0.6 : 1,
                    }}
                    title="Log all meals of this day"
                  >
                    {dayLogging === day ? '⏳' :
                     meals.every(m => !!logged[`${m.day}-${m.meal_type}`]) ? '✅ Logged' : '✓ Log Day'}
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['فطار','غداء','عشاء'].map(mealType => {
                const meal      = meals.find(m => m.meal_type === mealType)
                const logKey    = `${day}-${mealType}`
                const isLogged  = !!logged[logKey]   // truthy when logId is stored
                const isLoading = !!logLoading[logKey]
                return (
                  <div key={mealType} className="rounded-xl p-2 text-center relative group"
                       style={{
                         background: isLogged ? `${MEAL_COLORS[mealType]}30` : meal ? `${MEAL_COLORS[mealType]}15` : 'var(--primary-lt)',
                         border: `1px solid ${meal ? MEAL_COLORS[mealType]+(isLogged?'70':'30') : 'transparent'}`
                       }}>
                    <p className="text-[9px] font-semibold mb-0.5"
                       style={{color: meal ? MEAL_COLORS[mealType] : 'var(--text-muted)'}}>
                      {mealType}
                    </p>
                    {meal ? (
                      <>
                        <p className="text-[10px] font-semibold leading-tight mb-0.5"
                           style={{color: isLogged ? '#4DB87A' : 'var(--text)'}}>
                          {meal.recipe_name}
                        </p>
                        <p className="text-[9px]" style={{color:'var(--text-muted)'}}>
                          {meal.cost_egp?.toFixed(1)} EGP · {meal.calories?.toFixed(0)} kcal
                        </p>
                        {/* Always-visible action buttons */}
                        <div className="flex gap-1 mt-1.5 justify-center">
                          <button onClick={() => toggleLog(meal)} disabled={isLoading}
                            className="flex-1 py-0.5 rounded-md text-[9px] font-bold transition-all"
                            style={{
                              background: isLogged ? '#4DB87A' : 'rgba(77,184,122,0.18)',
                              color: isLogged ? '#fff' : '#4DB87A',
                            }}
                            title={isLogged ? 'Unlog' : 'Log as eaten'}>
                            {isLoading ? '…' : isLogged ? '✓ Logged' : '✓ Log'}
                          </button>
                          <button onClick={() => setSwapping({day, mealType})}
                            className="px-2 py-0.5 rounded-md text-[9px] font-bold transition-all"
                            style={{background:'var(--primary-lt)', color:'var(--primary)'}}
                            title="Swap meal">↕</button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1 py-1">
                        <p className="text-[10px]" style={{color:'var(--text-muted)'}}>—</p>
                        <button onClick={() => setSwapping({day, mealType})}
                          className="text-[9px] px-2 py-0.5 rounded-md"
                          style={{background:'var(--primary-lt)', color:'var(--primary)'}}>
                          + Add
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Grocery list — full weekly plan */}
      <GroceryListPanel
        meals={plan.meals}
        totalCost={plan.total_cost_egp}
        defaultOpen={false}/>

      {/* Swap modal */}
      {swapping && (
        <SwapModal
          day={swapping.day}
          mealType={swapping.mealType}
          planId={plan.plan_id ?? plan.id}
          onSwapped={handleSwapped}
          onClose={() => setSwapping(null)}/>
      )}
    </div>
  )
}

// ── Accept Plan Button (single/daily) ────────────────────────────────────────
function AcceptPlanButton({ plan }) {
  const [accepted, setAccepted] = useState(false)
  const [loading,  setLoading]  = useState(false)

  const accept = async () => {
    if (accepted || loading) return
    setLoading(true)
    try {
      // Log all meals — sequential to avoid race conditions on the backend
      for (const m of (plan.meals || [])) {
        await optimizerAPI.logMeal({
          plan_id:     plan.plan_id ?? plan.id,
          recipe_id:   m.recipe_id,
          recipe_name: m.recipe_name,
          meal_type:   m.meal_type,
          day_num:     m.day || 1,
          calories:    m.calories,
          protein_g:   m.protein_g,
          carbs_g:     m.carbs_g,
          fats_g:      m.fats_g,
          cost_egp:    m.cost_egp,
        })
      }
      setAccepted(true)
    } catch { alert('Error accepting plan') }
    finally { setLoading(false) }
  }

  return (
    <button onClick={accept} disabled={accepted || loading}
      className="w-full py-3 rounded-2xl font-bold text-sm transition-all"
      style={{
        background: accepted
          ? 'rgba(77,184,122,0.2)'
          : 'linear-gradient(135deg,#1B5E38,#3A9460)',
        color: accepted ? '#4DB87A' : '#fff',
        opacity: loading ? 0.7 : 1,
      }}>
      {loading ? '⏳ Logging meals...'
       : accepted ? '✅ Plan accepted — added to Daily Goals!'
       : '✓ Accept Plan — Add to Today\'s Goals'}
    </button>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

// ── MILP vs Greedy Comparison Card ───────────────────────────────────────────
function ComparisonCard({ data, onClose }) {
  if (!data) return null
  const { milp, greedy, comparison: cmp } = data

  const Row = ({ label, milpVal, greedyVal, milpWins, unit='' }) => (
    <tr className="border-b" style={{borderColor:'var(--border)'}}>
      <td className="py-2 px-3 text-xs" style={{color:'var(--text-muted)'}}>{label}</td>
      <td className="py-2 px-3 text-center">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${milpWins ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : ''}`}>
          {milpVal}{unit} {milpWins ? '✅' : ''}
        </span>
      </td>
      <td className="py-2 px-3 text-center">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${!milpWins ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'text-red-500'}`}>
          {greedyVal}{unit} {!milpWins ? '✅' : '❌'}
        </span>
      </td>
    </tr>
  )

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold" style={{color:'var(--text)'}}>
          📊 MILP vs Greedy — مقارنة أكاديمية
        </p>
        <button onClick={onClose} className="text-xs px-2 py-1 rounded-lg"
          style={{background:'var(--border)', color:'var(--text-muted)'}}>✕</button>
      </div>

      {/* Verdict banner */}
      <div className="p-3 rounded-xl text-center"
           style={{background:'var(--primary-lt)', border:'1px solid var(--primary)30'}}>
        <p className="text-sm font-semibold" style={{color:'var(--primary)'}}>{cmp.verdict}</p>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto rounded-xl" style={{border:'1px solid var(--border)'}}>
        <table className="w-full">
          <thead>
            <tr style={{background:'var(--bg)'}}>
              <th className="py-2 px-3 text-left text-xs font-semibold" style={{color:'var(--text-muted)'}}>Metric</th>
              <th className="py-2 px-3 text-center text-xs font-bold" style={{color:'var(--primary)'}}>MILP 🧮</th>
              <th className="py-2 px-3 text-center text-xs font-bold" style={{color:'#f97316'}}>Greedy ⚡</th>
            </tr>
          </thead>
          <tbody>
            <Row label="التكلفة (EGP)"
              milpVal={milp.total_cost_egp?.toFixed(1)}
              greedyVal={greedy.total_cost_egp?.toFixed(1)}
              milpWins={cmp.milp_wins_cost} />
            <Row label="السعرات محققة؟"
              milpVal={cmp.milp_calories_met ? 'نعم' : 'لا'}
              greedyVal={cmp.greedy_calories_met ? 'نعم' : 'لا'}
              milpWins={cmp.milp_calories_met && !cmp.greedy_calories_met} />
            <Row label="البروتين محقق؟"
              milpVal={cmp.milp_protein_met ? 'نعم' : 'لا'}
              greedyVal={cmp.greedy_protein_met ? 'نعم' : 'لا'}
              milpWins={cmp.milp_protein_met && !cmp.greedy_protein_met} />
            <Row label="تنوع الفئات"
              milpVal={milp.diversity_score}
              greedyVal={greedy.diversity_score}
              milpWins={cmp.milp_wins_diversity} unit=" فئات"/>
            <Row label="وقت الحل"
              milpVal={cmp.milp_solve_ms}
              greedyVal={cmp.greedy_solve_ms}
              milpWins={cmp.milp_solve_ms <= cmp.greedy_solve_ms} unit="ms"/>
          </tbody>
        </table>
      </div>

      {/* Cost saving highlight */}
      {cmp.cost_saving_egp > 0 && (
        <div className="flex items-center justify-center gap-2 p-2 rounded-xl"
             style={{background:'#2D7A4F15', border:'1px solid #2D7A4F30'}}>
          <span className="text-lg">💰</span>
          <p className="text-sm font-bold" style={{color:'#2D7A4F'}}>
            MILP يوفّر {cmp.cost_saving_egp.toFixed(1)} EGP ({cmp.cost_saving_pct}%) عن الـ Greedy
          </p>
        </div>
      )}

      <p className="text-[10px] text-center" style={{color:'var(--text-muted)'}}>
        MILP: optimal in {cmp.milp_solve_ms}ms · Greedy: heuristic in {cmp.greedy_solve_ms}ms
      </p>
    </div>
  )
}


// ── CompareWidget — self-contained A/B comparison ────────────────────────────
function CompareWidget({ calories, protein, budget, carbsG, fatsG, maxItems }) {
  const [comparing,  setComparing]  = useState(false)
  const [comparison, setComparison] = useState(null)

  const runCompare = async () => {
    setComparing(true)
    setComparison(null)
    try {
      const res = await fetch('/api/v1/optimize/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          calories,
          protein_g:    protein,
          budget_egp:   budget,
          carbs_g:      carbsG  || 0,
          fats_g:       fatsG   || 0,
          max_items:    maxItems || 12,
          max_quantity: 500,
          min_quantity: 50,
          weekly_plan:  false,
        })
      })
      const data = await res.json()
      setComparison(data)
    } catch(e) {
      console.error('Compare failed:', e)
    } finally {
      setComparing(false)
    }
  }

  return (
    <div className="space-y-3">
      <button onClick={runCompare} disabled={comparing}
        className="w-full py-2 rounded-xl text-sm font-semibold transition-all"
        style={{background:'var(--border)', color:'var(--text)', border:'1px solid var(--border)'}}>
        {comparing ? '⏳ جاري المقارنة...' : '📊 قارن مع Greedy (للـ GP)'}
      </button>
      {comparison && !comparison.error && (
        <ComparisonCard data={comparison} onClose={() => setComparison(null)}/>
      )}
    </div>
  )
}

export default function OptimizePage() {
  const { user } = useAuthStore()
  const [mode,      setMode]     = useState('meal')
  const [budget,    setBudget]   = useState(user?.daily_budget_egp||200)
  const [calories,  setCalories] = useState(user?.daily_calories||2000)
  const [protein,   setProtein]  = useState(user?.daily_protein_g||60)
  const [planType,  setPlanType] = useState('daily')
  const [mealType,  setMealType] = useState(null)
  const [maxRepeat, setMaxRepeat]= useState(2)
  const [carbsG,    setCarbsG]   = useState(user?.daily_carbs_g||150)
  const [fatsG,     setFatsG]    = useState(user?.daily_fats_g||50)
  const [maxItems,  setMaxItems] = useState(12)
  const [result,    setResult]   = useState(null)
  const [weeklyPlan,setWeeklyPlan] = useState(null)  // persists last weekly plan for calendar
  const [weeklyPlanKey,  setWeeklyPlanKey]  = useState(0)
  const [freshWeekly,    setFreshWeekly]    = useState(false)  // skip old logs on new plan
  const [loading,   setLoading]  = useState(false)
  const [error,     setError]    = useState(null)
  const [liked,        setLiked]       = useState({})
  const [portionSizes, setPortionSizes] = useState({})  // meal_id → 0.5|1|1.5|2
  const [addedToPlan,  setAddedToPlan] = useState({})
  const [loggedToday,  setLoggedToday] = useState({})   // for Dashboard daily goals
  const [compareMeals, setCompareMeals]= useState([])
  const [detailMeal,   setDetailMeal]  = useState(null)
  const [sortBy,       setSortBy]      = useState('match')

  const PORTIONS = [
    { v: 0.5, label: '½ حجم' },
    { v: 1,   label: 'عادي'  },
    { v: 1.5, label: 'كبير'  },
    { v: 2,   label: 'كبير جداً' },
  ]

  const getPortion  = (meal) => portionSizes[meal.recipe_id||meal.recipe_name] || 1

  const scaledMeal  = (meal) => {
    const p = getPortion(meal)
    return {
      ...meal,
      calories:  (meal.calories  || 0) * p,
      protein_g: (meal.protein_g || 0) * p,
      carbs_g:   (meal.carbs_g   || 0) * p,
      fats_g:    (meal.fats_g    || 0) * p,
      cost_egp:  (meal.cost_egp  || 0) * p,
    }
  }

  const handleLike = async (meal) => {
    const id = meal.recipe_id||meal.recipe_name
    setLiked(l=>({...l,[id]:!l[id]}))
    await fetch('/api/v1/personalize/interact', {
      method:'POST', headers:authH(),
      body:JSON.stringify({ recipe_id:meal.recipe_id||0,
        recipe_name:meal.recipe_name,
        interaction_type:liked[id]?'viewed':'liked' })
    }).catch(()=>{})
  }

  // Add meal to History (meal_plans) + Daily Goals (meal_logs)
  const [addingToPlan, setAddingToPlan] = useState({})   // loading state per meal

  const handleAddToPlan = async (meal) => {
    const id = meal.recipe_id || meal.recipe_name || meal.name
    if (addedToPlan[id] || addingToPlan[id]) return

    setAddingToPlan(s => ({ ...s, [id]: true }))
    try {
      const mealData = {
        recipe_name: meal.recipe_name || meal.name,
        meal_type:   meal.meal_type   || 'غداء',
        calories:    meal.calories    || 0,
        protein_g:   meal.protein_g   || 0,
        carbs_g:     meal.carbs_g     || 0,
        fats_g:      meal.fats_g      || 0,
        cost_egp:    meal.cost_egp    || 0,
      }

      // 1. Save to meal_plans FIRST → get plan_id
      let planId = null
      try {
        const res = await addMealAPI(mealData)
        if (res?.status === 'ok' || res?.plan_id) {
          planId = res.plan_id || null
          setAddedToPlan(s => ({ ...s, [id]: true }))
        }
      } catch(e) { console.warn('addMeal failed:', e?.response?.data || e.message) }

      // 2. Log to meal_logs WITH plan_id → so delete also clears Daily Goals
      try {
        await optimizerAPI.logMeal({
          ...mealData,
          recipe_id: meal.recipe_id || null,
          day_num:   1,
          plan_id:   planId,   // ← link to meal_plan so delete removes it too
        })
      } catch(e) { console.warn('logMeal failed:', e?.response?.data || e.message) }

      setAddedToPlan(s => ({ ...s, [id]: true }))

    } finally {
      setAddingToPlan(s => ({ ...s, [id]: false }))
    }
  }

  const handleCompare = (meal) => {
    const id = meal.recipe_id||meal.recipe_name
    setCompareMeals(prev=>{
      if (prev.find(m=>(m.recipe_id||m.recipe_name)===id)) return prev.filter(m=>(m.recipe_id||m.recipe_name)!==id)
      if (prev.length>=3) return prev
      return [...prev,meal]
    })
  }

  const sortedResults = useMemo(()=>{
    const raw = result?.data?.results||[]
    let res = [...raw]
    if (sortBy==='cost')     res.sort((a,b)=>a.cost_egp-b.cost_egp)
    if (sortBy==='protein')  res.sort((a,b)=>b.protein_g-a.protein_g)
    if (sortBy==='calories') res.sort((a,b)=>a.calories-b.calories)
    return res
  },[result,sortBy])

  const optimize = async () => {
    setLoading(true); setError(null); setResult(null)
    try {
      if (mode === 'meal') {
        // Use axios (optimizerAPI) so plan_id is always in the response
        const resp = await optimizerAPI.mealPlan({ budget_egp:budget, calories, protein_g:protein,
          plan_type:planType, meal_type:planType==='single'?mealType:null, max_repeat:maxRepeat })
        const data = resp.data
        if (data.status==='infeasible') throw new Error(data.solver_message)
        setResult({ type:'meal', data })
        if (planType === 'weekly') {
          setWeeklyPlan(data)
          setWeeklyPlanKey(k => k + 1)
          setFreshWeekly(true)   // ← reset logged state in calendar
        }
      } else {
        const { data } = await optimizerAPI.plan({ budget_egp:budget, calories, protein_g:protein,
          carbs_g:carbsG, fats_g:fatsG, max_items:maxItems })
        if (data.status==='infeasible') throw new Error(data.solver_message)
        setResult({ type:'ingredient', data })
      }
    } catch(e) { setError(e.message||'Failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="page-enter space-y-6">
      <SectionHeader title="Meal Optimizer" subtitle="MILP-powered minimum-cost nutrition planning" />

      {/* Mode tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {MODES.map(m=>(
          <button key={m.key} onClick={()=>{ setMode(m.key); setResult(null); setError(null) }}
            className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all
                        ${mode===m.key?'border-[#2D7A4F] bg-orange-50 dark:bg-[#2D7A4F]/10':'border-slate-200 dark:border-[#143D22] hover:border-orange-300'}`}>
            <div className={`p-2 rounded-xl shrink-0 ${mode===m.key?'bg-green-100 dark:bg-[#2D7A4F]/20':'bg-slate-100 dark:bg-[#134d26]'}`}>
              <m.icon className={`w-4 h-4 ${mode===m.key?'text-[#2D7A4F] dark:text-[#2D7A4F] dark:text-[#4DB87A]':'text-slate-400'}`}/>
            </div>
            <div>
              <p className={`text-sm font-semibold ${mode===m.key?'text-orange-700 dark:text-orange-300':'text-slate-700 dark:text-green-100'}`}>{m.label}</p>
              <p className="text-xs text-slate-500 dark:text-[#56A870] mt-0.5">{m.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Controls */}
        <div className="space-y-4">
          {mode==='search' && <MealSearchPanel onResult={d=>setResult({type:'search',data:d})} />}
          {mode==='calendar' && (
            <div className="card">
              <p className="text-sm font-bold mb-2" style={{color:'var(--text)'}}>📅 Weekly Calendar</p>
              <p className="text-xs mb-4" style={{color:'var(--text-muted)'}}>
                Your weekly meal schedule. Generate a weekly plan first from Meal Plan tab.
              </p>
              {weeklyPlan ? (
                <div className="space-y-2">
                  <div className="p-3 rounded-xl" style={{background:'var(--primary-lt)'}}>
                    <p className="text-xs font-semibold" style={{color:'var(--primary)'}}>Last Weekly Plan</p>
                    <p className="text-xs mt-1" style={{color:'var(--text-muted)'}}>
                      {weeklyPlan.total_meals} meals · {weeklyPlan.total_cost_egp?.toFixed(0)} EGP
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl text-center" style={{background:'var(--primary-lt)'}}>
                  <p className="text-xs" style={{color:'var(--text-muted)'}}>
                    No weekly plan yet. Go to Meal Plan → Weekly (21) → Optimize
                  </p>
                </div>
              )}
            </div>
          )}

          {(mode==='meal') && (
            <Card>
              <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Constraints</h3>
              <div className="space-y-4">
                {/* Goal presets */}
                <GoalPresets user={user} planType={planType} onApply={({ budget: b, calories: c, protein: p, carbs, fats }) => {
                  const mult = planType === 'weekly' ? 7 : 1
                  setBudget(b * mult); setCalories(c * mult); setProtein(p * mult)
                  if (carbs > 0) setCarbsG(carbs * mult)
                  if (fats  > 0) setFatsG(fats   * mult)
                }}/>
                <Slider label="Budget"   unit="EGP"  value={budget}   min={10}  max={planType==='weekly'?10000:1000} step={10}  onChange={setBudget}/>
                <Slider label="Calories" unit="kcal" value={calories} min={500} max={planType==='weekly'?50000:6000} step={100} onChange={setCalories}/>
                <Slider label="Protein"  unit="g"    value={protein}  min={10}  max={planType==='weekly'?3000:400}   step={5}   onChange={setProtein}/>

                {mode==='meal' && (
                  <>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Plan Type</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {PLAN_TYPES.map(pt=>(
                          <button key={pt.key} onClick={()=>{
                            const newType = pt.key
                            // Auto-scale macros when switching daily ↔ weekly
                            if (newType === 'weekly' && planType !== 'weekly') {
                              setBudget(b   => Math.round(b   * 7 / 10)  * 10)
                              setCalories(c => Math.round(c   * 7 / 100) * 100)
                              setProtein(p  => Math.round(p   * 7 / 5)   * 5)
                              if (carbsG > 0) setCarbsG(v => Math.round(v * 7 / 10) * 10)
                              if (fatsG  > 0) setFatsG(v  => Math.round(v * 7 / 5)  * 5)
                            } else if (newType !== 'weekly' && planType === 'weekly') {
                              setBudget(b   => Math.max(10,  Math.round(b   / 7 / 10)  * 10))
                              setCalories(c => Math.max(500, Math.round(c   / 7 / 100) * 100))
                              setProtein(p  => Math.max(10,  Math.round(p   / 7 / 5)   * 5))
                              if (carbsG > 0) setCarbsG(v => Math.max(0, Math.round(v / 7 / 10) * 10))
                              if (fatsG  > 0) setFatsG(v  => Math.max(0, Math.round(v / 7 / 5)  * 5))
                            }
                            setPlanType(newType)
                          }}
                            className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-medium border-2 transition-all
                                        ${planType===pt.key?'border-[#2D7A4F] bg-orange-50 dark:bg-[#2D7A4F]/10 text-[#2D7A4F]':'border-slate-200 dark:border-[#143D22] text-slate-500 hover:border-orange-300'}`}>
                            <pt.icon className="w-4 h-4"/>{pt.label}
                          </button>
                        ))}
                      </div>
                      {/* Weekly hint — shows daily equivalent */}
                      {planType === 'weekly' && (
                        <p className="text-[10px] mt-2 text-center"
                           style={{color:'var(--text-muted)'}}>
                          يوميًا: <span style={{color:'var(--primary)'}}>
                            {Math.round(budget/7)} EGP · {Math.round(calories/7)} kcal · {Math.round(protein/7)}g protein
                          </span>
                          <span className="ml-1 opacity-60">(قابل للتعديل ↑)</span>
                        </p>
                      )}
                    </div>
                    {planType==='single' && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Meal Type</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {MEAL_TYPES.map(mt=>(
                            <button key={String(mt.key)} onClick={()=>setMealType(mt.key)}
                              className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all
                                          ${mealType===mt.key?'border-[#2D7A4F] bg-orange-50 dark:bg-[#2D7A4F]/10 text-[#2D7A4F]':'border-slate-200 dark:border-[#143D22] text-slate-500 hover:border-orange-300'}`}>
                              {mt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <Slider label="Max Repeat" unit="×" value={maxRepeat} min={1} max={7} step={1} onChange={setMaxRepeat}/>
                  </>
                )}

                {mode==='ingredient' && (
                  <>
                    <Slider label="Min Carbs" unit="g" value={carbsG} min={0} max={500} step={10} onChange={setCarbsG}/>
                    <Slider label="Min Fats"  unit="g" value={fatsG}  min={0} max={200} step={5}  onChange={setFatsG}/>
                    <Slider label="Max Items" unit=""   value={maxItems} min={3} max={20} step={1} onChange={setMaxItems}/>
                    <p className="text-[10px] mt-1" style={{color:'var(--text-muted)'}}>
                      💡 Tip: set Min Carbs & Fats from your Smart Profile targets for best results
                    </p>
                  </>
                )}
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-[#143D22]">
                <Button variant="primary" className="w-full" onClick={optimize} loading={loading} icon={<Zap className="w-4 h-4"/>}>
                  {loading ? 'Solving...' : 'Optimize'}
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {error && <Alert type="error" message={error}/>}

          {!result && !loading && (
            <Card className="py-16 text-center">
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-[#134d26]/60 w-fit mx-auto mb-4">
                {mode==='search'?<Search className="w-8 h-8 text-slate-300 dark:text-slate-500"/>:<Zap className="w-8 h-8 text-slate-300 dark:text-slate-500"/>}
              </div>
              <p className="font-semibold text-slate-600 dark:text-[#56A870] mb-1">
                {mode==='search'?'Search for a meal by name':'Ready to optimize'}
              </p>
              <p className="text-sm text-slate-400">
                {mode==='search'?'Type a meal name + optional budget or protein':'Set constraints and click Optimize'}
              </p>
            </Card>
          )}

          {loading && (
            <Card className="py-16 flex flex-col items-center gap-3">
              <Spinner size="lg"/>
              <p className="text-sm text-slate-500">{mode==='search'?'🔍 Searching...':'⚡ CBC solver running...'}</p>
            </Card>
          )}

          {/* Search results */}
          {result?.type==='search' && (
            <>
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold" style={{color:'var(--text)'}}>🔍 Matches for "{result.data.query}"</h3>
                  <p className="text-xs" style={{color:'var(--text-muted)'}}>{sortedResults.length} results</p>
                </div>
                <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
                  className="text-xs px-2 py-1.5 rounded-xl border outline-none"
                  style={{background:'var(--bg-card)',borderColor:'var(--border)',color:'var(--text)'}}>
                  <option value="match">Best Match</option>
                  <option value="cost">Cheapest</option>
                  <option value="protein">Most Protein</option>
                  <option value="calories">Lowest Cal</option>
                </select>
              </div>
              {/* Compare bar */}
              {compareMeals.length>=2 && (
                <div className="mb-3 rounded-2xl overflow-hidden border" style={{borderColor:'var(--primary)'}}>
                  <div className="flex items-center gap-2 p-3" style={{background:'var(--primary)',color:'#fff'}}>
                    <Scale className="w-4 h-4"/>
                    <span className="text-sm font-semibold">{compareMeals.length} meals selected</span>
                    <button onClick={()=>setDetailMeal(m=>m==='compare'?null:'compare')}
                      className="ml-auto px-3 py-1.5 rounded-xl text-xs font-bold bg-white/25 hover:bg-white/40">
                      {detailMeal==='compare'?'Hide ▲':'Compare Now ▼'}
                    </button>
                    <button onClick={()=>{setCompareMeals([]);setDetailMeal(null)}}><X className="w-4 h-4"/></button>
                  </div>
                  {detailMeal==='compare' && (
                    <div className="p-4 overflow-x-auto" style={{background:'var(--bg-card)'}}>
                      <table className="w-full text-sm">
                        <thead><tr style={{borderBottom:'2px solid var(--border)'}}>
                          <td className="pb-3 pr-4 text-xs font-semibold" style={{color:'var(--text-muted)'}}>Metric</td>
                          {compareMeals.map((m,i)=>(
                            <td key={i} className="pb-3 text-center font-bold text-xs" style={{color:'var(--text)'}}>
                              {m.recipe_name}
                              <button onClick={()=>setCompareMeals(p=>p.filter((_,j)=>j!==i))} className="block text-[10px] mx-auto" style={{color:'var(--text-muted)'}}>remove ×</button>
                            </td>
                          ))}
                        </tr></thead>
                        <tbody>
                          {[
                            {key:'cost_egp',  label:'💰 Cost',    fmt:v=>`${v?.toFixed(1)} EGP`, best:'min'},
                            {key:'calories',  label:'🔥 Calories',fmt:v=>`${v?.toFixed(0)} kcal`, best:'min'},
                            {key:'protein_g', label:'💪 Protein', fmt:v=>`${v?.toFixed(1)}g`,     best:'max'},
                            {key:'similarity',label:'🎯 Match',   fmt:v=>`${(v*100).toFixed(0)}%`,best:'max'},
                          ].map(row=>{
                            const vals=compareMeals.map(m=>parseFloat(m[row.key])||0)
                            const best=row.best==='min'?Math.min(...vals):Math.max(...vals)
                            return (<tr key={row.key} style={{borderBottom:'1px solid var(--border)'}}>
                              <td className="py-2.5 pr-4 text-xs" style={{color:'var(--text-muted)'}}>{row.label}</td>
                              {compareMeals.map((m,i)=>{
                                const val=parseFloat(m[row.key])||0
                                return (<td key={i} className="py-2.5 text-center">
                                  <span className="px-2 py-0.5 rounded-lg text-xs font-bold"
                                    style={val===best?{background:'var(--primary)',color:'#fff'}:{color:'var(--text)'}}>
                                    {row.fmt(m[row.key])}
                                  </span>
                                </td>)
                              })}
                            </tr>)
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-3">
                {sortedResults.map((meal,i)=>{
                  const mealId = meal.recipe_id||meal.recipe_name
                  const portion = getPortion(meal)
                  const scaled  = scaledMeal(meal)
                  return (
                  <div key={i} className={`p-4 rounded-xl border-2 transition-all
                                          ${i===0?'border-orange-300 dark:border-orange-700 bg-orange-50/30 dark:bg-[#2D7A4F]/5':'border-slate-100 dark:border-[#143D22]'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {i===0 && <span className="text-[10px] bg-[#2D7A4F] text-white px-2 py-0.5 rounded-full font-semibold">Best Match</span>}
                          <p className="font-semibold text-slate-800 dark:text-white">{meal.recipe_name}</p>
                        </div>
                        <p className="text-xs text-slate-400">
                          {meal.meal_type} · {meal.prep_time}min ·
                          <span className="font-mono ml-1">{(meal.similarity*100).toFixed(0)}% match</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-sm font-bold text-[#2D7A4F] dark:text-[#4DB87A]">
                          {scaled.cost_egp.toFixed(1)} EGP
                          {portion!==1 && <span className="ml-1 text-[10px] font-normal opacity-60">×{portion}</span>}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {scaled.calories.toFixed(0)} kcal · {scaled.protein_g.toFixed(1)}g
                        </p>
                      </div>
                    </div>
                    {/* Portion Size */}
                    <div className="mt-3 mb-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                         style={{color:'var(--text-muted)'}}>Portion Size</p>
                      <div className="flex gap-1.5">
                        {PORTIONS.map(({v,label})=>(
                          <button key={v} onClick={()=>setPortionSizes(s=>({...s,[mealId]:v}))}
                            className="flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all"
                            style={portion===v
                              ?{background:'var(--primary)',color:'#fff'}
                              :{background:'var(--primary-lt)',color:'var(--primary)',border:'1px solid var(--border)'}}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                      <button onClick={()=>handleLike(meal)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                        style={liked[mealId]
                          ?{background:'#ec4899',color:'#fff',borderColor:'#ec4899'}
                          :{background:'var(--bg)',borderColor:'var(--border)',color:'var(--text-muted)'}}>
                        <Heart className="w-3 h-3" fill={liked[mealId]?'currentColor':'none'}/>
                        {liked[mealId]?'❤️ Liked':'Like'}
                      </button>
                      <button onClick={()=>handleAddToPlan(scaled)}
                        disabled={addedToPlan[mealId]||addingToPlan[mealId]}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                        style={addedToPlan[mealId]
                          ?{background:'var(--primary)',color:'#fff',borderColor:'var(--primary)'}
                          :{background:'var(--bg)',borderColor:'var(--border)',color:'var(--text-muted)'}}>
                        {addingToPlan[mealId]
                          ?<><span className="animate-spin">⏳</span> Adding...</>
                          :addedToPlan[mealId]
                          ?<><CheckCircle2 className="w-3 h-3"/> Added to Goals!</>
                          :<><BookmarkPlus className="w-3 h-3"/> Add to Today{portion!==1?` (×${portion})`:''}</>}
                      </button>
                      <button onClick={()=>handleCompare(meal)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                        style={compareMeals.find(m=>(m.recipe_id||m.recipe_name)===mealId)
                          ?{background:'#8b5cf6',color:'#fff',borderColor:'#8b5cf6'}
                          :{background:'var(--bg)',borderColor:'var(--border)',color:'var(--text-muted)'}}>
                        <Scale className="w-3 h-3"/> Compare
                      </button>
                    </div>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {result.data.budget_filter && (
                        <Badge variant={meal.cost_egp<=result.data.budget_filter?'green':'red'}>
                          {meal.cost_egp<=result.data.budget_filter?'✅':'❌'} Budget
                        </Badge>
                      )}
                      {result.data.protein_filter && (
                        <Badge variant={meal.protein_g>=result.data.protein_filter?'green':'red'}>
                          {meal.protein_g>=result.data.protein_filter?'✅':'❌'} Protein
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {meal.ingredients?.map((ing,j)=>(
                        <div key={j}
                          className="flex-shrink-0 bg-slate-100 dark:bg-[#134d26]/80
                                     rounded-xl px-3 py-2 border border-slate-200
                                     dark:border-[#1a4d2c] min-w-[130px] max-w-[180px]">

                          {/* Ingredient name */}
                          <p className="font-semibold text-slate-800 dark:text-white
                                        text-[11px] leading-tight truncate">
                            {ing.display_name || ing.name}
                          </p>

                          {/* Product used */}
                          {ing.product_name && (
                            <p className="text-[9px] text-slate-400 truncate mt-0.5 leading-tight">
                              📦 {ing.product_name}
                              {ing.source && ing.source !== 'Estimated' && (
                                <span className="ml-1 text-[#2D7A4F] dark:text-[#4DB87A]">· {ing.source}</span>
                              )}
                              {ing.source === 'Estimated' && (
                                <span className="ml-1 text-yellow-500">· est.</span>
                              )}
                            </p>
                          )}

                          <div className="mt-1.5 pt-1.5 border-t border-slate-200 dark:border-[#1a4d2c]">
                            {/* Used amount + recipe cost */}
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-slate-500">{ing.weight_g}g</span>
                              <span className="text-[11px] font-bold text-[#2D7A4F] dark:text-[#4DB87A]">
                                {ing.cost_egp > 0 ? `${ing.cost_egp.toFixed(1)} EGP` : '—'}
                              </span>
                            </div>

                            {/* Pack price + servings */}
                            {ing.pack_price_egp > 0 && (
                              <div className="mt-1 space-y-0.5">
                                <p className="text-[9px] text-slate-400">
                                  Pack: {ing.pack_weight_g}g ={' '}
                                  <span className="text-slate-500 font-medium">
                                    {ing.pack_price_egp.toFixed(1)} EGP
                                  </span>
                                </p>
                                {ing.pack_servings > 1 && (
                                  <p className="text-[9px] text-emerald-500 font-medium">
                                    🍽️ {ing.pack_servings} servings/pack
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {meal.ingredients?.length>5 && <span className="text-[10px] text-slate-400">+{meal.ingredients.length-5}</span>}
                    </div>
                    {/* Grocery list for THIS meal */}
                    <GroceryListPanel
                      meals={[meal]}
                      totalCost={meal.cost_egp}
                      defaultOpen={false}/>
                  </div>
                )})}
              </div>
            </Card>

            {/* Protein suggestions when filter not met */}
            {result?.data?.protein_suggestions?.length > 0 && (
              <Card className="border-blue-200 dark:border-blue-800/40">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <span className="text-blue-500 text-sm">💪</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-white text-sm">
                      Protein Boost Suggestions
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-[#56A870]">
                      Best match has{' '}
                      <span className="text-red-400 font-semibold">{result.data.protein_gap_g}g less protein</span>
                      {' '}than your target — add one of these:
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {result.data.protein_suggestions.map((s, i) => (
                    <div key={i}
                      className="flex items-center justify-between p-3 rounded-xl
                                 bg-slate-50 dark:bg-[#134d26]/40
                                 border border-slate-100 dark:border-[#143D22]
                                 hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base shrink-0">
                          {i===0?'🥇':i===1?'🥈':'🥉'}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-white">
                            {s.category} {s.display_name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-[#56A870] mt-0.5">
                            Add{' '}
                            <span className="font-mono text-blue-400 font-semibold">{s.grams_to_add}g</span>
                            {' → '}
                            <span className="text-emerald-500 font-semibold">+{s.protein_added_g}g protein</span>
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {s.protein_per_100g}g prot/100g ·{' '}
                            <span className="text-[#2D7A4F] dark:text-[#4DB87A]">{s.protein_per_egp?.toFixed(1)} g/EGP</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-sm font-bold text-[#2D7A4F] dark:text-[#4DB87A]">+{s.cost_to_add_egp?.toFixed(1)} EGP</p>
                        <p className="text-[10px] text-slate-400">{s.price_per_100g?.toFixed(1)} EGP/100g</p>
                        {i === 0 && (
                          <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-semibold block mt-0.5">
                            Best value 💚
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 text-center mt-3">
                  Ranked by protein value (g protein per EGP spent)
                </p>
              </Card>
            )}
            </>
          )}

          {/* Weekly Calendar tab */}
          {mode === 'calendar' && (
            <WeeklyCalendarView key={weeklyPlanKey} weeklyPlan={weeklyPlan} setWeeklyPlan={setWeeklyPlan} freshStart={freshWeekly} onLoaded={()=>setFreshWeekly(false)}/>
          )}

          {/* Meal plan results */}
          {result?.type==='meal' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Cost"    value={result.data.total_cost_egp?.toFixed(0)}  unit="EGP"  icon={null} color="green"/>
                <StatCard label="Cal"     value={result.data.total_calories?.toFixed(0)}  unit="kcal" icon={null} color="emerald"/>
                <StatCard label="Protein" value={result.data.total_protein_g?.toFixed(0)} unit="g"    icon={null} color="blue"/>
                <StatCard label="Meals"   value={result.data.total_meals}                             icon={null} color="violet"/>
              </div>
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-800 dark:text-white">Summary</h3>
                  <div className="flex gap-2">
                    <Badge variant={result.data.calories_met?'green':'red'}>{result.data.calories_met?'✅ Cal':'❌ Cal'}</Badge>
                    <Badge variant={result.data.protein_met?'green':'red'}>{result.data.protein_met?'✅ Protein':'❌ Protein'}</Badge>
                  </div>
                </div>
                <div className="space-y-2.5 mb-3">
                  <MacroBar label="Budget Used" value={result.data.budget_used_pct} max={100} unit="%" color="green"/>
                  <MacroBar label="Calories"    value={result.data.total_calories}  max={calories*1.1} unit=" kcal" color="emerald"/>
                  <MacroBar label="Protein"     value={result.data.total_protein_g} max={protein*1.1}  unit="g"     color="blue"/>
                </div>
                <p className="text-xs text-slate-400 text-center font-mono">{result.data.solver_message}</p>
              </Card>

              {/* Accept Plan button — single/daily only */}
              {result.data.plan_type !== 'weekly' && result.data.plan_id && (
                <AcceptPlanButton plan={result.data}/>
              )}

              {/* Macro Distribution Donut */}
              {result.data.total_protein_g > 0 && (
                <MacroDonut
                  protein_g={result.data.total_protein_g}
                  carbs_g={result.data.total_carbs_g}
                  fats_g={result.data.total_fats_g}
                />
              )}

              {/* Sensitivity Analysis */}
              <SensitivityAnalysis
                result={result}
                budget={budget}
                calories={calories}
                protein={protein}
              />

              {/* A/B Compare button — self-contained with local state */}
              {result.data?.status !== 'infeasible' && planType !== 'weekly' && (
                <CompareWidget
                  calories={calories} protein={protein} budget={budget}
                  carbsG={carbsG} fatsG={fatsG} maxItems={maxItems}
                />
              )}

              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-800 dark:text-white">
                    {result.data.plan_type==='weekly'?'📅 7-Day Plan':result.data.plan_type==='daily'?'☀️ Daily Meals':'🍽️ Selected Meal'}
                    <span className="text-slate-400 font-normal text-sm ml-2">({result.data.total_meals} meals)</span>
                  </h3>
                  {result.data.plan_type === 'single' && (
                    <p className="text-[10px]" style={{color:'var(--text-muted)'}}>
                      Click ✓ to add meal to Today's Goals + History
                    </p>
                  )}
                </div>
                <div className="space-y-2.5">
                  {result.data.meals?.map((meal,i) => (
                    <div key={i}>
                      <MealCard meal={meal} index={i}/>
                      {/* Grocery list for THIS meal only */}
                      <GroceryListPanel
                        meals={[meal]}
                        totalCost={meal.cost_egp}
                        defaultOpen={false}/>
                      {/* Add to Today button — for single/daily individual meals */}
                      {result.data.plan_type !== 'weekly' && (
                        <button
                          onClick={() => handleAddToPlan(meal)}
                          disabled={addedToPlan[meal.recipe_id||meal.recipe_name]||addingToPlan[meal.recipe_id||meal.recipe_name]}
                          className="mt-1.5 w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                          style={addedToPlan[meal.recipe_id||meal.recipe_name]
                            ? {background:'rgba(77,184,122,0.2)', color:'#4DB87A', border:'1px solid #4DB87A40'}
                            : {background:'var(--primary-lt)', color:'var(--primary)', border:'1px solid var(--border)'}}>
                          {addingToPlan[meal.recipe_id||meal.recipe_name]
                            ? '⏳ Adding...'
                            : addedToPlan[meal.recipe_id||meal.recipe_name]
                            ? '✅ Added to History & Daily Goals'
                            : '✓ Add to Today\'s Goals + History'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
              {/* Summary grocery for daily/weekly plans */}
              {result.data.plan_type !== 'single' && (
                <GroceryListPanel
                  meals={result.data.meals}
                  totalCost={result.data.total_cost_egp}
                  defaultOpen={false}/>
              )}
            </>
          )}

          {/* Ingredient results — Enhanced Grocery List */}
          {result?.type==='ingredient' && (() => {
            const items = result.data.items || []

            // ── Category grouping ─────────────────────────────────────────
            const CATEGORY_MAP = {
              'Meat & Poultry': ['beef','chicken','lamb','fish','shrimp','liver','kofta','ground_beef','minced_beef','ground_lamb','chicken_breast','chicken_thigh','chicken_whole','beef_steak','beef_cubes','tilapia','salmon','tuna_canned','sujuk','beef_sausage'],
              'Dairy & Eggs':   ['eggs','milk','butter','yogurt','cheese','mozzarella','cream','white_cheese','labneh','cream_cheese','condensed_milk','ghee'],
              'Vegetables':     ['tomato','onion','garlic','potato','eggplant','zucchini','carrot','spinach','bell_pepper','green_pepper','cucumber','mushroom','peas','okra','cauliflower','broccoli','leek','celery','lettuce','cabbage','fresh_molokhia','frozen_molokhia','mixed_vegetables'],
              'Fruits':         ['lemon','orange','ripe_banana','blueberries','avocado','mixed_fruits'],
              'Grains & Bread': ['rice','pasta','lentils','chickpeas','flour','bread','bread_baladi','toast_bread','burger_bun','pizza_dough','phyllo_dough','kunafa_dough','bulgur','spaghetti','foul','foul_medames'],
              'Oils & Sauces':  ['vegetable_oil','olive_oil','oil','tahini','mayonnaise','ketchup','hot_sauce','vinegar','soy_sauce','tomato_sauce','tomato_paste','garlic_sauce','bechamel','salsa'],
              'Spices & Herbs': ['salt','black_pepper','cumin','paprika','turmeric','cinnamon','allspice','cardamom','ginger','chili','bay_leaves','parsley','coriander','mint','dill','spices','mixed_spices','zaatar','sumac'],
              'Nuts & Sweets':  ['almonds','walnuts','pine_nuts','sesame','peanuts','nuts','honey','sugar','chocolate','vanilla','sugar_syrup','qater','raisins','coconut'],
            }
            const getCat = (key) => {
              if (!key) return 'Other'
              const k = key.toLowerCase().replace(/-/g,'_').replace(/\s/g,'_')
              // 1. Exact match
              for (const [cat, keys] of Object.entries(CATEGORY_MAP))
                if (keys.includes(k)) return cat
              // 2. Key starts with category key (e.g. "tomato_paste" starts with "tomato_paste")
              for (const [cat, keys] of Object.entries(CATEGORY_MAP))
                if (keys.some(ck => k === ck || k.startsWith(ck + '_') || ck.startsWith(k + '_'))) return cat
              return 'Other'
            }
            const CAT_ICONS = {
              'Meat & Poultry':'🥩','Dairy & Eggs':'🥛','Vegetables':'🥦',
              'Fruits':'🍋','Grains & Bread':'🍞','Oils & Sauces':'🫙',
              'Spices & Herbs':'🌿','Nuts & Sweets':'🍯','Other':'📦'
            }

            // Group items
            const grouped = {}
            items.forEach(item => {
              const cat = getCat(item.ingredient_key) !== 'Other'
                ? getCat(item.ingredient_key)
                : getCat(item.product_name?.toLowerCase())
              if (!grouped[cat]) grouped[cat] = []
              grouped[cat].push(item)
            })

            // Pack size calc
            const packsNeeded = (qg, unitWg) => {
              if (!unitWg || unitWg <= 0) return null
              return Math.ceil(qg / unitWg)
            }

            // Export as text
            const exportList = () => {
              let txt = '🛒 NutriBudget Grocery List\n'
              txt += `Total: ${result.data.total_cost_egp?.toFixed(0)} EGP | ${result.data.total_calories?.toFixed(0)} kcal | ${result.data.total_protein_g?.toFixed(0)}g protein\n\n`
              Object.entries(grouped).forEach(([cat, catItems]) => {
                txt += `── ${cat} ──\n`
                catItems.forEach(item => {
                  const packs = packsNeeded(item.quantity_g, item.unit_weight_g)
                  txt += `• ${item.product_name}  ${item.quantity_g}g`
                  if (packs) txt += `  (${packs} pack${packs>1?'s':''})`
                  txt += `  →  ${item.cost_egp?.toFixed(1)} EGP\n`
                })
                txt += '\n'
              })
              navigator.clipboard.writeText(txt).then(() => alert('✅ Copied to clipboard!'))
            }

            return (
              <>
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label="Cost"    value={result.data.total_cost_egp?.toFixed(0)}  unit="EGP"  icon={null} color="green"/>
                  <StatCard label="Cal"     value={result.data.total_calories?.toFixed(0)}  unit="kcal" icon={null} color="emerald"/>
                  <StatCard label="Protein" value={result.data.total_protein_g?.toFixed(0)} unit="g"    icon={null} color="blue"/>
                  <StatCard label="Used"    value={result.data.budget_used_pct?.toFixed(0)} unit="%"    icon={null} color="violet"/>
                </div>

                {/* Header + Export */}
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold" style={{color:'var(--text)'}}>
                    🛒 Grocery List — {items.length} ingredients
                  </p>
                  <button onClick={exportList}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium transition-all hover:opacity-80"
                    style={{background:'var(--primary-lt)', color:'var(--primary)'}}>
                    📋 Copy List
                  </button>
                </div>

                {/* Grouped Cards */}
                {Object.entries(grouped).map(([cat, catItems]) => (
                  <div key={cat} className="card">
                    {/* Category Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{CAT_ICONS[cat]}</span>
                        <span className="text-sm font-bold" style={{color:'var(--text)'}}>{cat}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                              style={{background:'var(--primary-lt)', color:'var(--primary)'}}>
                          {catItems.length}
                        </span>
                      </div>
                      <span className="text-xs font-semibold" style={{color:'var(--primary)'}}>
                        {catItems.reduce((s,i) => s + (i.cost_egp||0), 0).toFixed(1)} EGP
                      </span>
                    </div>

                    {/* Items */}
                    <div className="space-y-2">
                      {catItems.map((item, i) => {
                        const packs    = packsNeeded(item.quantity_g, item.unit_weight_g)
                        // Actual pack price = price_per_100g * unit_weight_g / 100
                        const actualPackPrice = item.unit_weight_g > 0
                          ? ((item.price_per_100g * item.unit_weight_g) / 100).toFixed(1)
                          : null
                        return (
                          <div key={i} className="flex items-start justify-between gap-3 p-2.5 rounded-xl"
                               style={{background:'var(--primary-lt)'}}>
                            {/* Left: name + macros */}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate" style={{color:'var(--text)'}}>
                                {item.product_name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-[10px]" style={{color:'var(--text-muted)'}}>
                                  {item.quantity_g}g
                                </span>
                                <span className="text-[10px]" style={{color:'#f97316'}}>
                                  {item.calories?.toFixed(0)} kcal
                                </span>
                                <span className="text-[10px]" style={{color:'#3b82f6'}}>
                                  {item.protein_g?.toFixed(1)}g prot
                                </span>
                                {item.source && (
                                  <span className="text-[9px] px-1 py-0.5 rounded font-medium"
                                        style={{
                                          background: item.source === 'Estimated' ? 'rgba(245,158,11,0.15)' : 'rgba(77,184,122,0.15)',
                                          color:      item.source === 'Estimated' ? '#f59e0b' : '#4DB87A'
                                        }}>
                                    {item.source}
                                  </span>
                                )}
                              </div>
                              {/* XAI — why was this ingredient chosen? */}
                              {result.data?.explanations?.[item.ingredient_key] && (
                                <p className="text-[10px] mt-1 italic"
                                   style={{color:'var(--primary)', opacity:0.75}}>
                                  💡 {result.data.explanations[item.ingredient_key]}
                                </p>
                              )}
                            </div>

                            {/* Right: cost + pack info */}
                            <div className="text-right shrink-0">
                              <p className="text-sm font-black" style={{color:'var(--primary)'}}>
                                {item.cost_egp?.toFixed(1)} EGP
                              </p>
                              {packs && actualPackPrice && item.unit_weight_g > 0 && (
                                <p className="text-[10px]" style={{color:'var(--text-muted)'}}>
                                  Buy {packs} × {item.unit_weight_g}g pack = {actualPackPrice} EGP
                                </p>
                              )}
                              {item.unit_weight_g > 0 && (
                                <p className="text-[9px]" style={{color:'var(--text-muted)'}}>
                                  Pack: {item.unit_weight_g}g
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {/* Summary footer */}
                <div className="card flex items-center justify-between">
                  <div className="space-y-1">
                    {Object.entries(grouped).map(([cat, catItems]) => (
                      <div key={cat} className="flex items-center gap-2 text-xs">
                        <span>{CAT_ICONS[cat]}</span>
                        <span style={{color:'var(--text-muted)'}}>{cat}</span>
                        <span className="font-semibold" style={{color:'var(--primary)'}}>
                          {catItems.reduce((s,i) => s + (i.cost_egp||0), 0).toFixed(1)} EGP
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="text-right">
                    <p className="text-xs" style={{color:'var(--text-muted)'}}>Total</p>
                    <p className="text-xl font-black" style={{color:'var(--primary)'}}>
                      {result.data.total_cost_egp?.toFixed(1)} EGP
                    </p>
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
