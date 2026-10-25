'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import AuthShell from '@/components/AuthShell'

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
    <AuthShell
      eyebrow="Patient registration"
      contextTitle="Set up a patient profile before your first assessment."
      description="Create your account, add the required baseline details, then continue to the symptom questions."
      steps={[
        { title: 'Account details', description: 'Use an email address and a password you can keep private.' },
        { title: 'Baseline profile', description: 'Age and sex / gender are required; other profile details are optional.' },
        { title: 'Symptom intake', description: 'Record what you are experiencing in your own words and choices.' }
      ]}
    >
        <div className="clinical-card-elevated auth-card">
          <div className="auth-registration-heading">
            <h1 className="heading-md">
              {step === 1 ? 'Create your account' : 'About you'}
            </h1>
            <span className="text-caption text-tabular">
              Step {step} of 2
            </span>
          </div>

          <p className="text-caption mb-3">
              {step === 1
              ? 'Set up the account you will use to return to your assessments.'
              : 'Add the details needed for your profile. Optional fields can be left blank.'}
          </p>

          {/* Stepper indicator */}
          <div
            className="auth-progress-track"
            role="progressbar"
            aria-label="Registration progress"
            aria-valuemin={1}
            aria-valuemax={2}
            aria-valuenow={step}
            style={{
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
            <form onSubmit={handleStep1}>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-name">Your name</label>
                <input
                  id="reg-name"
                  type="text"
                  className="form-input"
                  placeholder="Your name"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  required
                  minLength={2}
                  maxLength={255}
                  autoComplete="name"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-email">Email Address</label>
                <input
                  id="reg-email"
                  type="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  required
                  autoComplete="email"
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
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
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
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                />
              </div>

              <button type="submit" className="btn btn-primary btn-lg w-full mt-2" id="reg-next">
                Proceed to Health Baseline →
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} aria-busy={loading}>
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
                    max="150"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reg-gender">Sex / gender</label>
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
                    min="0.1"
                    max="500"
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
                    min="0.1"
                    max="300"
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
                  By registering, you acknowledge that MediscanAI is an informational triage and clinical decision-support tool. It does not replace clinical consultation with a healthcare provider.
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
                    <>
                      <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} aria-hidden="true"></span>
                      <span className="sr-only">Creating your account…</span>
                    </>
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

    </AuthShell>
  )
}

export default function RegisterPage() {
  return (
    <AuthProvider>
      <RegisterForm />
    </AuthProvider>
  )
}
