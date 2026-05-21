import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Leaf, Eye, EyeOff, Lock, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

const FEATURES = [
  { emoji: '⚡', title: 'MILP Optimizer',     desc: 'Minimum-cost meal plans using Linear Programming' },
  { emoji: '🧠', title: 'AI Personalization', desc: 'Learns your preferences from feedback history' },
  { emoji: '📷', title: 'Vision AI',          desc: 'Analyze any meal photo for macros & cost' },
  { emoji: '🔗', title: 'Smart Matching',     desc: 'Fuzzy + embedding matching to nutrition data' },
]

// ── Password strength checker ─────────────────────────────────────────────────
function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8)                    score++
  if (pw.length >= 12)                   score++
  if (/[A-Z]/.test(pw))                  score++
  if (/[0-9]/.test(pw))                  score++
  if (/[^A-Za-z0-9]/.test(pw))          score++
  const levels = [
    { label: 'Too short',  color: '#ef4444' },
    { label: 'Weak',       color: '#ef4444' },
    { label: 'Fair',       color: '#f97316' },
    { label: 'Good',       color: '#eab308' },
    { label: 'Strong',     color: '#22c55e' },
    { label: 'Very strong',color: '#2D7A4F' },
  ]
  return { score, ...levels[Math.min(score, 5)] }
}

// ── Input component ───────────────────────────────────────────────────────────
function Input({ label, error, hint, ...props }) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>
          {label}
        </label>
      )}
      <input
        {...props}
        className="input"
        style={{
          borderColor: error ? 'rgba(239,68,68,0.5)' : undefined,
          background:  error ? 'rgba(239,68,68,0.04)' : undefined,
        }}
      />
      {error && (
        <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#ef4444' }}>
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{hint}</p>
      )}
    </div>
  )
}

// ── Alert component ───────────────────────────────────────────────────────────
function Alert({ type = 'error', children }) {
  const styles = {
    error:   { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   color: '#ef4444',  icon: <AlertCircle className="w-4 h-4 shrink-0" /> },
    success: { bg: 'rgba(45,122,79,0.08)',   border: 'rgba(45,122,79,0.25)',  color: '#22c55e',  icon: <CheckCircle className="w-4 h-4 shrink-0" /> },
  }
  const s = styles[type]
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl text-sm mb-4"
         style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
      {s.icon}
      <span>{children}</span>
    </div>
  )
}

// ── Forgot Password form ──────────────────────────────────────────────────────
function ForgotPasswordForm({ onBack }) {
  const [email,     setEmail]   = useState('')
  const [loading,   setLoading] = useState(false)
  const [sent,      setSent]    = useState(false)
  const [error,     setError]   = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error('Request failed')
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md relative z-10">
      <button onClick={onBack}
        className="flex items-center gap-2 text-sm mb-8 transition-opacity hover:opacity-70"
        style={{ color: 'var(--text-muted)' }}>
        <ArrowLeft className="w-4 h-4" /> Back to login
      </button>

      <h2 className="text-3xl font-black mb-1" style={{ color: 'var(--text)' }}>
        Forgot password? 🔐
      </h2>
      <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
        Enter your email and we'll send you a reset link.
      </p>

      {sent ? (
        <Alert type="success">
          Reset link sent! Check your inbox (and spam folder).
          The link expires in 30 minutes.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <Input
            label="Email address"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm
                       transition-all active:scale-[.98] disabled:opacity-60"
            style={{ background: 'var(--primary)', boxShadow: '0 4px 16px rgba(45,122,79,.35)' }}>
            {loading ? 'Sending...' : 'Send Reset Link →'}
          </button>
        </form>
      )}
    </div>
  )
}

