import { clsx } from 'clsx'
import {
  Sun, Moon, TrendingUp, AlertCircle,
  CheckCircle2, Info, AlertTriangle,
} from 'lucide-react'

// ── Theme store (simple module-level) ────────────────────────────────────────
export function useTheme() {
  const toggle = () => {
    const html = document.documentElement
    if (html.classList.contains('dark')) {
      html.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    } else {
      html.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    }
  }
  const isDark = () => document.documentElement.classList.contains('dark')
  return { toggle, isDark }
}

// Initialise theme from localStorage on first load
export function initTheme() {
  const saved = localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  if (saved === 'dark' || (!saved && prefersDark)) {
    document.documentElement.classList.add('dark')
  }
}

// ── ThemeToggle ───────────────────────────────────────────────────────────────
export function ThemeToggle({ className = '' }) {
  const { toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      className={clsx(
        'p-2 rounded-xl text-slate-500 dark:text-green-200/60',
        'hover:bg-slate-100 dark:hover:bg-green-900/50',
        'transition-colors', className
      )}
      aria-label="Toggle theme"
    >
      <Sun  className="w-4 h-4 hidden dark:block" />
      <Moon className="w-4 h-4 block  dark:hidden" />
    </button>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', padding = 'p-5' }) {
  return (
    <div className={clsx('card', padding, className)}>
      {children}
    </div>
  )
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({
  children, variant = 'primary', size = 'md',
  className = '', loading = false, icon, ...props
}) {
  const variants = {
    primary: 'btn-primary',
    outline: 'btn-outline',
    ghost:   'btn-ghost',
    danger:  'btn bg-red-500 hover:bg-red-600 text-white',
  }
  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: '',
    lg: 'text-base px-6 py-3',
  }
  return (
    <button
      className={clsx(variants[variant], sizes[size], className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading
        ? <Spinner size="sm" />
        : icon && <span className="shrink-0">{icon}</span>
      }
      {children}
    </button>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <input className={clsx('input', error && 'border-red-400 focus:ring-red-400', className)} {...props} />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md', className = '' }) {
  const s = { sm: 'w-4 h-4 border-2', md: 'w-6 h-6 border-2', lg: 'w-10 h-10 border-[3px]' }[size]
  return (
    <div className={clsx(
      'animate-spin rounded-full border-slate-200 border-t-green-600',
      s, className
    )} />
  )
}

// ── Alert ─────────────────────────────────────────────────────────────────────
export function Alert({ type = 'info', message, className = '' }) {
  const cfg = {
    info:    { cls: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300',    Icon: Info },
    success: { cls: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300', Icon: CheckCircle2 },
    error:   { cls: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300',          Icon: AlertCircle },
    warning: { cls: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300', Icon: AlertTriangle },
  }
  const { cls, Icon } = cfg[type]
  return (
    <div className={clsx('flex items-start gap-3 p-4 rounded-xl border text-sm', cls, className)}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ children, variant = 'green' }) {
  const v = {
    green:  'badge-green',
    orange: 'badge-orange',
    red:    'badge-red',
    gray:   'badge-slate',
    blue:   'badge-blue',
    yellow: 'badge bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
  }
  return <span className={v[variant] || 'badge-slate'}>{children}</span>
}

// ── StatCard ──────────────────────────────────────────────────────────────────
export function StatCard({ label, value, unit, icon: Icon, trend, color = 'orange' }) {
  const colors = {
    orange:  'text-green-600',
    emerald: 'text-emerald-500',
    blue:    'text-blue-500',
    violet:  'text-violet-500',
    rose:    'text-rose-500',
  }
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-green-200/60 uppercase tracking-wider mb-2">
            {label}
          </p>
          <p className={clsx('text-2xl font-bold font-mono text-slate-900 dark:text-white')}>
            {value ?? '—'}
            {unit && <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>}
          </p>
          {trend != null && (
            <div className="flex items-center gap-1 mt-1.5">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <span className="text-xs text-emerald-600 dark:text-emerald-400">{trend}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={clsx('p-2.5 rounded-xl bg-slate-100 dark:bg-green-900/40', colors[color])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </Card>
  )
}

// ── MacroBar ──────────────────────────────────────────────────────────────────
export function MacroBar({ label, value, max, unit, color = 'orange' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const colors = {
    orange: 'bg-green-600',
    emerald:'bg-emerald-500',
    blue:   'bg-blue-500',
    violet: 'bg-violet-500',
    rose:   'bg-rose-500',
  }
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="font-medium text-slate-600 dark:text-green-200/60">{label}</span>
        <span className="font-mono text-slate-500 dark:text-green-200/60">
          {typeof value === 'number' ? Math.round(value) : value}{unit}
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 dark:bg-[#134d26] rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-700', colors[color])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="page-title">{title}</h2>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="ml-4 shrink-0">{action}</div>}
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-green-900/40 mb-4">
          <Icon className="w-8 h-8 text-slate-400" />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-700 dark:text-green-100 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-green-200/60 max-w-xs mb-5">{description}</p>
      {action}
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider({ label }) {
  if (!label) return <hr className="border-slate-200 dark:border-green-900/50 my-4" />
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-slate-200 dark:bg-[#134d26]" />
      <span className="text-xs text-slate-400">{label}</span>
      <div className="flex-1 h-px bg-slate-200 dark:bg-[#134d26]" />
    </div>
  )
}
