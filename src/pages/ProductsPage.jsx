import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import {
  Upload, Search, RefreshCw, Link2, Package,
  Store, Tag, ShieldAlert, Pencil, Check, X, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { productAPI, matchAPI } from '../services/api'
import { Card, Badge, Spinner, Alert, SectionHeader, StatCard, Button } from '../components/UI'
import { useAuthStore } from '../store/authStore'

const PAGE_SIZE = 50

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

export default function ProductsPage() {
  return <AdminGuard><ProductsContent /></AdminGuard>
}

// ── Inline edit row ───────────────────────────────────────────────────────────
function EditableRow({ product, onSave, onCancel }) {
  const [form, setForm] = useState({
    product_name: product.product_name || '',
    category:     product.category     || '',
    price:        product.price        || 0,
    unit_weight_g:product.unit_weight_g|| 1000,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <tr className="bg-green-50/40 dark:bg-green-900/20">
      <td className="py-2 pr-2">
        <input className="input text-xs py-1 px-2 w-full" value={form.product_name}
          onChange={e => set('product_name', e.target.value)} />
      </td>
      <td className="py-2 pr-2">
        <input className="input text-xs py-1 px-2 w-full" value={form.category}
          onChange={e => set('category', e.target.value)} />
      </td>
      <td className="py-2 pr-2">
        <Badge variant="gray">{product.source}</Badge>
      </td>
      <td className="py-2 pr-2">
        <input className="input text-xs py-1 px-2 w-24" type="number" step="0.01"
          value={form.price} onChange={e => set('price', parseFloat(e.target.value) || 0)} />
      </td>
      <td className="py-2 pr-2">
        <input className="input text-xs py-1 px-2 w-24" type="number"
          value={form.unit_weight_g}
          onChange={e => set('unit_weight_g', parseInt(e.target.value) || 1000)} />
      </td>
      <td className="py-2">
        <div className="flex gap-1">
          <button onClick={() => onSave(product.id, form)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ background: 'var(--primary)', color: '#fff' }}>
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={onCancel}
            className="p-1.5 rounded-lg transition-colors"
            style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── Main content ──────────────────────────────────────────────────────────────
function ProductsContent() {
  const [products,    setProducts]    = useState([])
  const [total,       setTotal]       = useState(0)
  const [stats,       setStats]       = useState(null)
  const [upload,      setUpload]      = useState(null)
  const [matching,    setMatching]    = useState(false)
  const [matchResult, setMatchResult] = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [search,      setSearch]      = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page,        setPage]        = useState(0)
  const [editingId,   setEditingId]   = useState(null)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveMsg,     setSaveMsg]     = useState('')

  // Load products with pagination + search
 const loadProducts = useCallback(async (pg = 0, q = '') => {
    setLoading(true)
    try {
      const params = { limit: PAGE_SIZE, offset: pg * PAGE_SIZE }
      if (q) params.search = q
      const res = await productAPI.list(params)
      // api.js normalizes: res.data = items array, res.total = total count
      setProducts(Array.isArray(res.data) ? res.data : [])
      setTotal(res.total || res.data?.length || 0)
    } finally { setLoading(false) }
}, [])

  const loadStats = useCallback(async () => {
    const { data } = await productAPI.stats()
    setStats(data)
  }, [])

  useEffect(() => { loadProducts(0, ''); loadStats() }, [])

  // Search handler
  const handleSearch = (q) => {
    setSearch(q)
    setPage(0)
    loadProducts(0, q)
  }

  // Page change
  const goPage = (pg) => {
    setPage(pg)
    loadProducts(pg, search)
  }

  // Save edit
  const handleSave = async (id, form) => {
    setSaveLoading(true)
    setSaveMsg('')
    try {
      await productAPI.update(id, form)
      setEditingId(null)
      setSaveMsg('✅ Saved!')
      loadProducts(page, search)
      loadStats()
      setTimeout(() => setSaveMsg(''), 2000)
    } catch (e) {
      setSaveMsg('❌ ' + (e.response?.data?.detail || 'Save failed'))
    } finally { setSaveLoading(false) }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.csv'] },
    maxFiles: 1,
    onDrop: async ([file]) => {
      if (!file) return
      setLoading(true); setUpload(null)
      try {
        const { data } = await productAPI.upload(file)
        setUpload(data)
        loadProducts(0, search)
        loadStats()
      } catch (e) {
        setUpload({ message: e.response?.data?.detail || 'Upload failed', errors: 1 })
      } finally { setLoading(false) }
    },
  })

  const runMatching = async () => {
    setMatching(true); setMatchResult(null)
    try { const { data } = await matchAPI.run({ force_rematch: false }); setMatchResult(data) }
    finally { setMatching(false) }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="page-enter space-y-6">
      <SectionHeader
        title="Products"
        subtitle="Market prices from Carrefour, Spinneys, and more"
        action={<Badge variant="orange"><ShieldAlert className="w-3 h-3" /> Admin Only</Badge>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Products" value={stats?.total_products?.toLocaleString()} icon={Package} color="orange" />
        <StatCard label="Sources"        value={stats?.sources?.length}                  icon={Store}   color="emerald" />
        <StatCard label="Categories"     value={stats?.categories?.length}               icon={Tag}     color="blue" />
        <StatCard label="Last Inserted"  value={upload?.inserted ?? '—'}                 icon={Upload}  color="violet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel */}
        <div className="space-y-4">
          {/* Upload */}
          <Card>
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4 text-green-600" /> Upload CSV
            </h3>
            <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
              ${isDragActive ? 'border-green-500 bg-green-50 dark:bg-green-600/10'
                : 'border-slate-300 dark:border-green-800/50 hover:border-green-500 hover:bg-green-50/40 dark:hover:bg-green-600/5'}`}>
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-2">
                {loading ? <Spinner size="md" /> : <Upload className={`w-8 h-8 ${isDragActive ? 'text-green-600' : 'text-slate-300 dark:text-slate-600'}`} />}
                <p className="text-sm font-medium text-slate-600 dark:text-green-200/60">
                  {isDragActive ? 'Drop it here!' : loading ? 'Uploading...' : 'Drop CSV or click to browse'}
                </p>
                <p className="text-xs text-slate-400">source, sku, category, product_name, price</p>
              </div>
            </div>
            {upload && (
              <div className={`mt-3 p-3 rounded-xl text-xs ${upload.errors > 0
                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'}`}>
                <p className="font-medium">{upload.message}</p>
                {upload.inserted > 0 && (
                  <p className="mt-1 opacity-80">✅ {upload.inserted} new · 🔄 {upload.updated} updated · ⏭ {upload.skipped} skipped</p>
                )}
              </div>
            )}
          </Card>

          {/* Matcher */}
          <Card>
            <h3 className="font-semibold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-green-600" /> Run Matching
            </h3>
            <p className="text-xs text-slate-500 dark:text-green-200/60 mb-4 leading-relaxed">
              Links products to nutrition facts using Fuzzy + Embedding matching.
            </p>
            <Button variant="primary" className="w-full" onClick={runMatching} loading={matching}
              icon={<RefreshCw className="w-4 h-4" />}>
              {matching ? 'Matching...' : 'Run Matcher'}
            </Button>
            {matchResult && (
              <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-green-900/30 space-y-1.5 text-xs">
                {[['Matched', matchResult.matched, 'text-emerald-500'],
                  ['Unmatched', matchResult.unmatched, 'text-red-500'],
                  ['High confidence', matchResult.high_confidence, 'text-green-600'],
                ].map(([l, v, c]) => (
                  <div key={l} className="flex justify-between">
                    <span className="text-slate-500 dark:text-green-200/60">{l}</span>
                    <span className={`font-semibold ${c}`}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Table */}
        <div className="lg:col-span-2">
          <Card>
            {/* Search + status */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className="input pl-9"
                  placeholder="Search products..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch(searchInput)}
                />
              </div>
              <button
                onClick={() => handleSearch(searchInput)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-white"
                style={{ background: 'var(--primary)' }}>
                Search
              </button>
              {search && (
                <button onClick={() => { setSearchInput(''); handleSearch('') }}
                  className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Clear
                </button>
              )}
              <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                {total.toLocaleString()} total
              </span>
            </div>

            {saveMsg && (
              <div className={`mb-3 p-2 rounded-lg text-xs text-center font-medium
                ${saveMsg.startsWith('✅') ? 'bg-green-50 dark:bg-green-900/20 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {saveMsg}
              </div>
            )}

            {/* Table */}
            <div className="overflow-auto max-h-[520px] scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white dark:bg-[#0d2818] z-10">
                  <tr className="border-b border-slate-200 dark:border-green-900/50">
                    {['Product', 'Category', 'Source', 'Price', 'Weight (g)', ''].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-500 dark:text-green-200/60 pb-3 pr-3 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="py-12 text-center"><Spinner /></td></tr>
                  ) : products.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                      {search ? 'No results' : 'No products yet — upload a CSV to get started'}
                    </td></tr>
                  ) : products.map(p => (
                    editingId === p.id ? (
                      <EditableRow key={p.id} product={p}
                        onSave={handleSave}
                        onCancel={() => setEditingId(null)} />
                    ) : (
                      <tr key={p.id}
                        className="border-b border-slate-50 dark:border-green-900/30 hover:bg-slate-50 dark:hover:bg-green-900/20 transition-colors group">
                        <td className="py-2.5 pr-3 font-medium text-slate-800 dark:text-green-50 max-w-[180px] truncate" title={p.product_name}>
                          {p.product_name}
                        </td>
                        <td className="py-2.5 pr-3 text-xs text-slate-500 dark:text-green-200/60 whitespace-nowrap">
                          {p.category || '—'}
                        </td>
                        <td className="py-2.5 pr-3">
                          <Badge variant="gray">{p.source}</Badge>
                        </td>
                        <td className="py-2.5 pr-3 font-mono font-semibold text-green-600 whitespace-nowrap">
                          {p.price?.toFixed(2)}
                        </td>
                        <td className="py-2.5 pr-3 text-xs text-slate-500 dark:text-green-200/60">
                          {p.unit_weight_g ? `${p.unit_weight_g}g` : '—'}
                        </td>
                        <td className="py-2.5">
                          <button
                            onClick={() => setEditingId(p.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all"
                            style={{ background: 'var(--primary-lt)', color: 'var(--primary)' }}
                            title="Edit product">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t"
                   style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={() => goPage(page - 1)}
                  disabled={page === 0}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-40"
                  style={{ background: 'var(--border)', color: 'var(--text)' }}>
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    // Show first, last, current ±1, and ellipsis
                    const pages = []
                    if (totalPages <= 7) return i
                    if (i === 0) return 0
                    if (i === 6) return totalPages - 1
                    return page - 2 + i
                  }).filter(p => p >= 0 && p < totalPages).map((pg, i, arr) => (
                    <span key={pg}>
                      {i > 0 && arr[i-1] !== pg - 1 && (
                        <span className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>…</span>
                      )}
                      <button
                        onClick={() => goPage(pg)}
                        className="w-8 h-8 rounded-xl text-xs font-medium transition-all"
                        style={{
                          background: pg === page ? 'var(--primary)' : 'var(--border)',
                          color: pg === page ? '#fff' : 'var(--text)',
                        }}>
                        {pg + 1}
                      </button>
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => goPage(page + 1)}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-40"
                  style={{ background: 'var(--border)', color: 'var(--text)' }}>
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
