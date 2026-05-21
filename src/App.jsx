import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { initTheme } from './components/UI'
import Sidebar from './components/Sidebar'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import OptimizePage from './pages/OptimizePage'
import VisionPage from './pages/VisionPage'
import ProductsPage from './pages/ProductsPage'
import RecipesPage from './pages/RecipesPage'
import AdminPage from './pages/AdminPage'
import SmartProfilePage from './pages/SmartProfilePage'
import PersonalizePage from './pages/PersonalizePage'
import { HistoryPage, NutritionPage, ProfilePage } from './pages/OtherPages'
import ChatBot from './components/ChatBot'

// ── Decorative leaf background ────────────────────────────────────────────────
function Leaves() {
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:0,
      pointerEvents:'none', overflow:'hidden'
    }}>
      {/* Glow orbs */}
      <div style={{
        position:'absolute', top:'-10%', right:'-5%',
        width:500, height:500, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(45,122,79,0.25) 0%, transparent 70%)',
        filter:'blur(40px)'
      }}/>
      <div style={{
        position:'absolute', bottom:'5%', left:'-5%',
        width:400, height:400, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(58,148,96,0.18) 0%, transparent 70%)',
        filter:'blur(50px)'
      }}/>
      <div style={{
        position:'absolute', top:'45%', right:'20%',
        width:300, height:300, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)',
        filter:'blur(60px)'
      }}/>

      {/* SVG Leaves */}
      <svg
        style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:0.07}}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Large leaf — top right */}
        <g transform="translate(1300,80) rotate(-25)">
          <ellipse cx="0" cy="0" rx="140" ry="68" fill="#2D7A4F"/>
          <line x1="0" y1="-68" x2="0" y2="68" stroke="#1B5E38" strokeWidth="4"/>
          <line x1="0" y1="-25" x2="55" y2="15" stroke="#1B5E38" strokeWidth="2.5"/>
          <line x1="0" y1="-25" x2="-55" y2="15" stroke="#1B5E38" strokeWidth="2.5"/>
          <line x1="0" y1="18" x2="65" y2="45" stroke="#1B5E38" strokeWidth="2.5"/>
          <line x1="0" y1="18" x2="-65" y2="45" stroke="#1B5E38" strokeWidth="2.5"/>
        </g>

        {/* Medium leaf — bottom left */}
        <g transform="translate(60,780) rotate(42)">
          <ellipse cx="0" cy="0" rx="110" ry="55" fill="#3A9460"/>
          <line x1="0" y1="-55" x2="0" y2="55" stroke="#256641" strokeWidth="3"/>
          <line x1="0" y1="-15" x2="42" y2="15" stroke="#256641" strokeWidth="2"/>
          <line x1="0" y1="-15" x2="-42" y2="15" stroke="#256641" strokeWidth="2"/>
          <line x1="0" y1="20" x2="50" y2="40" stroke="#256641" strokeWidth="2"/>
          <line x1="0" y1="20" x2="-50" y2="40" stroke="#256641" strokeWidth="2"/>
        </g>

        {/* Small leaf — mid right edge */}
        <g transform="translate(1420,480) rotate(58)">
          <ellipse cx="0" cy="0" rx="85" ry="42" fill="#256641"/>
          <line x1="0" y1="-42" x2="0" y2="42" stroke="#1B5E38" strokeWidth="2.5"/>
          <line x1="0" y1="0" x2="32" y2="18" stroke="#1B5E38" strokeWidth="2"/>
          <line x1="0" y1="0" x2="-32" y2="18" stroke="#1B5E38" strokeWidth="2"/>
        </g>

        {/* Small leaf — top left */}
        <g transform="translate(170,160) rotate(-58)">
          <ellipse cx="0" cy="0" rx="70" ry="35" fill="#2D7A4F"/>
          <line x1="0" y1="-35" x2="0" y2="35" stroke="#1B5E38" strokeWidth="2"/>
          <line x1="0" y1="0" x2="26" y2="14" stroke="#1B5E38" strokeWidth="1.5"/>
          <line x1="0" y1="0" x2="-26" y2="14" stroke="#1B5E38" strokeWidth="1.5"/>
        </g>

        {/* Medium leaf — bottom center */}
        <g transform="translate(700,860) rotate(8)">
          <ellipse cx="0" cy="0" rx="100" ry="50" fill="#3A9460"/>
          <line x1="0" y1="-50" x2="0" y2="50" stroke="#2D7A4F" strokeWidth="3"/>
          <line x1="0" y1="-12" x2="38" y2="14" stroke="#2D7A4F" strokeWidth="2"/>
          <line x1="0" y1="-12" x2="-38" y2="14" stroke="#2D7A4F" strokeWidth="2"/>
          <line x1="0" y1="16" x2="46" y2="36" stroke="#2D7A4F" strokeWidth="2"/>
          <line x1="0" y1="16" x2="-46" y2="36" stroke="#2D7A4F" strokeWidth="2"/>
        </g>

        {/* Tiny leaf — left center */}
        <g transform="translate(30,420) rotate(-20)">
          <ellipse cx="0" cy="0" rx="55" ry="27" fill="#2D7A4F"/>
          <line x1="0" y1="-27" x2="0" y2="27" stroke="#1B5E38" strokeWidth="2"/>
          <line x1="0" y1="0" x2="20" y2="12" stroke="#1B5E38" strokeWidth="1.5"/>
          <line x1="0" y1="0" x2="-20" y2="12" stroke="#1B5E38" strokeWidth="1.5"/>
        </g>

        {/* Large leaf — bottom right */}
        <g transform="translate(1200,840) rotate(18)">
          <ellipse cx="0" cy="0" rx="120" ry="60" fill="#256641"/>
          <line x1="0" y1="-60" x2="0" y2="60" stroke="#1B5E38" strokeWidth="3"/>
          <line x1="0" y1="-18" x2="46" y2="14" stroke="#1B5E38" strokeWidth="2"/>
          <line x1="0" y1="-18" x2="-46" y2="14" stroke="#1B5E38" strokeWidth="2"/>
          <line x1="0" y1="18" x2="55" y2="38" stroke="#1B5E38" strokeWidth="2"/>
          <line x1="0" y1="18" x2="-55" y2="38" stroke="#1B5E38" strokeWidth="2"/>
        </g>
      </svg>
    </div>
  )
}


