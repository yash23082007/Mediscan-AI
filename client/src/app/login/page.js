'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import AuthShell from '@/components/AuthShell'

function LoginForm() {
  const { login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(email, password)
      if (data.user.role === 'patient') {
        router.push('/dashboard')
      } else {
        router.push('/doctor')
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Patient and clinician access"
      contextTitle="Symptom intake and clinician review."
      description="Use your account to finish an assessment, read a saved summary, or open the clinician queue."
      steps={[
        { title: 'Your assessment', description: 'Responses stay connected to the account that submitted them.' },
        { title: 'Experimental estimate', description: 'The model can abstain when the available evidence is limited.' },
        { title: 'Human review', description: 'Clinician feedback is recorded separately from the model estimate.' }
      ]}
    >
        <div className="clinical-card-elevated auth-card">
          <h1 className="heading-md mb-1">Sign in</h1>
          <p className="text-caption mb-4">Patient and clinician accounts open their own workspace after sign-in.</p>

          {error && (
            <div className="alert alert-error mb-3" role="alert">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} aria-busy={loading}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email Address</label>
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="login-password">Password</label>
              </div>
              <div className="auth-password-row">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button type="button" className="btn btn-ghost btn-sm" aria-pressed={showPassword} aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full mt-2"
              disabled={loading}
              id="login-submit"
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} aria-hidden="true"></span>
                  <span className="sr-only">Signing in…</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <p className="text-caption">
              New to MediscanAI?{' '}
              <Link href="/register" style={{ fontWeight: 600, color: 'var(--clinical-teal)' }}>
                Create a patient account
              </Link>
            </p>
          </div>
        </div>
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  )
}