// ── Reset Password form ───────────────────────────────────────────────────────
function ResetPasswordForm({ token }) {
  const navigate = useNavigate()
  const [form,    setForm]    = useState({ password: '', confirm: '' })
  const [showPw,  setShowPw]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const strength = getPasswordStrength(form.password)

  const validate = () => {
    if (form.password.length < 8)           return 'Password must be at least 8 characters'
    if (form.password !== form.confirm)     return 'Passwords do not match'
    return null
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password:         form.password,
          password_confirm: form.confirm,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Reset failed')
      }
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
         style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: 'var(--primary)' }}>
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold" style={{ color: 'var(--text)' }}>NutriBudget EG</span>
        </div>

        <h2 className="text-3xl font-black mb-1" style={{ color: 'var(--text)' }}>
          Set new password 🔒
        </h2>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
          Choose a strong password for your account.
        </p>

        {done ? (
          <Alert type="success">
            Password updated! Redirecting to login...
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert>{error}</Alert>}

            {/* New password */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input pr-11"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  required minLength={8}
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="flex-1 h-1 rounded-full transition-all"
                           style={{ background: i <= strength.score ? strength.color : 'var(--border)' }}/>
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: strength.color }}>{strength.label}</p>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              value={form.confirm}
              onChange={e => set('confirm', e.target.value)}
              error={form.confirm && form.password !== form.confirm ? "Passwords don't match" : ''}
              required
            />

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm
                         transition-all active:scale-[.98] disabled:opacity-60"
              style={{ background: 'var(--primary)', boxShadow: '0 4px 16px rgba(45,122,79,.35)' }}>
              {loading ? 'Updating...' : 'Update Password →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Main AuthPage ─────────────────────────────────────────────────────────────
export default function AuthPage() {
  const [searchParams] = useSearchParams()
  const resetToken = searchParams.get('token')

  // If there's a reset token in URL → show reset form
  if (resetToken) return <ResetPasswordForm token={resetToken} />

  const [mode,    setMode]   = useState('login')
  const [showForgot, setShowForgot] = useState(false)
  const [showPw,  setShowPw]  = useState(false)
  const [showCPw, setShowCPw] = useState(false)
  const [errors,  setErrors]  = useState({})
  const [form,    setForm]    = useState({
    email: '', password: '', password_confirm: '',
    full_name: '', daily_budget_egp: 150,
    daily_calories: 2000, daily_protein_g: 60,
  })

  const { login, signup, loading, error: authError } = useAuthStore()
  const navigate = useNavigate()

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: '' }))
  }

  const strength = getPasswordStrength(form.password)

  const validate = () => {
    const errs = {}
    if (!form.email)                          errs.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email'
    if (!form.password)                       errs.password = 'Password is required'
    else if (form.password.length < 8)        errs.password = 'At least 8 characters'

    if (mode === 'signup') {
      if (!form.full_name)                    errs.full_name = 'Name is required'
      if (form.password !== form.password_confirm)
                                              errs.password_confirm = "Passwords don't match"
      if (strength.score < 2)               errs.password = 'Password is too weak'
    }
    return errs
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})

    const ok = mode === 'login'
      ? await login(form.email, form.password)
      : await signup(form)
    if (ok) navigate('/dashboard')
  }

  // ── Forgot password view ────────────────────────────────────────────────────
  if (showForgot) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
           style={{ background: 'var(--bg)' }}>
        <ForgotPasswordForm onBack={() => setShowForgot(false)} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* ── LEFT — Branding ─────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden flex-col justify-between p-12"
           style={{ background: 'linear-gradient(145deg, #1B5E38 0%, #2D7A4F 45%, #3A9460 100%)' }}>
        {[
          { size: 320, top: '-80px',  left: '-80px',  op: '0.15' },
          { size: 200, top: '30%',    right: '-60px',  op: '0.12' },
          { size: 260, bottom: '-60px', left: '20%',   op: '0.10' },
          { size: 140, top: '20%',    left: '40%',     op: '0.08' },
          { size: 180, bottom: '20%', right: '10%',    op: '0.10' },
        ].map((c, i) => (
          <div key={i} style={{
            position: 'absolute', width: c.size, height: c.size,
            borderRadius: '50%', background: 'rgba(255,255,255,0.9)',
            opacity: c.op, top: c.top, left: c.left,
            right: c.right, bottom: c.bottom,
          }} />
        ))}

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-lg leading-none">NutriBudget EG</p>
              <p className="text-green-200 text-xs mt-0.5">أكل صح — بميزانية حلوة</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8
                          bg-white/15 backdrop-blur border border-white/20">
            <span className="text-[10px] font-bold text-white/80 tracking-widest uppercase">
              🇪🇬 For Egyptian Markets
            </span>
          </div>

          <h1 className="text-5xl xl:text-6xl font-black leading-tight mb-6">
            <span className="text-white">Eat well.</span><br />
            <span style={{ color: '#86efac' }}>Spend smart.</span>
          </h1>
          <p className="text-green-100 text-lg leading-relaxed max-w-md">
            AI-powered meal planning optimized for Egyptian markets.
            Minimum cost, maximum nutrition.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-3">
          {FEATURES.map(f => (
            <div key={f.title} className="rounded-2xl p-4 backdrop-blur"
                 style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <p className="text-2xl mb-2">{f.emoji}</p>
              <p className="font-bold text-white text-sm">{f.title}</p>
              <p className="text-green-200 text-xs mt-1 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT — Form ────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 xl:w-[45%] flex items-center justify-center p-6
                      relative overflow-hidden overflow-y-auto"
           style={{ background: 'var(--bg)' }}>
        {[
          { size: 300, top: '-60px',    right: '-80px',  op: '0.06' },
          { size: 200, bottom: '-40px', left: '-60px',   op: '0.05' },
          { size: 150, top: '40%',      right: '5%',     op: '0.04' },
        ].map((c, i) => (
          <div key={i} style={{
            position: 'absolute', borderRadius: '50%',
            width: c.size, height: c.size,
            background: '#2D7A4F', opacity: c.op,
            top: c.top, right: c.right, bottom: c.bottom, left: c.left,
          }} />
        ))}

        <div className="w-full max-w-md relative z-10 py-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                 style={{ background: 'var(--primary)' }}>
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold" style={{ color: 'var(--text)' }}>NutriBudget EG</span>
          </div>

          <h2 className="text-3xl font-black mb-1" style={{ color: 'var(--text)' }}>
            {mode === 'login' ? 'Welcome back 👋' : 'Create account ✨'}
          </h2>
          <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
            {mode === 'login'
              ? 'Sign in to your NutriBudget account'
              : 'Start optimizing your meals today'}
          </p>

          {/* Tab switcher */}
          <div className="flex rounded-2xl p-1 mb-8 gap-1" style={{ background: 'var(--border)' }}>
            {[['login', 'Login'], ['signup', 'Sign Up']].map(([m, l]) => (
              <button key={m} onClick={() => { setMode(m); setErrors({}) }}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all"
                style={mode === m
                  ? { background: 'var(--primary)', color: '#fff', boxShadow: '0 2px 8px rgba(45,122,79,.35)' }
                  : { background: 'transparent', color: 'var(--text-muted)' }}>
                {l}
              </button>
            ))}
          </div>

          {/* Server error */}
          {authError && <Alert>{authError}</Alert>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full name (signup only) */}
            {mode === 'signup' && (
              <Input label="Full Name" placeholder="Your name 💪"
                value={form.full_name} onChange={e => set('full_name', e.target.value)}
                error={errors.full_name} />
            )}

            {/* Email */}
            <Input label="Email" type="email" placeholder="your@email.com"
              value={form.email} onChange={e => set('email', e.target.value)}
              error={errors.email} required />

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Password</label>
                {mode === 'login' && (
                  <button type="button" onClick={() => setShowForgot(true)}
                    className="text-xs font-medium transition-opacity hover:opacity-70"
                    style={{ color: 'var(--primary)' }}>
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input pr-11"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  required minLength={8}
                  style={{
                    borderColor: errors.password ? 'rgba(239,68,68,0.5)' : undefined,
                    background:  errors.password ? 'rgba(239,68,68,0.04)' : undefined,
                  }}
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength (signup only) */}
              {mode === 'signup' && form.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="flex-1 h-1 rounded-full transition-all"
                           style={{ background: i <= strength.score ? strength.color : 'var(--border)' }} />
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: strength.color }}>{strength.label}</p>
                </div>
              )}
              {errors.password && (
                <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#ef4444' }}>
                  <AlertCircle className="w-3 h-3" /> {errors.password}
                </p>
              )}
            </div>

            {/* Signup-only fields */}
            {mode === 'signup' && (
              <>
                {/* Confirm password */}
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCPw ? 'text' : 'password'}
                      className="input pr-11"
                      placeholder="••••••••"
                      value={form.password_confirm}
                      onChange={e => set('password_confirm', e.target.value)}
                      required
                      style={{
                        borderColor: errors.password_confirm ? 'rgba(239,68,68,0.5)'
                                   : form.password_confirm && form.password === form.password_confirm ? 'rgba(45,122,79,0.5)' : undefined,
                      }}
                    />
                    <button type="button" onClick={() => setShowCPw(s => !s)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)' }}>
                      {showCPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {/* Match indicator */}
                    {form.password_confirm && (
                      <div className="absolute right-10 top-1/2 -translate-y-1/2">
                        {form.password === form.password_confirm
                          ? <CheckCircle className="w-4 h-4" style={{ color: '#22c55e' }} />
                          : <AlertCircle className="w-4 h-4" style={{ color: '#ef4444' }} />}
                      </div>
                    )}
                  </div>
                  {errors.password_confirm && (
                    <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#ef4444' }}>
                      <AlertCircle className="w-3 h-3" /> {errors.password_confirm}
                    </p>
                  )}
                </div>

                {/* Daily targets */}
                <div className="pt-1">
                  <p className="text-xs font-semibold mb-3 uppercase tracking-wider"
                     style={{ color: 'var(--text-muted)' }}>Daily Targets</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { k: 'daily_budget_egp', l: 'Budget (EGP)', hint: 'e.g. 150' },
                      { k: 'daily_calories',   l: 'Calories',     hint: 'e.g. 2000' },
                      { k: 'daily_protein_g',  l: 'Protein (g)',  hint: 'e.g. 60' },
                    ].map(({ k, l, hint }) => (
                      <div key={k}>
                        <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>{l}</label>
                        <input className="input text-center text-sm" type="number" min={0}
                          placeholder={hint}
                          value={form[k]} onChange={e => set(k, parseFloat(e.target.value) || 0)} />
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
                    You can update these anytime from your profile.
                  </p>
                </div>
              </>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm
                         transition-all active:scale-[.98] mt-2
                         disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'var(--primary)', boxShadow: '0 4px 16px rgba(45,122,79,.35)' }}>
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70"/>
                    </svg>
                    Please wait...
                  </span>
                : mode === 'login' ? '→ Sign In' : '→ Create Account'
              }
            </button>
          </form>

          {/* Footer link */}
          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setErrors({}) }}
              className="font-bold" style={{ color: 'var(--primary)' }}>
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>

          {/* Privacy note */}
          <div className="mt-6 p-3 rounded-2xl flex items-center gap-3"
               style={{ background: 'var(--primary-lt)', border: '1px solid var(--border)' }}>
            <Lock className="w-4 h-4 shrink-0" style={{ color: 'var(--primary)' }} />
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Your data is encrypted and never shared. All passwords are hashed with bcrypt.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}