initTheme()

function AppLayout() {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  return (
    <div className="flex min-h-screen" style={{background:'var(--bg)'}}>
      <Leaves />
      {/* Sidebar — sticky full height */}
      <div className="sticky top-0 h-screen shrink-0 overflow-y-auto scrollbar-thin"
           style={{zIndex:50}}>
        <Sidebar />
      </div>
      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-x-hidden transition-all duration-200" style={{position:"relative",zIndex:10}}>
        <div className="p-6 md:p-8 max-w-6xl mx-auto min-h-screen">
          <Outlet />
        </div>
      </main>
      {/* AI Chatbot — floating on all pages */}
      <ChatBot />
    </div>
  )
}

export default function App() {
  const { fetchMe } = useAuthStore()
  useEffect(() => { fetchMe() }, [])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth routes — no sidebar/layout */}
        <Route path="/login"          element={<AuthPage />} />
        <Route path="/reset-password" element={<AuthPage />} />

        {/* Protected routes — require login */}
        <Route element={<AppLayout />}>
          <Route index                element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"    element={<Dashboard />} />
          <Route path="/optimize"     element={<OptimizePage />} />
          <Route path="/personalize"  element={<PersonalizePage />} />
          <Route path="/products"     element={<ProductsPage />} />
          <Route path="/nutrition"    element={<NutritionPage />} />
          <Route path="/vision"       element={<VisionPage />} />
          <Route path="/history"      element={<HistoryPage />} />
          <Route path="/profile"      element={<ProfilePage />} />
          <Route path="/recipes"      element={<RecipesPage />} />
          <Route path="/admin"        element={<AdminPage />} />
          <Route path="/smart-profile" element={<SmartProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}