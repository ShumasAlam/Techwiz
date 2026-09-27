import { ArrowRight, Check, Leaf, LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const submit = async (event) => {
    event?.preventDefault?.()
    setError('')
    try {
      const user = await login(email, password)
      navigate(location.state?.from || `/${user.role}/dashboard`)
    } catch (nextError) {
      setError(nextError.message)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="auth-orb auth-orb--one" />
        <div className="auth-orb auth-orb--two" />
        <Link to="/" className="brand brand--light"><span><Leaf /></span><b>MarketLink</b></Link>
        <div className="auth-quote">
          <p className="eyebrow eyebrow--gold">WELCOME BACK TO MARKET DAY</p>
          <h1>Good food is <em>waiting.</em></h1>
          <p>Return to your saved farmers, pickup orders and weekly favourites.</p>
          <div>
            <span><Check /> Live farmer stock</span>
            <span><Check /> No online payment</span>
            <span><Check /> Pickup made predictable</span>
          </div>
        </div>
      </section>
      <section className="auth-form-wrap">
        <div className="auth-form">
          <div>
            <p className="eyebrow">SECURE ACCOUNT ACCESS</p>
            <h2>Log in</h2>
            <p>New to MarketLink? <Link to="/register">Create a free account</Link></p>
          </div>
          <form onSubmit={submit}>
            <label>Email address
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </label>
            <label>Password
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="btn btn--large" disabled={loading}>
              {loading ? 'Opening your account…' : 'Log in'} <ArrowRight />
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
