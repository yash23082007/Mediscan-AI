'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { IconCaduceus, IconLock } from '@/components/Icons'

function LoginForm() {
  const { login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--surface-canvas)',
      padding: '2rem 1.5rem'
    }}>
      <div className="animate-calm-fade" style={{ width: '100%', maxWidth: '440px' }}>
        {/* Brand Header */}
        <div className="text-center mb-4">
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', color: 'var(--text-primary)', textDecoration: 'none' }}>
            <div className="clinical-brand-symbol" style={{ width: 38, height: 38 }}>
              <IconCaduceus size={20} color="#ffffff" />
            </div>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '1.375rem', letterSpacing: '-0.015em' }}>
              MediscanAI
            </span>
          </Link>
          <p className="text-caption mt-1">Clinical Symptom Assessment & Decision Support</p>
        </div>

        {/* Login Panel */}
        <div className="clinical-card-elevated" style={{ padding: '2rem 2.25rem' }}>
          <h1 className="heading-md mb-1" style={{ fontSize: '1.25rem' }}>Sign In to Your Workspace</h1>
          <p className="text-caption mb-4">Access your confidential health assessments or clinical reviews</p>

          {error && (
            <div className="alert alert-error mb-3" role="alert">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email Address</label>
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder="name@institution.com"
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
              <input
                id="login-password"
                type="password"
                className="form-input"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full mt-2"
              disabled={loading}
              id="login-submit"
            >
              {loading ? (
                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></span>
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

        {/* Security & Confidentiality Reassurance */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          marginTop: '1.25rem',
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}>
          <IconLock size={14} color="var(--clinical-sage)" />
          <span>Protected by AES-256 encryption. Patient confidentiality is strictly maintained.</span>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  )
}
