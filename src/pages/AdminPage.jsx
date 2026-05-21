import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import {
  ShieldAlert, Upload, CheckCircle2,
  AlertCircle, Database, RefreshCw,
} from 'lucide-react'
import { adminAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { Card, Button, Spinner, Alert, SectionHeader, StatCard } from '../components/UI'

// ── Admin Guard ───────────────────────────────────────────────────────────────
function AdminGuard({ children }) {
  const { user } = useAuthStore()
  const navigate  = useNavigate()
  if (user?.is_admin) return children
  return (
    <div className="page-enter flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="p-5 rounded-2xl bg-red-50 dark:bg-red-900/20 mb-4">
        <ShieldAlert className="w-10 h-10 text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
        Admin Access Required
      </h2>
      <p className="text-sm text-slate-500 dark:text-[#56A870] max-w-xs mb-6">
        This page is restricted to administrators only.
      </p>
      <Button variant="outline" onClick={() => navigate('/dashboard')}>
        ← Back to Dashboard
      </Button>
    </div>
  )
}

// ── Single upload card ────────────────────────────────────────────────────────
function UploadCard({ title, description, columns, uploadFn, accept = '.csv', color = 'orange' }) {
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const onDrop = useCallback(async (accepted) => {
    const file = accepted[0]
    if (!file) return
    setLoading(true); setResult(null); setError(null)
    try {
      const { data } = await uploadFn(file)
      setResult(data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Upload failed')
    } finally { setLoading(false) }
  }, [uploadFn])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: accept === '.csv'
      ? { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.csv'] }
      : { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
          'text/csv': ['.csv'] },
  })

  const borderColor = isDragActive
    ? 'border-[#2D7A4F] bg-green-50 dark:bg-green-900/20'
    : 'border-slate-300 dark:border-[#1a4d2c] hover:border-[#2D7A4F] dark:hover:border-[#2D7A4F] hover:bg-green-50/40 dark:hover:bg-green-500/5'

  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-white">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-[#56A870] mt-0.5">{description}</p>
        </div>
        <Database className="w-5 h-5 text-[#2D7A4F] dark:text-[#4DB87A] shrink-0 mt-0.5" />
      </div>

      {/* Column hint */}
      <div className="mb-3 px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#134d26]/40">
        <p className="text-[10px] font-mono text-slate-400 break-all">{columns}</p>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${borderColor}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-1.5">
          {loading
            ? <Spinner size="md" />
            : <Upload className={`w-6 h-6 ${isDragActive ? 'text-[#2D7A4F] dark:text-[#4DB87A]' : 'text-slate-300 dark:text-slate-600'}`} />
          }
          <p className="text-xs font-medium text-slate-600 dark:text-[#56A870]">
            {loading ? 'Uploading...' : isDragActive ? 'Drop it!' : `Drop ${accept.toUpperCase()} or click`}
          </p>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-xs text-emerald-700 dark:text-emerald-300">
          <div className="flex items-center gap-1.5 font-semibold mb-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Upload successful
          </div>
          <div className="space-y-0.5 font-mono">
            <p>✅ Inserted: {result.inserted}</p>
            <p>⏭ Skipped:  {result.skipped}</p>
            <p>📦 Total:    {result.total}</p>
          </div>
        </div>
      )}
      {error && (
        <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-xs text-red-700 dark:text-red-300 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {error}
        </div>
      )}
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
function AdminContent() {
  const [stats,        setStats]        = useState(null)
  const [loadingStats, setLoadingStats] = useState(false)

  const fetchStats = async () => {
    setLoadingStats(true)
    try { const { data } = await adminAPI.stats(); setStats(data) }
    finally { setLoadingStats(false) }
  }

  const UPLOADS = [
    {
      title:       'Products CSV',
      description: 'Egypt market prices — Carrefour, Spinneys, Hyperone',
      columns:     'source · sku · category · product_name · price · unit_weight_g',
      uploadFn:    adminAPI.uploadProducts,
      key:         'products',
    },
    {
      title:       'Nutrition Facts CSV',
      description: 'Ingredients with macros per 100g',
      columns:     'normalized_name · display_name · calories_per_100g · protein_g · carbs_g · fats_g · fiber_g · data_source',
      uploadFn:    adminAPI.uploadNutrition,
      key:         'nutrition',
    },
    {
      title:       'Ingredient → Product Mapping',
      description: 'Links recipe ingredients to market products with price_per_100g',
      columns:     'ingredient_key · sku · source · product_name · price_egp · unit_weight_g · price_per_100g',
      uploadFn:    adminAPI.uploadMapping,
      key:         'mapping',
    },
    {
      title:       'Recipes / Meals CSV',
      description: 'Egyptian and famous recipes with ingredients JSON',
      columns:     'recipe_id · recipe_name · meal_type · ingredients_json · instructions · prep_time',
      uploadFn:    adminAPI.uploadRecipes,
      key:         'recipes',
    },
  ]

  // DB table name mapping
  const TABLE_MAP = {
    fresh_products:        'Products',
    nutrition_facts:       'Nutrition Facts',
    ingredient_product_map:'Ingredient Mapping',
    recipes:               'Recipes',
  }

  return (
    <div className="page-enter space-y-6">
      <SectionHeader
        title="Admin — Dataset Upload"
        subtitle="Upload all 4 datasets in order: Products → Nutrition → Mapping → Recipes"
        action={
          <Button variant="outline" size="sm" onClick={fetchStats} loading={loadingStats}
            icon={<RefreshCw className="w-4 h-4" />}>
            Refresh Stats
          </Button>
        }
      />

      {/* Upload order guide */}
      <Card className="border-green-200 dark:border-green-800/40 bg-green-50/50 dark:bg-green-900/10">
        <p className="text-xs font-semibold text-[#1B5E38] dark:text-[#4DB87A] uppercase tracking-wider mb-3">
          📋 Upload Order (Important)
        </p>
        <div className="flex flex-wrap gap-2 items-center text-xs text-slate-600 dark:text-[#56A870]">
          {['1 · Products CSV', '→', '2 · Nutrition Facts', '→', '3 · Ingredient Mapping', '→', '4 · Recipes'].map((s, i) => (
            <span key={i} className={s === '→' ? 'text-slate-300 dark:text-slate-600' :
              'px-2 py-1 bg-white dark:bg-[#0C2118] rounded-lg border border-slate-200 dark:border-[#143D22] font-medium'}>
              {s}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 dark:text-[#56A870] mt-2">
          After uploading Products + Nutrition + Mapping → go to <strong>Products page</strong> and run the matcher.
          The Optimizer will then use <code className="text-[#2D7A4F] dark:text-[#4DB87A]">price_per_100g</code> for accurate cost calculations.
        </p>
      </Card>

      {/* DB stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(stats).map(([table, count]) => (
            <StatCard
              key={table}
              label={TABLE_MAP[table] || table}
              value={count?.toLocaleString()}
              icon={Database}
              color="green"
            />
          ))}
        </div>
      )}

      {/* Upload cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {UPLOADS.map(u => (
          <UploadCard key={u.key} {...u} />
        ))}
      </div>

    </div>
  )
}

export default function AdminPage() {
  return <AdminGuard><AdminContent /></AdminGuard>
}