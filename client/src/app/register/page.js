'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { IconCaduceus, IconLock, IconShield } from '@/components/Icons'

function RegisterForm() {
  const { registerPatient } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    age: '', gender: '', weight: '', height: '',
    allergies: '', chronic_conditions: ''
  })

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleStep1 = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError('Please complete all required fields.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await registerPatient({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        age: parseInt(form.age, 10),
        gender: form.gender,
        weight: form.weight ? parseFloat(form.weight) : undefined,
        height: form.height ? parseFloat(form.height) : undefined,
        allergies: form.allergies ? form.allergies.trim() : '',
        chronic_conditions: form.chronic_conditions ? form.chronic_conditions.trim() : ''
      })
      router.push('/dashboard')
    } catch (err) {
      setError(err.message || 'Registration could not be completed. Please check your information.')
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
      padding: '2.5rem 1.5rem'
    }}>
      <div className="animate-calm-fade" style={{ width: '100%', maxWidth: '520px' }}>
        {/* Brand Header */}
        <div className="text-center mb-4">
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', color: 'var(--text-primary)', textDecoration: 'none' }}>
            <div className="clinical-brand-symbol" style={{ width: 38, height: 38 }}>
              <IconCaduceus size={20} color="#ffffff" />
            </div>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '1.375rem', letterSpacing: '-0.015em' }}>
              MediScan
            </span>
          </Link>
          <p className="text-caption mt-1">Patient Profile & Clinical Intake</p>
        </div>

        {/* Card */}
        <div className="clinical-card-elevated" style={{ padding: '2.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h1 className="heading-md" style={{ fontSize: '1.25rem' }}>
              {step === 1 ? 'Create Personal Account' : 'Clinical Baseline Profile'}
            </h1>
            <span className="text-caption text-tabular">
              Step {step} of 2
            </span>
          </div>

          <p className="text-caption mb-3">
            {step === 1
              ? 'Enter your credentials to secure your private health consultations'
              : 'Demographic and physiological baselines calibrate symptom differential weighting'}
          </p>

          {/* Stepper indicator */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              height: '3px',
              borderRadius: '2px',
              background: 'var(--clinical-teal)'
            }} />
            <div style={{
              height: '3px',
              borderRadius: '2px',
              background: step === 2 ? 'var(--clinical-teal)' : 'var(--border-subtle)'
            }} />
          </div>

          {error && (
            <div className="alert alert-error mb-3" role="alert">
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleStep1} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-name">Full Legal Name</label>
                <input
                  id="reg-name"
                  type="text"
                  className="form-input"
                  placeholder="Eleanor Vance"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-email">Email Address</label>
                <input
                  id="reg-email"
                  type="email"
                  className="form-input"
                  placeholder="eleanor@example.com"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-password">Password</label>
                <input
                  id="reg-password"
                  type="password"
                  className="form-input"
                  placeholder="Minimum 8 characters"
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-confirm">Confirm Password</label>
                <input
                  id="reg-confirm"
                  type="password"
                  className="form-input"
                  placeholder="Re-enter password"
                  value={form.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-lg w-full mt-2" id="reg-next">
                Proceed to Health Baseline →
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-age">Age (Years)</label>
                  <input
                    id="reg-age"
                    type="number"
                    className="form-input"
                    placeholder="34"
                    value={form.age}
                    onChange={(e) => updateField('age', e.target.value)}
                    required
                    min="1"
                    max="125"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reg-gender">Biological Sex / Gender</label>
                  <select
                    id="reg-gender"
                    className="form-input form-select"
                    value={form.gender}
                    onChange={(e) => updateField('gender', e.target.value)}
                    required
                  >
                    <option value="">Select category</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-weight">Weight (kg) <span className="text-caption">(optional)</span></label>
                  <input
                    id="reg-weight"
                    type="number"
                    className="form-input"
                    placeholder="68"
                    value={form.weight}
                    onChange={(e) => updateField('weight', e.target.value)}
                    step="0.1"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reg-height">Height (cm) <span className="text-caption">(optional)</span></label>
                  <input
                    id="reg-height"
                    type="number"
                    className="form-input"
                    placeholder="172"
                    value={form.height}
                    onChange={(e) => updateField('height', e.target.value)}
                    step="0.1"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-allergies">Known Allergies <span className="text-caption">(optional)</span></label>
                <input
                  id="reg-allergies"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Penicillin, Sulfa drugs, Peanuts"
                  value={form.allergies}
                  onChange={(e) => updateField('allergies', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-conditions">Chronic Conditions <span className="text-caption">(optional)</span></label>
                <input
                  id="reg-conditions"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Hypertension, Asthma, Type 2 Diabetes"
                  value={form.chronic_conditions}
                  onChange={(e) => updateField('chronic_conditions', e.target.value)}
                />
              </div>

              {/* Informational consent notice */}
              <div className="clinical-panel-subtle mb-3" style={{ padding: '0.875rem 1rem' }}>
                <p className="text-caption" style={{ fontSize: '0.75rem', lineHeight: 1.5 }}>
                  By registering, you acknowledge that MediScan is an informational triage and clinical decision-support tool. It does not replace clinical consultation with a healthcare provider.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn btn-secondary btn-lg"
                  style={{ flex: 1 }}
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ flex: 2 }}
                  disabled={loading}
                  id="reg-submit"
                >
                  {loading ? (
                    <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></span>
                  ) : (
                    'Complete Registration'
                  )}
                </button>
              </div>
            </form>
          )}

          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <p className="text-caption">
              Already registered?{' '}
              <Link href="/login" style={{ fontWeight: 600, color: 'var(--clinical-teal)' }}>
                Sign in to your account
              </Link>
            </p>
          </div>
        </div>

        {/* Security badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          marginTop: '1.25rem',
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}>
          <IconShield size={14} color="var(--clinical-sage)" />
          <span>Patient data is strictly partitioned and encrypted with AES-256 standards.</span>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <AuthProvider>
      <RegisterForm />
    </AuthProvider>
  )
}
