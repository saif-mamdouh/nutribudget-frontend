import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Zap, Target, ShoppingCart,
  Salad, ShieldAlert, BookOpen, Camera,
  ClipboardList, User, ChevronRight, Leaf,
  BrainCircuit, ShieldCheck,
} from 'lucide-react'
import { ThemeToggle } from './UI'
import { useAuthStore } from '../store/authStore'

const NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard',     adminOnly: false },
  { to: '/optimize',     icon: Zap,             label: 'Meal Plan',     adminOnly: false },
  { to: '/personalize',  icon: Target,          label: 'Personalized',  adminOnly: false },
  { to: '/smart-profile',icon: BrainCircuit,    label: 'Smart Profile', adminOnly: false },
  { to: '/recipes',      icon: BookOpen,        label: 'Recipes',       adminOnly: false },
  { to: '/vision',       icon: Camera,          label: 'Analyze Meal',  adminOnly: false },
  { to: '/history',      icon: ClipboardList,   label: 'History',       adminOnly: false },
  { to: '/profile',      icon: User,            label: 'Profile',       adminOnly: false },
]

const ADMIN_NAV = [
  { to: '/products',  icon: ShoppingCart, label: 'Products'    },
  { to: '/nutrition', icon: Salad,        label: 'Nutrition DB' },
  { to: '/admin',     icon: ShieldAlert,  label: 'Upload Data'  },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [streak, setStreak]       = useState({ streak: 0, message: "Keep nourishing yourself" })

  const fetchStreak = () => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    fetch('/api/v1/users/me/streak', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { if (data.streak !== undefined) setStreak(data) })
      .catch(() => {})
  }

  useEffect(() => {
    fetchStreak()

    // Re-fetch when meal is logged or plan updated
    window.addEventListener('plans-updated', fetchStreak)

    // Re-fetch when user returns to tab
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchStreak()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.removeEventListener('plans-updated', fetchStreak)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const initials = user?.full_name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <aside style={{ backgroundColor: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)', minHeight:'100vh' }}
      className={`flex flex-col h-screen transition-all duration-300 ${collapsed ? 'w-16' : 'w-[220px]'}`}>

      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-green-600 flex items-center justify-center shadow-md shrink-0"
             style={{ boxShadow: '0 0 12px rgba(34,197,94,0.4)' }}>
          <Leaf className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>NutriBudget</p>
            <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>Egypt</p>
          </div>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        {!collapsed && (
          <p className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-2"
             style={{ color: 'var(--text-muted)' }}>Main</p>
        )}
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
               ${isActive ? 'nav-link-active' : 'nav-link'}`
            }>
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}

        {/* Admin section */}
        {user?.is_admin && (
          <>
            {!collapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-widest px-2 mt-4 mb-2"
                 style={{ color: 'var(--text-muted)' }}>Admin</p>
            )}
            {ADMIN_NAV.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                   ${isActive ? 'nav-link-active' : 'nav-link'}`
                }>
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="px-2 pb-4 shrink-0 space-y-1"
           style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>

        {/* Streak */}
        {!collapsed && (
          <div className="mx-1 mb-2 px-3 py-2 rounded-xl"
               style={{ backgroundColor: streak.streak > 0 ? 'rgba(34,197,94,0.1)' : 'rgba(100,100,100,0.1)' }}>
            <p className="text-xs font-semibold" style={{ color: streak.streak > 0 ? '#22c55e' : 'var(--text-muted)' }}>
              🔥 {streak.streak > 0 ? `${streak.streak} day${streak.streak !== 1 ? 's' : ''} streak` : 'No streak yet'}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{streak.message}</p>
          </div>
        )}

        {/* Theme toggle */}
        <div className="nav-link justify-between">
          {!collapsed && <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Dark Mode
          </span>}
          <ThemeToggle />
        </div>

        {/* User info */}
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl">
            <div className="w-8 h-8 rounded-xl bg-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>
                {user?.full_name || 'User'}
              </p>
              <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                {user?.email}
              </p>
            </div>
            {user?.is_admin && (
              <span className="text-[9px] bg-green-600 text-white px-1.5 py-0.5 rounded font-bold">
                ADMIN
              </span>
            )}
          </div>
        )}

        {/* Logout */}
        <button onClick={handleLogout}
          className="nav-link w-full text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!collapsed && <span>Logout</span>}
        </button>

        {/* Collapse toggle */}
        <button onClick={() => setCollapsed(c => !c)}
          className="nav-link w-full justify-center mt-1">
          <ChevronRight className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </button>
      </div>
    </aside>
  )
}
