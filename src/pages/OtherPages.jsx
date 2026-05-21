import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert, Salad, User, Mail, ShieldCheck, Target, Zap, Beef, Wheat, Droplets, Wallet, Save, CheckCircle, ChevronRight, Trash2, Star, MessageSquare, X } from 'lucide-react'
import { personalizeAPI, matchAPI, userAPI, optimizerAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { Badge, Spinner, Alert, SectionHeader, StatCard, Card, Button } from '../components/UI'

// ── Admin Guard component ─────────────────────────────────────────────────────
function AdminGuard({ children }) {
  const { user } = useAuthStore()
  const navigate  = useNavigate()
  if (user?.is_admin) return children
  return (
    <div className="page-enter flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="p-5 rounded-2xl bg-red-50 dark:bg-red-900/20 mb-4">
        <ShieldAlert className="w-10 h-10 text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Admin Access Required</h2>
      <p className="text-sm text-slate-500 dark:text-green-200/60 max-w-xs mb-6">
        This page is restricted to administrators only.
      </p>
      <Button variant="outline" onClick={() => navigate('/dashboard')}>← Back to Dashboard</Button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PersonalizePage  (public)
// ─────────────────────────────────────────────────────────────────────────────
export function PersonalizePage() {
  const [form, setForm] = useState({
    budget_egp: 200, calories: 2000, protein_g: 60,
    carbs_g: 0, fats_g: 0, diversity_boost: 0.3,
    avoid_repeated: true, weekly_plan: false,
  })
  const [result,   setResult]   = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [feedback, setFeedback] = useState({ rating: 4, liked_items: [], notes: '' })
  const [fbSent,   setFbSent]   = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    setLoading(true); setError(null); setResult(null); setFbSent(false)
    try { const { data } = await personalizeAPI.plan(form); setResult(data) }
    catch (e) { setError(e.response?.data?.detail || 'Failed') }
    finally { setLoading(false) }
  }

  const sendFeedback = async () => {
    try { await personalizeAPI.feedback({ plan_id: result.plan_id, ...feedback }); setFbSent(true) }
    catch {}
  }

  return (
    <div className="page-enter space-y-6">
      <SectionHeader title="Personalized Plan" subtitle="AI-adapted to your taste history" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Your Preferences</h3>
          <div className="space-y-4">
            {[
              { k: 'budget_egp', l: 'Budget',   u: 'EGP',  min: 10,  max: 1000, step: 10 },
              { k: 'calories',   l: 'Calories', u: 'kcal', min: 500, max: 5000, step: 100 },
              { k: 'protein_g',  l: 'Protein',  u: 'g',    min: 10,  max: 300,  step: 5 },
            ].map(({ k, l, u, min, max, step }) => (
              <div key={k}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-600 dark:text-green-200/60 font-medium">{l}</span>
                  <span className="font-mono text-green-600">{form[k]} {u}</span>
                </div>
                <input type="range" min={min} max={max} step={step} value={form[k]}
                  onChange={e => set(k, parseFloat(e.target.value))}
                  className="w-full accent-green-600" />
              </div>
            ))}
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-slate-600 dark:text-green-200/60 font-medium">Diversity Boost</span>
                <span className="font-mono text-green-600">{(form.diversity_boost * 100).toFixed(0)}%</span>
              </div>
              <input type="range" min={0} max={1} step={0.1} value={form.diversity_boost}
                onChange={e => set('diversity_boost', parseFloat(e.target.value))}
                className="w-full accent-green-600" />
            </div>
          </div>
          <Button variant="primary" className="w-full mt-5" onClick={handleSubmit} loading={loading}>
            🎯 Get My Plan
          </Button>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {error && <Alert type="error" message={error} />}
          {loading && <Card className="flex items-center justify-center gap-3 py-12"><Spinner size="lg" /><p className="text-slate-500 text-sm">Personalizing...</p></Card>}
          {result && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Cost"     value={result.total_cost_egp?.toFixed(0)}  unit="EGP"  icon={null} color="orange" />
                <StatCard label="Calories" value={result.total_calories?.toFixed(0)}  unit="kcal" icon={null} color="emerald" />
                <StatCard label="Protein"  value={result.total_protein_g?.toFixed(0)} unit="g"    icon={null} color="blue" />
              </div>
              <Card>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-slate-800 dark:text-white">Your Meals ({result.items?.length})</h3>
                  <span className="text-xs text-slate-400 bg-slate-100 dark:bg-[#134d26] px-2 py-1 rounded-lg">
                    History used: {result.personalization?.history_plans_used}
                  </span>
                </div>
                <div className="space-y-1">
                  {result.items?.map((item, i) => (
                    <div key={i} className="flex justify-between items-center py-2.5
                                           border-b border-slate-50 dark:border-green-900/50/50
                                           last:border-0 text-sm">
                      <div>
                        <p className="font-medium text-slate-800 dark:text-green-50">{item.product_name}</p>
                        <p className="text-xs text-slate-400">{item.quantity_g}g · {item.calories?.toFixed(0)} kcal</p>
                      </div>
                      <span className="font-bold text-green-600">{item.cost_egp?.toFixed(1)} EGP</span>
                    </div>
                  ))}
                </div>
              </Card>
              {!fbSent ? (
                <Card>
                  <h3 className="font-semibold text-slate-800 dark:text-white mb-3">Rate This Plan</h3>
                  <div className="flex gap-2 mb-4">
                    {[1,2,3,4,5].map(r => (
                      <button key={r} onClick={() => setFeedback(f => ({ ...f, rating: r }))}
                        className={`text-2xl transition-transform hover:scale-110 ${feedback.rating >= r ? '' : 'opacity-30'}`}>
                        ⭐
                      </button>
                    ))}
                  </div>
                  <textarea className="input resize-none h-16 text-sm mb-3"
                    placeholder="Any notes? (optional)"
                    value={feedback.notes}
                    onChange={e => setFeedback(f => ({ ...f, notes: e.target.value }))} />
                  <Button variant="primary" size="sm" onClick={sendFeedback}>Submit Feedback</Button>
                </Card>
              ) : <Alert type="success" message="✅ Feedback saved! Your next plan will be more personalized." />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Plan period constants ─────────────────────────────────────────────────────
const PERIOD_ICON  = { weekly:'📅', daily:'☀️', single:'🍽️' }
const PERIOD_LABEL = { weekly:'Weekly Plan', daily:'Daily Plan', single:'Single Meal' }

// ── PlanCard — expandable plan with meal names ────────────────────────────────
function PlanCard({ plan, onDelete }) {
  const [expanded,    setExpanded]    = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const meals    = Array.isArray(plan.meal_names) ? plan.meal_names : []
  const hasMeals = meals.length > 0
  const isWeekly = plan.period === 'weekly'

  const authH = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('access_token')}`,
  })

  const handleDelete = async () => {
    setDeleting(true)
    const planId = plan.plan_id || plan.id
    if (!planId) { setDeleting(false); setShowModal(false); return }
    try {
      const res = await fetch(`/api/v1/optimize/history/${planId}`, {
        method: 'DELETE', headers: authH()
      })
      if (!res.ok) { setDeleting(false); setShowModal(false); return }
      onDelete(planId)
      localStorage.setItem('plans_dirty', Date.now().toString())
      window.dispatchEvent(new CustomEvent('plans-updated'))
    } catch {
      setDeleting(false); setShowModal(false)
    }
  }

  return (
    <div className="card transition-all" style={{padding:0, overflow:'hidden'}}>

      {/* Inline delete confirm — replaces main row when active */}
      {showConfirm ? (
        <div className="flex items-center justify-between p-4 gap-3"
             style={{background:'rgba(239,68,68,0.06)', borderBottom:'1px solid rgba(239,68,68,0.15)'}}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                 style={{background:'rgba(239,68,68,0.12)'}}>
              <Trash2 className="w-4 h-4" style={{color:'#ef4444'}}/>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{color:'var(--text)'}}>Delete Plan #{plan.plan_id}?</p>
              <p className="text-[10px]" style={{color:'var(--text-muted)'}}>This can't be undone</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setShowConfirm(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{background:'var(--border)', color:'var(--text)'}}>
              Cancel
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-60"
              style={{background:'#ef4444'}}>
              {deleting ? '...' : 'Delete'}
            </button>
          </div>
        </div>
      ) : (
        /* Main row */
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => hasMeals && setExpanded(e => !e)}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
                 style={{background: isWeekly ? 'rgba(99,102,241,0.12)' : 'var(--primary-lt)'}}>
              {PERIOD_ICON[plan.period] || '🍽️'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm" style={{color:'var(--text)'}}>
                  {PERIOD_LABEL[plan.period] || 'Plan'} #{plan.plan_id}
                </p>
                {/* Weekly badge — more prominent */}
                {isWeekly && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{background:'rgba(99,102,241,0.15)', color:'#6366f1'}}>
                    7 days
                  </span>
                )}
                <Badge variant={plan.status === 'optimal' ? 'green' : 'gray'}>
                  {plan.status}
                </Badge>
              </div>
              {hasMeals ? (
                <p className="text-[11px] mt-0.5 truncate" style={{color:'var(--text-muted)'}}>
                  {meals.join(' · ')}
                </p>
              ) : (
                <p className="text-[10px] mt-0.5 italic" style={{color:'var(--text-muted)'}}>
                  No meal details saved
                </p>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <div className="text-right">
              <p className="text-sm font-bold" style={{color:'var(--primary)'}}>
                {plan.total_cost_egp?.toFixed(1)} EGP
              </p>
              <p className="text-[10px] font-mono" style={{color:'var(--text-muted)'}}>
                {plan.total_calories?.toFixed(0)} kcal
              </p>
              {plan.created_at && (
                <p className="text-[9px]" style={{color:'var(--text-muted)'}}>
                  {plan.created_at?.slice(0,10)}
                </p>
              )}
            </div>

            {/* Delete button — opens modal */}
            <button
              onClick={e => { e.stopPropagation(); setShowConfirm(true) }}
              title="Delete plan"
              className="p-1.5 rounded-lg transition-all shrink-0 hover:bg-red-50 dark:hover:bg-red-900/20"
              style={{background:'transparent', color:'var(--text-muted)'}}>
              <Trash2 className="w-3.5 h-3.5"/>
            </button>

            {hasMeals && (
              <ChevronRight
                className="w-4 h-4 transition-transform shrink-0"
                style={{
                  color:'var(--text-muted)',
                  transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)'
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Macro bars with legend */}
        <div className="px-4 pb-3 grid grid-cols-3 gap-2 border-t" style={{borderColor:'var(--border)'}}>
          {[
            {label:'Carbs',   abbr:'C', val:plan.total_carbs_g,   max:500, col:'#f59e0b'},
            {label:'Protein', abbr:'P', val:plan.total_protein_g, max:200, col:'#3b82f6'},
            {label:'Fats',    abbr:'F', val:plan.total_fats_g,    max:150, col:'#a855f7'},
          ].map(m => (
            <div key={m.label} className="pt-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-bold px-1 rounded"
                        style={{background:`${m.col}22`, color:m.col}}>
                    {m.abbr}
                  </span>
                  <span className="text-[9px]" style={{color:'var(--text-muted)'}}>{m.label}</span>
                </div>
                <span className="text-[9px] font-mono" style={{color:'var(--text-muted)'}}>
                  {m.val?.toFixed(0)}g
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{background:'var(--border)'}}>
                <div className="h-full rounded-full transition-all"
                     style={{width:`${Math.min(100,(m.val/m.max)*100)}%`, background:m.col}}/>
              </div>
            </div>
          ))}
        </div>

        {/* Expanded: full meal list */}
        {expanded && hasMeals && (
          <div className="border-t px-4 pb-4 pt-3 space-y-1.5" style={{borderColor:'var(--border)'}}>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-2"
               style={{color:'var(--text-muted)'}}>
              Meals in this plan
            </p>
            {meals.map((name, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 px-3 rounded-xl"
                   style={{background:'var(--primary-lt)'}}>
                <span className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{background:'var(--primary)', color:'#fff'}}>
                  {i + 1}
                </span>
                <span className="text-sm font-medium" style={{color:'var(--text)'}}>
                  {name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
  )
}

// HistoryPage  (public)
// ─────────────────────────────────────────────────────────────────────────────
export function HistoryPage() {
  const [allPlans,  setAllPlans]  = useState([])
  const [plans,     setPlans]     = useState([])
  const [liked,     setLiked]     = useState([])
  const [saved,     setSaved]     = useState([])
  const [analyzed,  setAnalyzed]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState('plans')
  const [filter,   setFilter]   = useState('all')   // all | single | weekly | daily
  const [showAll,  setShowAll]  = useState(false)

  const PAGE_SIZE = 10

  useEffect(() => {
    // Load analyzed meals from localStorage
    try {
      const stored = JSON.parse(localStorage.getItem('analyzed_meals') || '[]')
      setAnalyzed(stored)
    } catch {}

    // Listen for new analyzed meals
    const onUpdate = () => {
      try {
        setAnalyzed(JSON.parse(localStorage.getItem('analyzed_meals') || '[]'))
      } catch {}
    }
    window.addEventListener('analyzed-meals-updated', onUpdate)

    Promise.all([
      optimizerAPI.history(100).catch(() => ({data:{plans:[]}})),
      personalizeAPI.history().catch(() => ({data:{history:[]}})),
    ]).then(([planRes, likeRes]) => {
      const fetchedPlans = planRes.data?.plans || []
      const hist         = likeRes.data?.history || []
      const likedMeals   = hist.filter(h => h.type === 'liked'   || h.interaction_type === 'liked')
      const savedMeals   = hist.filter(h => h.type === 'planned' || h.interaction_type === 'planned')
      setAllPlans(Array.isArray(fetchedPlans) ? fetchedPlans : [])
      setPlans(Array.isArray(fetchedPlans) ? fetchedPlans : [])
      setLiked(Array.isArray(likedMeals)   ? likedMeals   : [])
      setSaved(Array.isArray(savedMeals)   ? savedMeals   : [])

      setLoading(false)
    })

    return () => window.removeEventListener('analyzed-meals-updated', onUpdate)
  }, [])

  // Derived stats — auto-updates when plans change
  const stats = plans.length > 0 ? {
    count:     plans.length,
    totalCost: plans.reduce((s,p) => s + (p.total_cost_egp||0), 0),
    avgCal:    plans.reduce((s,p) => s + (p.total_calories||0), 0) / plans.length,
  } : null

  // Apply filter
  const filteredPlans = filter === 'all'
    ? plans
    : plans.filter(p => (p.period || 'single') === filter)

  const visiblePlans = showAll ? filteredPlans : filteredPlans.slice(0, PAGE_SIZE)

  return (
    <div className="page-enter space-y-5 max-w-3xl">
      <SectionHeader title="History" subtitle="Your meal plans and saved meals" />

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-[#0C2118] rounded-xl p-1 gap-1"
           style={{border:'1px solid var(--border)'}}>
        {[
          {key:'plans',    label:`📋 Meal Plans (${plans.length})`},
          {key:'liked',    label:`❤️ Liked Meals (${liked.length})`},
          {key:'analyzed', label:`📷 Analyzed (${analyzed.length})`},
        ].map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            className="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
            style={tab===t.key
              ?{background:'var(--primary)',color:'#fff'}
              :{background:'transparent',color:'var(--text-muted)'}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Stats summary */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {label:'Total Plans',  val: stats.count,                unit:''},
            {label:'Total Spent',  val: stats.totalCost.toFixed(0), unit:' EGP'},
            {label:'Avg Calories', val: stats.avgCal.toFixed(0),    unit:' kcal'},
          ].map(s => (
            <div key={s.label} className="card text-center py-4">
              <p className="text-2xl font-black font-mono" style={{color:'var(--primary)'}}>
                {s.val}{s.unit}
              </p>
              <p className="text-xs mt-1" style={{color:'var(--text-muted)'}}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar — only in plans tab */}
      {tab === 'plans' && !loading && plans.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {[
            {key:'all',     label:'All'},
            {key:'single',  label:'🍽️ Single'},
            {key:'weekly',  label:'📅 Weekly'},
            {key:'daily',   label:'☀️ Daily'},
          ].map(f => (
            <button key={f.key} onClick={() => { setFilter(f.key); setShowAll(false) }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={filter === f.key
                ? {background:'var(--primary)', color:'#fff'}
                : {background:'var(--border)', color:'var(--text-muted)'}}>
              {f.label}
              {f.key !== 'all' && (
                <span className="ml-1 opacity-60">
                  ({plans.filter(p => (p.period||'single') === f.key).length})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : tab === 'analyzed' ? (
        analyzed.length === 0 ? (
          <div className="card py-16 text-center">
            <p className="text-4xl mb-3">📷</p>
            <p className="font-semibold text-sm mb-1" style={{color:'var(--text)'}}>No analyzed meals yet</p>
            <p className="text-sm mb-4" style={{color:'var(--text-muted)'}}>Analyze a meal photo to see it here</p>
            <a href="/vision" className="btn-primary inline-flex items-center gap-2 text-sm px-4 py-2 rounded-xl text-white"
               style={{background:'var(--primary)'}}>
              📷 Analyze a Meal
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {analyzed.map((m) => (
              <div key={m.id} className="card" style={{padding:0, overflow:'hidden'}}>
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0"
                         style={{background:'var(--primary-lt)'}}>📷</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm" style={{color:'var(--text)'}}>{m.meal_name}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                              style={{
                                background: m.confidence >= 0.7 ? 'rgba(77,184,122,0.15)' : 'rgba(245,158,11,0.15)',
                                color:      m.confidence >= 0.7 ? '#4DB87A' : '#f59e0b',
                              }}>
                          {(m.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-[10px]" style={{color:'var(--text-muted)'}}>
                        {new Date(m.analyzed_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{color:'var(--primary)'}}>
                      {m.cost_egp?.toFixed(1)} EGP
                    </p>
                    <p className="text-[10px] font-mono" style={{color:'var(--text-muted)'}}>
                      {m.calories?.toFixed(0)} kcal
                    </p>
                  </div>
                </div>
                <div className="px-4 pb-3 grid grid-cols-3 gap-2 border-t" style={{borderColor:'var(--border)'}}>
                  {[
                    {label:'Protein', abbr:'P', val:m.protein_g, col:'#3b82f6'},
                    {label:'Carbs',   abbr:'C', val:m.carbs_g,   col:'#f59e0b'},
                    {label:'Fats',    abbr:'F', val:m.fats_g,    col:'#a855f7'},
                  ].map(mac => (
                    <div key={mac.label} className="pt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-bold px-1 rounded"
                              style={{background:`${mac.col}22`, color:mac.col}}>{mac.abbr}</span>
                        <span className="text-[9px] font-mono" style={{color:'var(--text-muted)'}}>
                          {mac.val?.toFixed(0)}g
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={() => {
              localStorage.removeItem('analyzed_meals')
              setAnalyzed([])
            }} className="w-full py-2.5 rounded-xl text-xs font-medium transition-all"
              style={{background:'var(--border)', color:'var(--text-muted)'}}>
              🗑️ Clear History
            </button>
          </div>
        )
      ) : tab === 'saved' ? (
        /* ── Saved (Planned) Meals Tab ── */
        saved.length === 0 ? (
          <div className="card py-16 text-center">
            <p className="text-4xl mb-3">🔖</p>
            <p className="font-semibold text-sm mb-1" style={{color:'var(--text)'}}>No saved meals yet</p>
            <p className="text-sm" style={{color:'var(--text-muted)'}}>
              Go to Personalized and press "Add to History" on any meal
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {saved.map((item, i) => (
              <div key={i} className="card hover:opacity-90">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                       style={{background:'rgba(59,130,246,0.1)'}}>
                    🔖
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{color:'var(--text)'}}>
                      {item.recipe_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {item.meal_type && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                              style={{background:'var(--primary-lt)',color:'var(--primary)'}}>
                          {item.meal_type}
                        </span>
                      )}
                      {item.prep_time > 0 && (
                        <span className="text-[10px]" style={{color:'var(--text-muted)'}}>
                          ⏱ {item.prep_time} min
                        </span>
                      )}
                      <span className="text-[10px]" style={{color:'var(--text-muted)'}}>
                        {item.date?.slice(0,10)}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-lg shrink-0"
                        style={{background:'rgba(59,130,246,0.1)', color:'#3b82f6'}}>
                    Saved
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : tab === 'liked' ? (
        /* ── Liked Meals Tab ── */
        liked.length === 0 ? (
          <div className="card py-16 text-center">
            <p className="text-4xl mb-3">❤️</p>
            <p className="font-semibold text-sm mb-1" style={{color:'var(--text)'}}>No liked meals yet</p>
            <p className="text-sm" style={{color:'var(--text-muted)'}}>
              Go to Meal Plan → Find a Meal and press Like on any meal
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {liked.map((item, i) => (
              <div key={i}
                className="card transition-all hover:opacity-90"
                style={{cursor:'default'}}>
                <div className="flex items-center justify-between gap-3">
                  {/* Left: icon + info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                         style={{background:'rgba(236,72,153,0.1)'}}>
                      ❤️
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{color:'var(--text)'}}>
                        {item.recipe_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {item.meal_type && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{background:'var(--primary-lt)',color:'var(--primary)'}}>
                            {item.meal_type}
                          </span>
                        )}
                        {item.prep_time > 0 && (
                          <span className="text-[10px]" style={{color:'var(--text-muted)'}}>
                            ⏱ {item.prep_time} min
                          </span>
                        )}
                        <span className="text-[10px]" style={{color:'var(--text-muted)'}}>
                          {item.date?.slice(0,10)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: un-like button */}
                  <button
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('access_token')
                        await fetch(`/api/v1/personalize/history/${item.recipe_id}`, {
                          method: 'DELETE',
                          headers: { Authorization: `Bearer ${token}` }
                        })
                        setLiked(prev => prev.filter((_, j) => j !== i))
                      } catch {}
                    }}
                    className="shrink-0 flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-xl
                               border transition-all hover:bg-red-50 dark:hover:bg-red-900/20"
                    style={{borderColor:'rgba(236,72,153,0.3)', color:'#ec4899'}}
                    title="Remove from liked">
                    ❤️ Liked
                    <span className="text-[9px] ml-0.5 opacity-60">✕</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredPlans.length === 0 ? (
        <div className="card py-16 text-center">
          <p className="text-4xl mb-3">{filter === 'all' ? '📋' : '🔍'}</p>
          <p className="font-semibold text-sm mb-1" style={{color:'var(--text)'}}>
            {filter === 'all' ? 'No plans yet' : `No ${filter} plans found`}
          </p>
          {filter === 'all' ? (
            <>
              <p className="text-sm mb-4" style={{color:'var(--text-muted)'}}>Generate your first meal plan to see it here</p>
              <a href="/optimize" className="btn-primary inline-flex items-center gap-2 text-sm px-4 py-2 rounded-xl text-white"
                 style={{background:'var(--primary)'}}>
                <Zap className="w-4 h-4"/> Generate Plan
              </a>
            </>
          ) : (
            <button onClick={() => setFilter('all')} className="text-sm mt-2"
                    style={{color:'var(--primary)'}}>
              Show all plans
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {visiblePlans.map((plan, i) => (
              <PlanCard
                key={plan.plan_id || i}
                plan={plan}
                onDelete={(id) => {
                  setAllPlans(prev => prev.filter(p => p.plan_id !== id))
                  setPlans(prev => prev.filter(p => p.plan_id !== id))
                }}
              />
            ))}
          </div>
          {/* Load more */}
          {filteredPlans.length > PAGE_SIZE && !showAll && (
            <button onClick={() => setShowAll(true)}
              className="w-full py-3 rounded-2xl text-sm font-semibold transition-all"
              style={{background:'var(--border)', color:'var(--text-muted)'}}>
              Show all {filteredPlans.length} plans ↓
            </button>
          )}
          {showAll && filteredPlans.length > PAGE_SIZE && (
            <button onClick={() => setShowAll(false)}
              className="w-full py-3 rounded-2xl text-sm font-semibold transition-all"
              style={{background:'var(--border)', color:'var(--text-muted)'}}>
              Show less ↑
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// NutritionPage  (ADMIN ONLY)
// ─────────────────────────────────────────────────────────────────────────────
export function NutritionPage() {
  return <AdminGuard><NutritionContent /></AdminGuard>
}

function NutritionContent() {
  const [items,   setItems]   = useState([])
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg,     setMsg]     = useState(null)
  const [form,    setForm]    = useState({
    normalized_name: '', display_name: '',
    calories_per_100g: 0, protein_g: 0, carbs_g: 0, fats_g: 0, fiber_g: 0,
    data_source: 'manual',
  })

  useEffect(() => {
    Promise.all([matchAPI.listNutrition(), matchAPI.stats()]).then(([n, s]) => {
      setItems(n.data); setStats(s.data)
    })
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleAdd = async () => {
    setLoading(true); setMsg(null)
    try {
      await matchAPI.addNutrition(form)
      const r = await matchAPI.listNutrition(); setItems(r.data)
      setMsg({ type: 'success', text: `✅ Added "${form.display_name}"` })
      setForm(f => ({ ...f, normalized_name: '', display_name: '' }))
    } catch (e) { setMsg({ type: 'error', text: e.response?.data?.detail || 'Failed' }) }
    finally { setLoading(false) }
  }

  return (
    <div className="page-enter space-y-6">
      <SectionHeader
        title="Nutrition Facts"
        subtitle="Manage the food → macros database"
        action={<Badge variant="orange"><ShieldAlert className="w-3 h-3" /> Admin Only</Badge>}
      />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Nutrition Entries" value={items.length}                   icon={Salad} color="emerald" />
        <StatCard label="High Confidence"   value={stats?.high_confidence ?? '—'} icon={null}  color="orange" />
        <StatCard label="Coverage"          value={stats?.coverage_pct    ?? '—'} unit="%" icon={null} color="blue" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Add Entry</h3>
          {msg && <Alert type={msg.type} message={msg.text} className="mb-3" />}
          {[
            { k: 'normalized_name', l: 'Normalized Name', ph: 'chicken breast' },
            { k: 'display_name',    l: 'Display Name',    ph: 'Chicken Breast' },
          ].map(({ k, l, ph }) => (
            <div key={k} className="mb-3">
              <label className="label">{l}</label>
              <input className="input" placeholder={ph} value={form[k]} onChange={e => set(k, e.target.value)} />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { k: 'calories_per_100g', l: 'Calories/100g' },
              { k: 'protein_g',         l: 'Protein (g)' },
              { k: 'carbs_g',           l: 'Carbs (g)' },
              { k: 'fats_g',            l: 'Fats (g)' },
            ].map(({ k, l }) => (
              <div key={k}>
                <label className="label text-xs">{l}</label>
                <input className="input text-sm" type="number" min={0} step={0.1}
                  value={form[k]} onChange={e => set(k, parseFloat(e.target.value))} />
              </div>
            ))}
          </div>
          <Button variant="primary" className="w-full" onClick={handleAdd}
            loading={loading} disabled={!form.normalized_name}>
            + Add Entry
          </Button>
        </Card>

        <div className="lg:col-span-2">
          <Card>
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4">
              Catalogue ({items.length} entries)
            </h3>
            <div className="overflow-auto max-h-[500px] scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white dark:bg-[#0d2818] z-10">
                  <tr className="border-b border-slate-200 dark:border-green-900/50">
                    {['Food', 'Cal/100g', 'Protein', 'Carbs', 'Fats'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-500 dark:text-green-200/60 pb-3 pr-3 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(n => (
                    <tr key={n.id} className="border-b border-slate-50 dark:border-green-900/50/50 hover:bg-slate-50 dark:hover:bg-green-900/50/30 transition-colors">
                      <td className="py-2.5 pr-3 font-medium text-slate-800 dark:text-green-50">{n.display_name || n.normalized_name}</td>
                      <td className="py-2.5 pr-3 font-mono text-slate-600 dark:text-green-200/60">{n.calories_per_100g}</td>
                      <td className="py-2.5 pr-3 font-mono text-blue-500">{n.protein_g}g</td>
                      <td className="py-2.5 pr-3 font-mono text-green-600">{n.carbs_g}g</td>
                      <td className="py-2.5 font-mono text-violet-500">{n.fats_g}g</td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr><td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                      No entries yet — add your first food item
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

// ── Macro input card ──────────────────────────────────────────────────────────

// ── Rate App Modal ────────────────────────────────────────────────────────────
function RateAppModal({ onClose }) {
  const [rating,  setRating]  = useState(0)
  const [hover,   setHover]   = useState(0)
  const [notes,   setNotes]   = useState('')
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState('')

  const handleSubmit = async () => {
    if (rating === 0) { setError('Please select a rating'); return }
    setError(''); setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch('/api/v1/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, notes: notes.trim() || null }),
      })
      if (!res.ok) throw new Error('Failed to submit')
      setDone(true)
      setTimeout(onClose, 2000)
    } catch {
      setError('Failed to submit. Please try again.')
    } finally { setLoading(false) }
  }

  const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent']
  const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#2D7A4F']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)' }}
         onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
           style={{ background:'var(--bg-card)', border:'1px solid var(--border)' }}
           onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="relative p-5 pb-4"
             style={{ background:'linear-gradient(135deg, rgba(77,184,122,0.15) 0%, rgba(45,122,79,0.05) 100%)' }}>
          <button onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg transition-all hover:bg-black/10 dark:hover:bg-white/10">
            <X className="w-4 h-4" style={{color:'var(--text-muted)'}}/>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                 style={{ background:'var(--primary)' }}>
              <Star className="w-5 h-5 text-white" fill="white"/>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5"
                 style={{ color:'var(--primary)' }}>
                Your Feedback Matters
              </p>
              <h3 className="text-base font-bold leading-tight" style={{ color:'var(--text)' }}>
                Rate NutriBudget EG
              </h3>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 pt-4">
          {done ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center"
                   style={{ background:'rgba(77,184,122,0.15)' }}>
                <CheckCircle className="w-7 h-7" style={{color:'#4DB87A'}}/>
              </div>
              <p className="text-sm font-bold" style={{color:'var(--text)'}}>Thank you! 🌿</p>
              <p className="text-xs mt-1" style={{color:'var(--text-muted)'}}>
                Your feedback helps us improve
              </p>
            </div>
          ) : (
            <>
              {/* Stars */}
              <p className="text-xs font-semibold mb-2" style={{color:'var(--text-muted)'}}>
                How would you rate your experience?
              </p>
              <div className="flex items-center justify-center gap-2 mb-2">
                {[1,2,3,4,5].map(n => (
                  <button key={n}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(n)}
                    className="transition-transform hover:scale-110">
                    <Star
                      className="w-9 h-9"
                      style={{
                        color: (hover || rating) >= n ? colors[hover || rating] : 'var(--border)',
                      }}
                      fill={(hover || rating) >= n ? colors[hover || rating] : 'none'}
                    />
                  </button>
                ))}
              </div>
              <p className="text-center text-xs h-4 mb-4 font-semibold"
                 style={{ color: rating > 0 ? colors[rating] : 'transparent' }}>
                {labels[hover || rating]}
              </p>

              {/* Comment */}
              <div className="mb-4">
                <label className="text-xs font-semibold flex items-center gap-1.5 mb-1.5"
                       style={{color:'var(--text-muted)'}}>
                  <MessageSquare className="w-3 h-3"/>
                  Comments <span className="opacity-60 font-normal">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="What did you like? What can we improve?"
                  rows={3}
                  maxLength={1000}
                  className="w-full text-sm px-3 py-2 rounded-xl border outline-none resize-none"
                  style={{
                    background:'var(--bg-card)',
                    color:'var(--text)',
                    borderColor:'var(--border)',
                  }}
                />
                <p className="text-[10px] mt-1 text-right" style={{color:'var(--text-muted)'}}>
                  {notes.length}/1000
                </p>
              </div>

              {error && (
                <p className="text-xs mb-3" style={{color:'#ef4444'}}>{error}</p>
              )}

              <div className="flex gap-2">
                <button onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{background:'var(--border)', color:'var(--text)'}}>
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={loading || rating === 0}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                  style={{background:'var(--primary)'}}>
                  {loading ? 'Sending...' : 'Submit'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}


// ── ProfilePage helpers ───────────────────────────────────────────────────────
function MacroCard({ icon: Icon, label, value, unit, onChange, color, max }) {
  const pct = Math.min(100, ((value||0) / max) * 100)
  const C = {
    orange:  { bar:'bg-green-600',  ico:'text-green-600',  bg:'bg-green-600/10' },
    amber:   { bar:'bg-amber-500',   ico:'text-amber-500',   bg:'bg-amber-500/10' },
    blue:    { bar:'bg-blue-500',    ico:'text-blue-500',    bg:'bg-blue-500/10' },
    emerald: { bar:'bg-emerald-500', ico:'text-emerald-500', bg:'bg-emerald-500/10' },
    violet:  { bar:'bg-violet-500',  ico:'text-violet-500',  bg:'bg-violet-500/10' },
  }[color] || {}
  return (
    <div className="p-4 rounded-2xl border border-slate-100 dark:border-green-900/50/60 hover:border-slate-200 dark:hover:border-slate-600 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-xl ${C.bg}`}><Icon className={`w-4 h-4 ${C.ico}`}/></div>
          <span className="text-sm font-medium text-slate-700 dark:text-green-100">{label}</span>
        </div>
        <div className="flex items-center gap-1">
          <input type="number" min={0} max={max} value={value||''}
            onChange={e=>onChange(parseFloat(e.target.value)||0)}
            className="w-20 text-right text-sm font-bold outline-none rounded-lg px-2 py-1 border border-slate-300 dark:border-green-800/50 bg-slate-100 dark:bg-[#134d26] text-slate-900 dark:text-white focus:border-green-500"/>
          <span className="text-xs text-slate-400 w-8">{unit}</span>
        </div>
      </div>
      <div className="h-1.5 bg-slate-100 dark:bg-[#134d26] rounded-full overflow-hidden">
        <div className={`h-full ${C.bar} rounded-full transition-all`} style={{width:`${pct}%`}}/>
      </div>
      <p className="text-[10px] text-slate-400 mt-1 text-right">{pct.toFixed(0)}% of max</p>
    </div>
  )
}

const ACTIVITY_OPTS = [
  {key:'sedentary',   ar:'مكتبي / لا يتحرك', en:'Sedentary',   sub:'No exercise'},
  {key:'light',       ar:'نشاط خفيف',          en:'Light',       sub:'1-3 days/wk'},
  {key:'moderate',    ar:'نشاط متوسط',         en:'Moderate',    sub:'3-5 days/wk'},
  {key:'active',      ar:'نشيط',               en:'Active',      sub:'6-7 days/wk'},
  {key:'very_active', ar:'رياضي / شغل بدني',   en:'Very Active', sub:'Daily intense'},
]
const GOAL_OPTS = [
  {key:'weight_loss',    emoji:'🔥',ar:'إنقاص وزن',   en:'Weight Loss'},
  {key:'maintenance',    emoji:'⚖️',ar:'ثبات وزن',    en:'Maintenance'},
  {key:'muscle_gain',    emoji:'💪',ar:'بناء عضل',    en:'Muscle Gain'},
  {key:'general_health', emoji:'🌿',ar:'صحة عامة',    en:'General Health'},
]

export function ProfilePage() {
  const { user, fetchMe } = useAuthStore()
  const [tab, setTab] = useState('physical')
  const [form, setForm] = useState({
    full_name:        user?.full_name        || '',
    age:              user?.age              || '',
    weight_kg:        user?.weight_kg        || '',
    height_cm:        user?.height_cm        || '',
    gender:           user?.gender           || null,
    activity_level:   user?.activity_level   || null,
    goal:             user?.goal             || null,
    daily_budget_egp: user?.daily_budget_egp || 200,
    daily_calories:   user?.daily_calories   || 2000,
    daily_protein_g:  user?.daily_protein_g  || 60,
    daily_carbs_g:    user?.daily_carbs_g    || 250,
    daily_fats_g:     user?.daily_fats_g     || 65,
    allergies:        user?.allergies        || [],
    dietary_prefs:    user?.dietary_prefs    || '',
    forbidden_foods:  user?.forbidden_foods  || [],
  })
  const [ai, setAi] = useState('')
  const [fi, setFi] = useState('')
  const [msg, setMsg]     = useState(null)
  const [saving, setSaving] = useState(false)
  const [showRate, setShowRate] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const addTag = (field, input, setInput) => {
    const v = input.trim()
    if (!v) return
    if (!form[field].includes(v)) set(field, [...form[field], v])
    setInput('')
  }
  const removeTag = (field, item) => set(field, form[field].filter(x=>x!==item))

  const handleSave = async () => {
    setSaving(true)
    try {
      const p = {...form}
      if (p.age==='') p.age=null
      if (p.weight_kg==='') p.weight_kg=null
      if (p.height_cm==='') p.height_cm=null
      await userAPI.updateMe(p)
      await fetchMe()
      setMsg('success')
      setTimeout(()=>setMsg(null), 3000)
    } catch { setMsg('error') }
    finally { setSaving(false) }
  }

  const initials = user?.full_name?.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'?'
  const cp=(form.daily_protein_g||0)*4, cc=(form.daily_carbs_g||0)*4, cf=(form.daily_fats_g||0)*9
  const tc=cp+cc+cf

  return (
    <div className="page-enter max-w-2xl space-y-5">
      <SectionHeader title="My Profile" subtitle="Manage your account and daily nutrition targets"/>

      {/* Avatar */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white text-xl font-black shadow-lg">{initials}</div>
            {user?.is_admin&&<div className="absolute -bottom-1 -right-1 p-1 bg-green-600 rounded-lg shadow"><ShieldCheck className="w-3 h-3 text-white"/></div>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-bold text-slate-900 dark:text-white truncate">{user?.full_name||'User'}</p>
              {user?.is_admin&&<Badge variant="orange">Admin</Badge>}
            </div>
            <p className="text-sm text-slate-500 dark:text-green-200/60 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 shrink-0"/>{user?.email}
            </p>
          </div>
          <input className="input text-sm w-40 shrink-0" placeholder="Display name"
            value={form.full_name} onChange={e=>set('full_name',e.target.value)}/>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-[#0d2818] rounded-xl p-1 gap-1">
        {[
          {key:'physical', label:'Physical Info'},
          {key:'targets',  label:'Nutrition Targets'},
          {key:'food',     label:'Food Preferences'},
        ].map(s=>(
          <button key={s.key} onClick={()=>setTab(s.key)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all
                        ${tab===s.key?'bg-white dark:bg-[#134d26] text-slate-900 dark:text-white shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Physical Info ──────────────────────────────────────────────────── */}
      {tab==='physical'&&(
        <Card>
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-green-600"/> Physical Info
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[{k:'age',l:'Age',u:'yr'},{k:'weight_kg',l:'Weight',u:'kg'},{k:'height_cm',l:'Height',u:'cm'}].map(({k,l,u})=>(
              <div key={k}>
                <label className="text-xs text-slate-400 mb-1.5 block">{l}</label>
                <div className="relative">
                  <input type="number" value={form[k]} onChange={e=>set(k,e.target.value)}
                    className="input text-sm pr-8 w-full" placeholder="—"/>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{u}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mb-5">
            <label className="text-xs text-slate-400 mb-1.5 block">Gender</label>
            <div className="grid grid-cols-2 gap-2">
              {[['male','♂ Male (ذكر)'],['female','♀ Female (أنثى)']].map(([k,l])=>(
                <button key={k} onClick={()=>set('gender',k)}
                  className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all
                              ${form.gender===k?'border-green-500 bg-green-50 dark:bg-green-600/10 text-green-700 dark:text-green-400':'border-slate-200 dark:border-green-900/50 text-slate-600 dark:text-green-200/60'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-5">
            <label className="text-xs text-slate-400 mb-1.5 block">Activity Level</label>
            <div className="space-y-1.5">
              {ACTIVITY_OPTS.map(a=>(
                <button key={a.key} onClick={()=>set('activity_level',a.key)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 text-sm transition-all
                              ${form.activity_level===a.key?'border-green-500 bg-green-50 dark:bg-green-600/10':'border-slate-200 dark:border-green-900/50 hover:border-green-400'}`}>
                  <span className={form.activity_level===a.key?'text-green-700 dark:text-green-400 font-medium':'text-slate-600 dark:text-green-200/60'}>{a.ar} — {a.en}</span>
                  <span className="text-xs text-slate-400">{a.sub}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Goal</label>
            <div className="grid grid-cols-2 gap-2">
              {GOAL_OPTS.map(g=>(
                <button key={g.key} onClick={()=>set('goal',g.key)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-sm transition-all
                              ${form.goal===g.key?'border-green-500 bg-green-50 dark:bg-green-600/10':'border-slate-200 dark:border-green-900/50 hover:border-green-400'}`}>
                  <span className="text-xl">{g.emoji}</span>
                  <div className="text-left">
                    <p className={`text-xs font-semibold ${form.goal===g.key?'text-green-700 dark:text-green-400':'text-slate-700 dark:text-green-100'}`}>{g.ar}</p>
                    <p className="text-[10px] text-slate-400">{g.en}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ── Nutrition Targets ──────────────────────────────────────────────── */}
      {tab==='targets'&&(
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-green-600"/> Daily Targets
            </h3>
            {tc>0&&<span className="text-xs text-slate-400">{tc.toFixed(0)} kcal from macros</span>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MacroCard icon={Wallet}   label="Budget"   unit="EGP"  value={form.daily_budget_egp} onChange={v=>set('daily_budget_egp',v)} color="orange"  max={1000}/>
            <MacroCard icon={Zap}      label="Calories" unit="kcal" value={form.daily_calories}   onChange={v=>set('daily_calories',v)}   color="amber"   max={4000}/>
            <MacroCard icon={Beef}     label="Protein"  unit="g"    value={form.daily_protein_g}  onChange={v=>set('daily_protein_g',v)}  color="blue"    max={300}/>
            <MacroCard icon={Wheat}    label="Carbs"    unit="g"    value={form.daily_carbs_g}    onChange={v=>set('daily_carbs_g',v)}    color="emerald" max={500}/>
            <MacroCard icon={Droplets} label="Fats"     unit="g"    value={form.daily_fats_g}     onChange={v=>set('daily_fats_g',v)}     color="violet"  max={200}/>
          </div>
          {tc>0&&(
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-green-900/50">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Calorie Split</p>
              <div className="flex rounded-full overflow-hidden h-2.5 gap-px">
                <div className="bg-blue-500"    style={{width:`${(cp/tc*100).toFixed(0)}%`}}/>
                <div className="bg-emerald-500" style={{width:`${(cc/tc*100).toFixed(0)}%`}}/>
                <div className="bg-violet-500"  style={{width:`${(cf/tc*100).toFixed(0)}%`}}/>
              </div>
              <div className="flex gap-4 mt-2">
                {[{l:'Protein',v:cp,c:'text-blue-500'},{l:'Carbs',v:cc,c:'text-emerald-500'},{l:'Fats',v:cf,c:'text-violet-500'}].map(m=>(
                  <div key={m.l} className="flex items-center gap-1">
                    <span className={`text-[11px] font-bold ${m.c}`}>{(m.v/tc*100).toFixed(0)}%</span>
                    <span className="text-[11px] text-slate-400">{m.l}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-slate-400 mt-3 text-center">
            💡 Use Smart Profile to auto-calculate targets from your physical info
          </p>
        </Card>
      )}

      {/* ── Food Preferences ───────────────────────────────────────────────── */}
      {tab==='food'&&(
        <Card>
          <h3 className="font-semibold text-slate-800 dark:text-white mb-5 flex items-center gap-2">
            <Salad className="w-4 h-4 text-green-600"/> Food Preferences
          </h3>
          <div className="mb-5">
            <label className="text-xs text-slate-400 mb-1.5 block">Dietary Style</label>
            <div className="flex flex-wrap gap-2">
              {['none','vegetarian','vegan','halal','pescatarian','keto','low-carb'].map(d=>(
                <button key={d} onClick={()=>set('dietary_prefs',form.dietary_prefs===d?'':d)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all
                              ${form.dietary_prefs===d?'border-green-500 bg-green-50 dark:bg-green-600/10 text-green-700 dark:text-green-400':'border-slate-200 dark:border-green-900/50 text-slate-500 hover:border-green-400'}`}>
                  {d==='none'?'No restriction':d}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-5">
            <label className="text-xs text-slate-400 mb-1.5 block">Allergies / Intolerances</label>
            <div className="flex gap-2 mb-2">
              <input className="input text-sm flex-1" placeholder="e.g. lactose, gluten, nuts..."
                value={ai} onChange={e=>setAi(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&addTag('allergies',ai,setAi)}/>
              <Button variant="outline" onClick={()=>addTag('allergies',ai,setAi)}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(form.allergies||[]).length===0
                ? <span className="text-xs text-slate-400">No allergies added</span>
                : (form.allergies||[]).map(item=>(
                    <span key={item} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40">
                      {item}<button onClick={()=>removeTag('allergies',item)} className="ml-0.5 hover:text-red-900 font-bold">×</button>
                    </span>
                  ))
              }
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Forbidden / Disliked Foods</label>
            <div className="flex gap-2 mb-2">
              <input className="input text-sm flex-1" placeholder="e.g. liver, كبدة, fish..." dir="auto"
                value={fi} onChange={e=>setFi(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&addTag('forbidden_foods',fi,setFi)}/>
              <Button variant="outline" onClick={()=>addTag('forbidden_foods',fi,setFi)}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(form.forbidden_foods||[]).length===0
                ? <span className="text-xs text-slate-400">No forbidden foods added</span>
                : (form.forbidden_foods||[]).map(item=>(
                    <span key={item} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-slate-100 dark:bg-[#134d26] text-slate-600 dark:text-green-200/60 border border-slate-200 dark:border-green-800/50">
                      {item}<button onClick={()=>removeTag('forbidden_foods',item)} className="ml-0.5 hover:text-red-500 font-bold">×</button>
                    </span>
                  ))
              }
            </div>
          </div>
        </Card>
      )}

      {msg==='success'&&(
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40">
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0"/>
          <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">Profile updated successfully!</p>
        </div>
      )}
      {msg==='error'&&<Alert type="error" message="Update failed. Please try again."/>}

      <Button variant="primary" className="w-full h-11" onClick={handleSave}
        loading={saving} icon={<Save className="w-4 h-4"/>}>
        {saving?'Saving...':'Save Changes'}
      </Button>

      {/* Rate the app */}
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                 style={{ background:'rgba(77,184,122,0.12)' }}>
              <Star className="w-5 h-5" style={{color:'var(--primary)'}} fill="currentColor"/>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm" style={{color:'var(--text)'}}>
                Enjoying NutriBudget?
              </p>
              <p className="text-xs mt-0.5" style={{color:'var(--text-muted)'}}>
                Your feedback helps us improve the experience
              </p>
            </div>
          </div>
          <button onClick={() => setShowRate(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shrink-0"
            style={{background:'var(--primary)'}}>
            Rate App
          </button>
        </div>
      </Card>

      {showRate && <RateAppModal onClose={() => setShowRate(false)}/>}
    </div>
  )
}
