import { useState, useEffect } from 'react'
import { BookOpen, Clock, Search, ChevronDown, ChevronUp, UtensilsCrossed, Pencil, Trash2, Plus, X, Check } from 'lucide-react'
import { recipeAPI } from '../services/api'
import { Card, Badge, Spinner, SectionHeader, StatCard, Button } from '../components/UI'
import { useAuthStore } from '../store/authStore'

const MEAL_TYPES = ['All', 'فطار', 'غداء', 'عشاء']
const TYPE_COLORS = { 'فطار': 'orange', 'غداء': 'blue', 'عشاء': 'green' }

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ recipe, onClose, onSave }) {
  const [name,   setName]   = useState(recipe?.recipe_name || '')
  const [type,   setType]   = useState(recipe?.meal_type   || 'غداء')
  const [time,   setTime]   = useState(recipe?.prep_time   || 30)
  const [instr,  setInstr]  = useState(recipe?.instructions || '')
  const [ings,   setIngs]   = useState(
    recipe?.ingredients?.map(i => ({ name: i.name, weight_g: i.weight_g })) || []
  )
  const [saving, setSaving] = useState(false)

  const addIng = () => setIngs(p => [...p, { name: '', weight_g: 100 }])
  const removeIng = (i) => setIngs(p => p.filter((_, j) => j !== i))
  const updateIng = (i, field, val) =>
    setIngs(p => p.map((ing, j) => j === i ? { ...ing, [field]: val } : ing))

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const { data } = await recipeAPI.update(recipe.recipe_id, {
        recipe_name:  name,
        meal_type:    type,
        prep_time:    parseInt(time) || 0,
        instructions: instr,
        ingredients:  ings.filter(i => i.name.trim()),
      })
      onSave(data)
      onClose()
    } catch (e) {
      alert('Error saving recipe')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{background:'rgba(0,0,0,0.7)'}}>
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4"
           style={{background:'var(--bg-card)'}}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{color:'var(--text)'}}>Edit Recipe</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70"
                  style={{color:'var(--text-muted)'}}>
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* Name */}
        <div>
          <label className="text-xs font-semibold mb-1 block" style={{color:'var(--text-muted)'}}>
            Recipe Name
          </label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="input w-full" placeholder="اسم الوصفة"/>
        </div>

        {/* Meal type + time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{color:'var(--text-muted)'}}>Meal Type</label>
            <select value={type} onChange={e => setType(e.target.value)}
              className="input w-full" style={{background:'var(--bg-card)',color:'var(--text)'}}>
              <option value="فطار">فطار</option>
              <option value="غداء">غداء</option>
              <option value="عشاء">عشاء</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{color:'var(--text-muted)'}}>Prep Time (min)</label>
            <input type="number" value={time} onChange={e => setTime(e.target.value)}
              className="input w-full" min="0"/>
          </div>
        </div>

        {/* Ingredients */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold" style={{color:'var(--text-muted)'}}>Ingredients</label>
            <button onClick={addIng}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
              style={{background:'var(--primary-lt)',color:'var(--primary)'}}>
              <Plus className="w-3 h-3"/> Add
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {ings.map((ing, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input value={ing.name} onChange={e => updateIng(i,'name',e.target.value)}
                  className="input flex-1 text-xs" placeholder="ingredient key"/>
                <input type="number" value={ing.weight_g} onChange={e => updateIng(i,'weight_g',parseInt(e.target.value)||0)}
                  className="input w-20 text-xs" placeholder="g"/>
                <button onClick={() => removeIng(i)} className="p-1 rounded hover:opacity-70"
                        style={{color:'#ef4444'}}>
                  <X className="w-3.5 h-3.5"/>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div>
          <label className="text-xs font-semibold mb-1 block" style={{color:'var(--text-muted)'}}>
            Instructions (optional)
          </label>
          <textarea value={instr} onChange={e => setInstr(e.target.value)}
            className="input w-full text-xs" rows={3} placeholder="طريقة التحضير..."/>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80"
            style={{borderColor:'var(--border)',color:'var(--text-muted)'}}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold btn-primary flex items-center justify-center gap-2"
            style={{opacity: saving ? 0.6 : 1}}>
            {saving ? <Spinner size="sm"/> : <Check className="w-4 h-4"/>}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RecipesPage() {
  const { user }  = useAuthStore()
  const isAdmin   = user?.is_admin || user?.role === 'admin'

  const [recipes,  setRecipes]  = useState([])
  const [stats,    setStats]    = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [mealType, setMealType] = useState('All')
  const [expanded, setExpanded] = useState(null)
  const [page,     setPage]     = useState(0)
  const [editing,  setEditing]  = useState(null)   // recipe being edited

  const PAGE_SIZE = 24

  useEffect(() => {
    recipeAPI.stats().then(r => setStats(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    recipeAPI.list({
      meal_type: mealType !== 'All' ? mealType : undefined,
      q:         search || undefined,
      limit:     PAGE_SIZE,
      offset:    page * PAGE_SIZE,
    }).then(r => {
      setRecipes(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [mealType, search, page])

  const toggle = (id) => setExpanded(e => e === id ? null : id)

  const handleSaved = (updated) => {
    setRecipes(prev => prev.map(r => r.recipe_id === updated.recipe_id ? {
      ...r, ...updated,
      ingredients: updated.ingredients,
    } : r))
    // Refresh stats
    recipeAPI.stats().then(r => setStats(r.data)).catch(() => {})
  }

  const handleDelete = async (recipe) => {
    if (!window.confirm(`Delete "${recipe.recipe_name}"? This cannot be undone.`)) return
    try {
      await recipeAPI.delete(recipe.recipe_id)
      setRecipes(prev => prev.filter(r => r.recipe_id !== recipe.recipe_id))
      recipeAPI.stats().then(r => setStats(r.data)).catch(() => {})
    } catch {
      alert('Error deleting recipe')
    }
  }

  return (
    <div className="page-enter space-y-6">
      <SectionHeader
        title="Egyptian Recipes"
        subtitle={`${stats?.total || 316} traditional recipes with nutrition data`}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Recipes" value={stats?.total}                           icon={BookOpen}         color="green" />
        <StatCard label="Breakfast"     value={stats?.by_meal_type?.['فطار']}          icon={UtensilsCrossed}  color="emerald" />
        <StatCard label="Lunch"         value={stats?.by_meal_type?.['غداء']}          icon={UtensilsCrossed}  color="blue" />
        <StatCard label="Dinner"        value={stats?.by_meal_type?.['عشاء']}          icon={UtensilsCrossed}  color="violet" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search recipes..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} />
        </div>
        <div className="flex bg-slate-100 dark:bg-[#0C2118] rounded-xl p-1 gap-1 shrink-0">
          {MEAL_TYPES.map(t => (
            <button key={t} onClick={() => { setMealType(t); setPage(0) }}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                mealType === t
                  ? 'bg-white dark:bg-[#134d26] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-[#56A870] hover:text-slate-700'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Recipes grid */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : recipes.length === 0 ? (
        <Card className="py-16 text-center">
          <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-[#56A870]">No recipes found.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map(recipe => (
            <Card key={recipe.recipe_id} className="flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 dark:text-white leading-snug">
                    {recipe.recipe_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant={TYPE_COLORS[recipe.meal_type] || 'gray'}>
                      {recipe.meal_type}
                    </Badge>
                    {recipe.prep_time > 0 && (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="w-3 h-3" /> {recipe.prep_time} min
                      </span>
                    )}
                  </div>
                </div>

                {/* Admin action buttons */}
                {isAdmin && (
                  <div className="flex gap-1 shrink-0 ml-2">
                    <button onClick={() => setEditing(recipe)}
                      className="p-1.5 rounded-lg transition-all hover:opacity-70"
                      style={{background:'var(--primary-lt)',color:'var(--primary)'}}
                      title="Edit recipe">
                      <Pencil className="w-3.5 h-3.5"/>
                    </button>
                    <button onClick={() => handleDelete(recipe)}
                      className="p-1.5 rounded-lg transition-all hover:opacity-70"
                      style={{background:'rgba(239,68,68,0.1)',color:'#ef4444'}}
                      title="Delete recipe">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                )}
              </div>

              {/* Ingredient summary */}
              <p className="text-xs text-slate-500 dark:text-[#56A870] mb-3">
                {recipe.ingredients?.length} ingredients · {recipe.ingredients?.map(i => i.name).slice(0, 3).join(', ')}
                {recipe.ingredients?.length > 3 && '...'}
              </p>

              {/* Expand toggle */}
              <button onClick={() => toggle(recipe.recipe_id)}
                className="flex items-center justify-between w-full mt-auto pt-3
                           border-t border-slate-100 dark:border-[#143D22]
                           text-xs font-medium text-slate-500 dark:text-[#56A870]
                           hover:text-[#2D7A4F] transition-colors">
                <span>{expanded === recipe.recipe_id ? 'Hide details' : 'Show ingredients'}</span>
                {expanded === recipe.recipe_id
                  ? <ChevronUp className="w-4 h-4" />
                  : <ChevronDown className="w-4 h-4" />}
              </button>

              {/* Expanded ingredients */}
              {expanded === recipe.recipe_id && (
                <div className="mt-3 space-y-1.5">
                  {recipe.ingredients?.map((ing, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1.5
                                           border-b border-slate-50 dark:border-[#143D22]/50 last:border-0">
                      <span className="font-medium text-slate-700 dark:text-green-100 font-mono">
                        {ing.name}
                      </span>
                      <span className="text-slate-400 bg-[var(--primary-lt)] px-2 py-0.5 rounded-full font-mono">
                        {ing.weight_g}g
                      </span>
                    </div>
                  ))}
                  {recipe.instructions && (
                    <p className="text-xs text-slate-500 dark:text-[#56A870] pt-2 leading-relaxed">
                      {recipe.instructions}
                    </p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && recipes.length > 0 && (() => {
        const total      = stats?.total || 332
        const totalPages = Math.ceil(total / PAGE_SIZE)

        // Build page number array: [1, 2, '...', 11, 12, 13, '...', 17, 18]
        const getPages = () => {
          const pages = []
          const delta = 2
          for (let i = 0; i < totalPages; i++) {
            if (i === 0 || i === totalPages - 1 ||
                (i >= page - delta && i <= page + delta)) {
              pages.push(i)
            } else if (pages[pages.length - 1] !== '...') {
              pages.push('...')
            }
          }
          return pages
        }

        const goTo = (p) => {
          setPage(Math.max(0, Math.min(totalPages - 1, p)))
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }

        return (
          <div className="flex flex-col items-center gap-3">
            {/* Page info */}
            <p className="text-xs" style={{color:'var(--text-muted)'}}>
              عرض {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} من {total} وجبة
            </p>

            {/* Navigation row */}
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              {/* First */}
              <button onClick={() => goTo(0)} disabled={page === 0}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30"
                style={{background:'var(--card)', border:'1px solid var(--border)', color:'var(--text-muted)'}}>
                «
              </button>

              {/* Prev */}
              <button onClick={() => goTo(page - 1)} disabled={page === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30"
                style={{background:'var(--card)', border:'1px solid var(--border)', color:'var(--text)'}}>
                ← السابق
              </button>

              {/* Page numbers */}
              {getPages().map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} className="px-1 text-sm" style={{color:'var(--text-muted)'}}>…</span>
                ) : (
                  <button key={p} onClick={() => goTo(p)}
                    className="w-8 h-8 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: p === page ? 'var(--primary)' : 'var(--card)',
                      border:     `1px solid ${p === page ? 'var(--primary)' : 'var(--border)'}`,
                      color:      p === page ? '#fff' : 'var(--text)',
                      transform:  p === page ? 'scale(1.1)' : 'scale(1)',
                    }}>
                    {p + 1}
                  </button>
                )
              )}

              {/* Next */}
              <button onClick={() => goTo(page + 1)} disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30"
                style={{background:'var(--card)', border:'1px solid var(--border)', color:'var(--text)'}}>
                التالي →
              </button>

              {/* Last */}
              <button onClick={() => goTo(totalPages - 1)} disabled={page >= totalPages - 1}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30"
                style={{background:'var(--card)', border:'1px solid var(--border)', color:'var(--text-muted)'}}>
                »
              </button>
            </div>

            {/* Jump to page */}
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{color:'var(--text-muted)'}}>انتقل لصفحة:</span>
              <input type="number" min={1} max={totalPages}
                defaultValue={page + 1}
                key={page}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const v = parseInt(e.target.value)
                    if (!isNaN(v)) goTo(v - 1)
                  }
                }}
                className="w-14 text-center text-xs px-2 py-1 rounded-lg"
                style={{background:'var(--card)', border:'1px solid var(--border)', color:'var(--text)'}}
              />
              <span className="text-xs" style={{color:'var(--text-muted)'}}>من {totalPages}</span>
            </div>
          </div>
        )
      })()}

      {/* Edit modal */}
      {editing && (
        <EditModal
          recipe={editing}
          onClose={() => setEditing(null)}
          onSave={handleSaved}/>
      )}
    </div>
  )
}
