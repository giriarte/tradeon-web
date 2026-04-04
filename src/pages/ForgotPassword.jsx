import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Login.css'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Request failed')
      } else {
        setSent(true)
      }
    } catch (err) {
      setError('Unable to reach server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Forgot Password</h1>
        {sent ? (
          <p className="auth-sent-msg">
            If that email is registered, you'll receive a reset link shortly.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        )}
        <div className="auth-links">
          <Link to="/login">Back to Log In</Link>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
