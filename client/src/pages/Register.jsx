import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PageTransition from '../components/PageTransition'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })

    if (error) {
      setError(error.message)
    } else {
      navigate('/onboarding')
    }
    setLoading(false)
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-brand-light flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-neutral-light">
          <h1 className="text-3xl font-bold text-brand-dark mb-2">Create Account</h1>
          <p className="text-neutral-grey mb-8">Begin your personalized neuro-recovery today.</p>

          {error && <div className="bg-alert-red/10 text-alert-red p-4 rounded-xl mb-6 text-sm font-medium border border-alert-red/20">{error}</div>}

          <form onSubmit={handleRegister} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase text-neutral-grey tracking-wider ml-1">Email Address</label>
              <input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="p-4 bg-neutral-light/30 border border-neutral-light rounded-xl focus:ring-2 ring-brand-blue outline-none transition-all"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase text-neutral-grey tracking-wider ml-1">Password</label>
              <input
                type="password"
                placeholder="min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="p-4 bg-neutral-light/30 border border-neutral-light rounded-xl focus:ring-2 ring-brand-blue outline-none transition-all"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-success-green text-white py-4 rounded-xl font-bold hover:bg-success-green/90 transition-all transform active:scale-95 shadow-lg shadow-success-green/20 disabled:opacity-50 mt-2"
            >
              {loading ? 'Creating Profile...' : 'Begin Onboarding'}
            </button>
          </form>

          <p className="text-center text-sm text-neutral-grey mt-8">
            Already have an account? <Link to="/login" className="text-brand-blue font-bold hover:underline">Log In</Link>
          </p>
        </div>
      </div>
    </PageTransition>
  )
}
