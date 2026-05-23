import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { Heart, ThumbsDown, RefreshCw, ChevronDown, ChevronUp, BookmarkPlus, Check,
         Info, X, ArrowUpDown } from 'lucide-react'
import { Spinner, SectionHeader } from '../components/UI'

const API = (path, opts = {}) => fetch(`/api/v1${path}`, {
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('access_token')}`,
  },
  ...opts,
}).then(r => r.json())

const MEAL_TYPES = [
  { key: null,    label: 'All'  },
  { key: 'فطار', label: 'فطار' },
  { key: 'غداء', label: 'غداء' },
  { key: 'عشاء', label: 'عشاء' },
]

// ── Why This Recipe Modal ─────────────────────────────────────────────────────
function WhyModal({ recipe, onClose }) {
  if (!recipe) return null
  const chips     = recipe.reason_chips || []
  const macroScore= recipe.macro_score  || 0
  const macroPct  = Math.round(macroScore * 100)
  const tasteChip = chips.find(c => c.startsWith('Taste'))
  const tastePct  = tasteChip ? parseInt(tasteChip.match(/\d+/)?.[0] || 0) : 0
  const budget    = recipe.cost || 0

  const reasons = []
  if (tastePct > 0) {
    reasons.push({
      icon: '🎯',
      title: `${tastePct}% taste match`,
      detail: 'Matches your liked meals',
      pct: tastePct,
    })
  }
  if (macroPct >= 60) {
    reasons.push({
      icon: '💪',
      title: `${macroPct}% macro fit`,
      detail: 'Aligns with your nutrition goals',
      pct: macroPct,
    })
  }
  if (chips.includes('Fits budget')) {
    reasons.push({
      icon: '💰',
      title: 'Within budget',
      detail: `Only ${budget.toFixed(1)} EGP per serving`,
    })
  }
  chips.filter(c => ['low cal','low carbs','low prot'].includes(c)).forEach(c => {
    if (c === 'low cal')   reasons.push({ icon: '🔥', title: 'Low calorie',   detail: 'Supports weight loss' })
    if (c === 'low carbs') reasons.push({ icon: '🌾', title: 'Low carb',       detail: 'Matches your dietary preference' })
    if (c === 'low prot')  reasons.push({ icon: '⚖️', title: 'Balanced protein', detail: 'Moderate protein content' })
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
         style={{background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)'}}
         onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
           style={{background:'var(--bg-card)', border:'1px solid var(--border)'}}
           onClick={e => e.stopPropagation()}>

        {/* Header with gradient */}
        <div className="relative p-5 pb-4"
             style={{background:'linear-gradient(135deg, rgba(77,184,122,0.15) 0%, rgba(45,122,79,0.05) 100%)'}}>
          <button onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg transition-all hover:bg-black/10 dark:hover:bg-white/10">
            <X className="w-4 h-4" style={{color:'var(--text-muted)'}}/>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                 style={{background:'var(--primary)'}}>
              <Info className="w-5 h-5 text-white"/>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5"
                 style={{color:'var(--primary)'}}>
                Why we recommend this
              </p>
              <h3 className="text-base font-bold leading-tight" style={{color:'var(--text)'}}>
                {recipe.recipe_name}
              </h3>
            </div>
          </div>
        </div>

        {/* Reasons list */}
        <div className="p-5 pt-3 space-y-2">
          {reasons.map((r, i) => (
            <div key={i}
                 className="flex items-start gap-3 p-3 rounded-xl transition-all"
                 style={{background:'var(--primary-lt)', border:'1px solid rgba(77,184,122,0.15)'}}>
              <span className="text-xl shrink-0 mt-0.5">{r.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className="text-sm font-bold" style={{color:'var(--text)'}}>{r.title}</p>
                  {r.pct && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full"
                          style={{background:'rgba(77,184,122,0.2)', color:'var(--primary)'}}>
                      {r.pct}%
                    </span>
                  )}
                </div>
                <p className="text-[11px]" style={{color:'var(--text-muted)'}}>
                  {r.detail}
                </p>
                {r.pct && (
                  <div className="mt-1.5 h-1 rounded-full overflow-hidden"
                       style={{background:'rgba(77,184,122,0.1)'}}>
                    <div className="h-full rounded-full transition-all duration-700"
                         style={{width:`${r.pct}%`, background:'var(--primary)'}}/>
                  </div>
                )}
              </div>
            </div>
          ))}

          {reasons.length === 0 && (
            <p className="text-sm text-center py-4" style={{color:'var(--text-muted)'}}>
              No specific reasons available
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-1">
          <button onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{background:'var(--primary)'}}>
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}


// ── Recipe Card ───────────────────────────────────────────────────────────────
function RecipeCard({ recipe, onLike, onDislike, onAddToPlan, onWhy, mealType, onMealTypeChange, liked, added }) {
  const [open,    setOpen]    = useState(false)
  const macroScore = recipe.macro_score || 0
  const chips      = recipe.reason_chips || []
  const macroColor = macroScore >= 0.80 ? '#4DB87A'
                   : macroScore >= 0.60 ? '#f59e0b' : '#ef4444'

  return (
    <div className={`rounded-2xl border-2 transition-all duration-200 overflow-hidden
      ${liked
        ? 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-500/5'
        : 'border-slate-200 dark:border-[#143D22] hover:border-[#86efac]'}`}>
      <div className="p-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-slate-800 dark:text-white truncate">
                {recipe.recipe_name}
              </p>
              <button onClick={() => onWhy(recipe)}
                title="Why this recipe?"
                className="p-1 rounded-lg transition-all hover:bg-emerald-100 dark:hover:bg-emerald-900/30 shrink-0">
                <Info className="w-3.5 h-3.5" style={{color:'var(--text-muted)'}}/>
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{background:'var(--primary-lt)', color:'var(--primary)'}}>
                {recipe.meal_type}
              </span>
              {recipe.prep_time > 0 && (
                <span className="text-[11px] text-slate-400">{recipe.prep_time} min</span>
              )}
              {recipe.reason && (
                <span className="text-[11px] text-emerald-500 font-medium">{recipe.reason}</span>
              )}
            </div>

            {/* Reason chips */}
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {chips.map((chip, i) => (
                  <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{background:'rgba(77,184,122,0.12)', color:'#4DB87A',
                                border:'1px solid rgba(77,184,122,0.25)'}}>
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Cost + macros */}
          <div className="text-right shrink-0">
            <p className="text-lg font-bold" style={{color:'var(--primary)'}}>
              {recipe.cost?.toFixed(1)} EGP
            </p>
            <p className="text-[11px] text-slate-400 font-mono">
              {recipe.calories?.toFixed(0)} kcal · {recipe.protein?.toFixed(1)}g
            </p>
            {macroScore > 0 && (
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-[9px]" style={{color:'var(--text-muted)'}}>macro</span>
                <span className="text-[10px] font-bold" style={{color: macroColor}}>
                  {Math.round(macroScore * 100)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Macro fit bar */}
        {macroScore > 0 && (
          <div className="mt-2.5 mb-1">
            <div className="flex items-center justify-between text-[9px] mb-1"
                 style={{color:'var(--text-muted)'}}>
              <span>Nutritional fit</span>
              <span style={{color: macroColor}}>{Math.round(macroScore * 100)}%</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{background:'var(--border)'}}>
              <div className="h-full rounded-full transition-all duration-700"
                   style={{width:`${macroScore * 100}%`, background: macroColor}}/>
            </div>
          </div>
        )}

        {/* Action buttons — Row 1: Like / Skip / Ingredients */}
        <div className="flex items-center gap-2 mt-3">
          <button onClick={() => onLike(recipe)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                        transition-all border flex-1 justify-center
                        ${liked
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400'}`}>
            <Heart className="w-3.5 h-3.5" fill={liked ? 'currentColor' : 'none'}/>
            {liked ? 'Liked' : 'Like'}
          </button>

          <button onClick={() => onDislike(recipe)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                       transition-all border border-slate-300 text-slate-500 flex-1 justify-center
                       hover:bg-red-50 hover:border-red-300 hover:text-red-500
                       dark:border-[#1a4d2c] dark:hover:border-red-800">
            <ThumbsDown className="w-3.5 h-3.5"/>
            Skip
          </button>

          <button onClick={() => setOpen(o => !o)}
            title={open ? 'Hide ingredients' : 'Show ingredients'}
            className="px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all border
                       border-slate-300 text-slate-500
                       hover:bg-slate-50 dark:border-[#1a4d2c] dark:hover:bg-slate-800">
            {open ? <ChevronUp className="w-3.5 h-3.5"/> : <ChevronDown className="w-3.5 h-3.5"/>}
          </button>
        </div>

        {/* Action buttons — Row 2: Meal type + Add to Plan */}
        <div className="flex items-center gap-2 mt-2">
          {!added && (
            <select
              value={mealType}
              onChange={e => onMealTypeChange(e.target.value)}
              className="text-[11px] px-2.5 py-1.5 rounded-xl border outline-none cursor-pointer"
              style={{
                background:'var(--bg-card)',
                color:'var(--text)',
                borderColor:'var(--border)',
                colorScheme:'dark',
              }}>
              <option value="فطار" style={{background:'var(--bg-card)', color:'var(--text)'}}>Breakfast</option>
              <option value="غداء" style={{background:'var(--bg-card)', color:'var(--text)'}}>Lunch</option>
              <option value="عشاء" style={{background:'var(--bg-card)', color:'var(--text)'}}>Dinner</option>
              <option value="سناك" style={{background:'var(--bg-card)', color:'var(--text)'}}>Snack</option>
            </select>
          )}
          <button onClick={() => onAddToPlan(recipe)}
            disabled={added}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                        transition-all border flex-1 justify-center
                        ${added
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'border-blue-300 text-blue-500 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400'}`}>
            {added
              ? <><Check className="w-3.5 h-3.5"/> Added to Plan</>
              : <><BookmarkPlus className="w-3.5 h-3.5"/> Add to Plan</>
            }
          </button>
        </div>
      </div>

      {/* Ingredients panel */}
      {open && (
        <div className="px-4 pb-4 border-t border-slate-100 dark:border-[#143D22] pt-3">
          <div className="flex flex-wrap gap-1.5">
            {recipe.ingredients?.map((ing, i) => (
              <div key={i} className="text-[10px] rounded-lg px-2 py-1"
                   style={{background:'var(--primary-lt)'}}>
                <span className="font-medium" style={{color:'var(--text)'}}>
                  {ing.display_name || ing.name}
                </span>
                <span className="text-slate-400 ml-1">{ing.weight_g}g</span>
                {ing.cost_egp > 0 && (
                  <span className="ml-1" style={{color:'var(--primary)'}}>
                    {ing.cost_egp?.toFixed(1)} EGP
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PersonalizePage() {
  const { user } = useAuthStore()

  const [data, setData] = useState({ recommendations: [], liked_count: 0, method: 'cold_start', message: 'Click Refresh to load your personalized recommendations' })
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [liked,      setLiked]      = useState({})       // {recipe_id: true}
  const [hidden,     setHidden]     = useState({})       // disliked → hidden
  const [added,      setAdded]      = useState({})       // added to plan
  const [mealType,   setMealType]   = useState(null)
  const [sortBy,     setSortBy]     = useState('best')   // best | cost | protein
  const [tab,        setTab]        = useState('all')    // all | likes
  const [whyRecipe,    setWhyRecipe]    = useState(null)     // modal
  const [likedRecipes, setLikedRecipes] = useState([])       // full list from backend

  // Budget & protein come from user profile automatically — no manual input
  const budget  = user?.daily_budget_egp || null
  const protein = null   // no protein filter — let taste similarity decide

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams()
      if (budget)   params.set('budget_egp', budget)
      if (mealType) params.set('meal_type',  mealType)
      params.set('top_k', '12')
      const res = await API(`/personalize/recommendations?${params}`)
      if (res.status === 'error') throw new Error(res.message)
      setData(res)
      setHidden({})

      // Pre-populate liked from backend flag
      const backendLiked = {}
      ;(res.recommendations || []).forEach(r => {
        if (r.is_liked || r.user_liked) backendLiked[r.recipe_id] = true
      })
      if (Object.keys(backendLiked).length > 0) {
        setLiked(prev => ({ ...prev, ...backendLiked }))
      }

      // Fetch full liked recipes list for My Likes tab
      try {
        const likedRes = await API('/personalize/liked-recipes')
        if (likedRes?.recipes && Array.isArray(likedRes.recipes)) {
          setLikedRecipes(likedRes.recipes)
          // Also mark all of them as liked locally
          const allLiked = {}
          likedRes.recipes.forEach(r => { allLiked[r.recipe_id] = true })
          setLiked(prev => ({ ...prev, ...allLiked }))
        }
      } catch {}
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [budget, mealType])

  useEffect(() => {}, [])
         
  // ── Interactions ────────────────────────────────────────────────────────────
  const recordInteraction = (recipe, type) =>
    API('/personalize/interact', {
      method: 'POST',
      body: JSON.stringify({
        recipe_id:        recipe.recipe_id,
        recipe_name:      recipe.recipe_name,
        interaction_type: type,
      }),
    })

  const handleLike = async (recipe) => {
    const id = recipe.recipe_id
    if (liked[id]) {
      setLiked(l => { const { [id]: _, ...r } = l; return r })
    } else {
      setLiked(l => ({ ...l, [id]: true }))
      setHidden(h => { const { [id]: _, ...r } = h; return r })
      await recordInteraction(recipe, 'liked')
      setTimeout(load, 800)   // refresh to get updated recommendations
    }
  }

  const handleDislike = async (recipe) => {
    const id = recipe.recipe_id
    // Hide immediately from UI
    setHidden(h => ({ ...h, [id]: true }))
    setLiked(l => { const { [id]: _, ...r } = l; return r })
    await recordInteraction(recipe, 'disliked')
    // No reload — just hide. User can Refresh manually.
  }

  // meal type selector per card — default غداء
  const [cardMealType, setCardMealType] = useState({})

  const handleAddToPlan = async (recipe) => {
    const id   = recipe.recipe_id
    const type = cardMealType[id] || 'غداء'
    setAdded(a => ({ ...a, [id]: true }))
    try {
      const token = localStorage.getItem('access_token')
      const authH = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

      const mealData = {
        recipe_name:  recipe.recipe_name,
        meal_type:    type,
        calories:     Math.round(recipe.calories  || 0),
        protein_g:    parseFloat((recipe.protein  || 0).toFixed(1)),
        carbs_g:      parseFloat((recipe.carbs    || 0).toFixed(1)),
        fats_g:       parseFloat((recipe.fats     || 0).toFixed(1)),
        cost_egp:     parseFloat((recipe.cost     || 0).toFixed(2)),
      }

      // 1. Save to meal_plans (History) first — get plan_id
      let planId = null
      try {
        const planRes = await fetch('/api/v1/optimize/add-meal', {
          method: 'POST', headers: authH,
          body: JSON.stringify(mealData),
        }).then(r => r.ok ? r.json() : null)
        planId = planRes?.plan_id || null
      } catch {}

      // 2. Log to meal_logs (Today's Goals) with plan_id link
      await fetch('/api/v1/optimize/log-meal', {
        method: 'POST', headers: authH,
        body: JSON.stringify({
          ...mealData,
          recipe_id: recipe.recipe_id || null,
          day_num:   1,        // ← today (was 0 = bug)
          plan_id:   planId,   // ← link so delete clears both tables
        }),
      })

      // 3. Record interaction for AI improvement
      await recordInteraction(recipe, 'planned')

    } catch {
      setAdded(a => { const { [id]: _, ...r } = a; return r })
    }
  }

  // Filter out hidden (disliked) recipes from display
  const visibleRecs = (data?.recommendations || []).filter(
    r => !hidden[r.recipe_id]
  )

  // Filter by tab + sort
  const displayedRecs = (() => {
    let recs = tab === 'likes'
      ? (likedRecipes.length > 0 ? likedRecipes : visibleRecs.filter(r => liked[r.recipe_id]))
      : visibleRecs

    if (sortBy === 'cost') {
      recs = [...recs].sort((a, b) => (a.cost || 0) - (b.cost || 0))
    } else if (sortBy === 'protein') {
      recs = [...recs].sort((a, b) => (b.protein || 0) - (a.protein || 0))
    }
    return recs
  })()

  const likedCount = data?.liked_count || 0
  const threshold  = 3
  const pct        = Math.min(100, (likedCount / threshold) * 100)

  return (
    <div className="page-enter space-y-5 max-w-4xl">
      <SectionHeader
        title="Personalized for You"
        subtitle="History-based recommendations · Ge et al. (2015)"
      />

      {/* Filters — meal type only, no budget/protein inputs */}
      <div className="flex items-center gap-3 flex-wrap p-4 rounded-2xl border"
           style={{borderColor:'var(--border)', background:'var(--card)'}}>
        <div className="flex gap-1">
          {MEAL_TYPES.map(m => (
            <button key={String(m.key)} onClick={() => setMealType(m.key)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all
                          ${mealType === m.key
                            ? 'border-[#2D7A4F] bg-green-50 dark:bg-green-900/20 text-[#2D7A4F]'
                            : 'border-slate-200 dark:border-[#143D22] text-slate-500'}`}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Budget display (read-only from profile) */}
        {budget && (
          <span className="text-xs px-3 py-1 rounded-lg"
                style={{background:'var(--primary-lt)', color:'var(--primary)'}}>
            💰 {budget} EGP budget
          </span>
        )}

        {/* Protein display from profile */}
        {user?.daily_protein_g > 0 && (
          <span className="text-xs px-3 py-1 rounded-lg"
                style={{background:'var(--primary-lt)', color:'var(--primary)'}}>
            💪 {user.daily_protein_g}g protein target
          </span>
        )}

        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold
                     transition-all ml-auto"
          style={{background:'var(--primary)', color:'#fff', opacity: loading ? 0.7 : 1}}>
          {loading
            ? <Spinner size="sm"/>
            : <RefreshCw className="w-3.5 h-3.5"/>}
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl text-sm text-red-400"
             style={{background:'rgba(239,68,68,0.08)'}}>
          ❌ {error}
        </div>
      )}

      {loading && (
        <div className="py-16 flex flex-col items-center gap-3">
          <Spinner size="lg"/>
          <p className="text-sm text-slate-500">Loading recommendations...</p>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Personalization progress — different UI before/after threshold */}
          {likedCount < threshold ? (
            <div className="p-4 rounded-2xl border"
                 style={{borderColor:'rgba(77,184,122,0.3)', background:'rgba(77,184,122,0.05)'}}>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-semibold" style={{color:'var(--text)'}}>
                  🎯 Personalization Progress
                </p>
                <span className="text-sm font-bold" style={{color:'var(--primary)'}}>
                  {likedCount}/{threshold} likes
                </span>
              </div>
              <div className="w-full rounded-full h-2 mb-2" style={{background:'var(--border)'}}>
                <div className="h-2 rounded-full transition-all"
                     style={{
                       width: `${pct}%`,
                       background: 'linear-gradient(90deg, #2D7A4F, #4ade80)',
                     }}/>
              </div>
              <p className="text-xs" style={{color:'var(--text-muted)'}}>
                Like {threshold - likedCount} more meal{threshold - likedCount !== 1 ? 's' : ''} to unlock AI personalization
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl border flex items-center gap-3"
                 style={{borderColor:'rgba(77,184,122,0.3)', background:'rgba(77,184,122,0.08)'}}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                   style={{background:'rgba(77,184,122,0.15)'}}>
                <span className="text-lg">🎯</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{color:'var(--primary)'}}>
                  AI Personalization Active
                </p>
                <p className="text-xs" style={{color:'var(--text-muted)'}}>
                  Recommendations based on {likedCount} liked meal{likedCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}

          {/* Method badge */}
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-xl text-xs font-semibold
                             ${data.method === 'personalized'
                               ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                               : 'bg-slate-100 dark:bg-[#134d26] text-slate-600 dark:text-slate-400'}`}>
              {data.method === 'personalized' ? '⚡ AI Personalized' : '📊 Best Value'}
            </span>
            <p className="text-sm" style={{color:'var(--text-muted)'}}>{data.message}</p>
          </div>

          {/* Tab switcher + Sort */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex bg-slate-100 dark:bg-[#0C2118] rounded-xl p-1 gap-1"
                 style={{border:'1px solid var(--border)'}}>
              <button onClick={() => setTab('all')}
                className="px-4 py-1.5 text-xs font-medium rounded-lg transition-all"
                style={tab === 'all'
                  ? {background:'var(--primary)', color:'#fff'}
                  : {background:'transparent', color:'var(--text-muted)'}}>
                ✨ For You ({visibleRecs.length})
              </button>
              <button onClick={() => setTab('likes')}
                className="px-4 py-1.5 text-xs font-medium rounded-lg transition-all"
                style={tab === 'likes'
                  ? {background:'var(--primary)', color:'#fff'}
                  : {background:'transparent', color:'var(--text-muted)'}}>
                ❤️ My Likes ({likedRecipes.length || likedCount || 0})
              </button>
            </div>

            {tab === 'all' && (
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-3.5 h-3.5" style={{color:'var(--text-muted)'}}/>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-lg border outline-none cursor-pointer"
                  style={{
                    background:'var(--bg-card)',
                    color:'var(--text)',
                    borderColor:'var(--border)',
                    colorScheme: 'dark',
                  }}>
                  <option value="best" style={{background:'var(--bg-card)', color:'var(--text)'}}>Best Match</option>
                  <option value="cost" style={{background:'var(--bg-card)', color:'var(--text)'}}>Lowest Cost</option>
                  <option value="protein" style={{background:'var(--bg-card)', color:'var(--text)'}}>Highest Protein</option>
                </select>
              </div>
            )}
          </div>

          {/* Recipe grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedRecs.map((recipe, i) => (
              <RecipeCard
                key={recipe.recipe_id || i}
                recipe={recipe}
                onLike={handleLike}
                onDislike={handleDislike}
                onAddToPlan={handleAddToPlan}
                onWhy={setWhyRecipe}
                mealType={cardMealType[recipe.recipe_id] || 'غداء'}
                onMealTypeChange={(t) => setCardMealType(m => ({...m, [recipe.recipe_id]: t}))}
                liked={!!liked[recipe.recipe_id]}
                added={!!added[recipe.recipe_id]}
              />
            ))}
          </div>

          {displayedRecs.length === 0 && (
            <div className="py-12 text-center rounded-2xl border"
                 style={{borderColor:'var(--border)'}}>
              <p className="font-semibold" style={{color:'var(--text-muted)'}}>
                {tab === 'likes' ? 'No liked recipes yet' : 'No recipes to show'}
              </p>
              <p className="text-sm mt-1" style={{color:'var(--text-muted)'}}>
                {tab === 'likes'
                  ? 'Like some recipes to see them here'
                  : 'Press Refresh to load new recommendations'}
              </p>
            </div>
          )}
        </>
      )}

      {/* Why this recipe modal */}
      {whyRecipe && <WhyModal recipe={whyRecipe} onClose={() => setWhyRecipe(null)}/>}
    </div>
  )
}
