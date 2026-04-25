import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { usePatientStore } from './store/usePatientStore'
import { useThemeStore } from './store/useThemeStore'

// Lazy loading pages for performance
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Exercise = lazy(() => import('./pages/Exercise'))
const DoctorDashboard = lazy(() => import('./pages/DoctorDashboard'))
const DoctorProfile = lazy(() => import('./pages/DoctorProfile'))
const RecoveryPlan = lazy(() => import('./pages/RecoveryPlan'))

// ProtectedRoute: Only enforces Authentication. 
function ProtectedRoute({ children }) {
  const { user, profileLoaded } = usePatientStore()
  const location = useLocation()

  if (!profileLoaded) {
    return <div className="min-h-screen flex items-center justify-center text-brand-blue font-medium bg-black uppercase tracking-widest">Initialising Core...</div>
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

function App() {
  const setUser = usePatientStore((state) => state.setUser)

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // Listen for changes on auth state (log in, log out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [setUser])

  const theme = useThemeStore((state) => state.theme)

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return (
    <Router>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-brand-blue font-medium bg-black uppercase tracking-widest">Loading Assets...</div>}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected Routes */}
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/recovery-plan" element={
            <ProtectedRoute>
              <RecoveryPlan />
            </ProtectedRoute>
          } />
          
          <Route path="/exercise" element={
            <ProtectedRoute>
              <Exercise />
            </ProtectedRoute>
          } />
          
          <Route path="/exercise/:sessionId" element={
            <ProtectedRoute>
              <Exercise />
            </ProtectedRoute>
          } />
          
          <Route path="/doctor-dashboard" element={
            <ProtectedRoute>
              <DoctorDashboard />
            </ProtectedRoute>
          } />

          <Route path="/doctor-profile" element={
            <ProtectedRoute>
              <DoctorProfile />
            </ProtectedRoute>
          } />

          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </Router>
  )
}

export default App
