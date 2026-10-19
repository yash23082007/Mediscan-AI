'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import {
  IconStethoscope,
  IconCheckCircle,
  IconAlertTriangle,
  IconChevronLeft,
  IconUser,
  IconFileText,
  IconShield
} from '@/components/Icons'
import ClinicalDisclaimer from '@/components/ClinicalDisclaimer'

export default function ReviewPage() {
  const { id } = useParams()
  const router = useRouter()
  const { authFetch } = useAuth()
  const [submission, setSubmission] = useState(null)
  const [feedbackHistory, setFeedbackHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [feedbackAction, setFeedbackAction] = useState('')
  const [notes, setNotes] = useState('')
  const [correctionName, setCorrectionName] = useState('')
  const [correctionConfidence, setCorrectionConfidence] = useState(0.8)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const loadSubmission = useCallback(async () => {
    try {
      const res = await authFetch(`/doctors/submissions/${id}`)
      const data = await res.json()
      setSubmission(data.submission)
      setFeedbackHistory(data.feedbackHistory || [])
    } catch (err) {
      console.error('Failed to load submission detail:', err)
    } finally {
      setLoading(false)
    }
  }, [authFetch, id])

  useEffect(() => {
    // Loading remote submission data is an intentional effect-driven state update.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSubmission()
  }, [loadSubmission])

  const handleSubmitFeedback = async (e) => {
    e.preventDefault()
    if (!feedbackAction) return

    setSubmitting(true)
    setSuccess('')
    setError('')
    try {
      const body = {
        diagnosis_id: id,
        action: feedbackAction,
        notes: notes
      }

      if (feedbackAction !== 'approve' && correctionName) {
        body.correction = {
          conditions: [{ name: correctionName, confidence: correctionConfidence }],
          notes: notes
        }
      }

      const response = await authFetch('/feedback', {
        method: 'POST',
        body: JSON.stringify(body)
      })
      const responseData = await response.json()
      if (!response.ok) throw new Error(responseData.error || 'Review could not be recorded')

      setSuccess(`Review recorded: Action "${feedbackAction}" submitted.`)
      setFeedbackAction('')
      setNotes('')
      setCorrectionName('')
      await loadSubmission()
    } catch (err) {
      setError(err.message || 'Review could not be recorded. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center" style={{ minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner spinner-lg mb-2" style={{ margin: '0 auto' }}></div>
          <p className="text-caption">Loading patient clinical dossier...</p>
        </div>
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="clinical-panel-subtle text-center" style={{ maxWidth: '600px', margin: '3rem auto', padding: '3rem 2rem' }}>
        <h2 className="heading-md mb-2">Submission Not Found</h2>
        <p className="text-secondary mb-4" style={{ fontSize: '0.875rem' }}>
          The requested clinical submission record could not be retrieved.
        </p>
        <button onClick={() => router.back()} className="btn btn-secondary">
          ← Return to Triage Registry
        </button>
      </div>
    )
  }

  const conditions = submission.conditions || []

  return (
    <div className="animate-calm-fade" style={{ maxWidth: '880px', margin: '0 auto' }}>
      {/* Navigation & Patient Identification */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => router.back()} className="btn btn-ghost btn-sm" style={{ padding: '0.25rem 0.5rem' }}>
          <IconChevronLeft size={16} />
          <span>Back to Triage</span>
        </button>
        <div>
          <div className="eyebrow-clinical" style={{ fontSize: '0.6875rem' }}>Clinical Evaluation</div>
          <h1 className="editorial-heading-lg" style={{ fontSize: '1.625rem' }}>
            Patient Dossier • {submission.patient_name}
          </h1>
        </div>
      </div>

      {/* Patient Clinical Baseline Profile */}
      <div className="clinical-card mb-4" style={{ padding: '1.5rem' }}>
        <h2 className="heading-sm mb-3" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <IconUser size={18} color="var(--clinical-teal)" />
          Patient Baseline Profile
        </h2>
        <div className="grid-4" style={{ gap: '1rem' }}>
          <div className="clinical-panel-subtle" style={{ padding: '0.75rem 1rem' }}>
            <span className="text-caption">Full Name</span>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.125rem' }}>
              {submission.patient_name}
            </div>
          </div>
          <div className="clinical-panel-subtle" style={{ padding: '0.75rem 1rem' }}>
            <span className="text-caption">Demographics</span>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.125rem' }}>
              {submission.patient_age ? `${submission.patient_age} yrs` : '—'} • {submission.patient_gender || '—'}
            </div>
          </div>
          <div className="clinical-panel-subtle" style={{ padding: '0.75rem 1rem' }}>
            <span className="text-caption">Body Weight</span>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.125rem' }}>
              {submission.patient_weight ? `${submission.patient_weight} kg` : 'Unrecorded'}
            </div>
          </div>
          <div className="clinical-panel-subtle" style={{ padding: '0.75rem 1rem' }}>
            <span className="text-caption">Review Status</span>
            <div style={{ marginTop: '0.125rem' }}>
              <span className={`triage-tier-badge ${submission.status === 'approved' ? 'routine' : submission.status === 'pending' ? 'moderate' : 'urgent'}`}>
                {submission.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Model Diagnostic Evaluation & Differentials */}
      <div className="clinical-card mb-4" style={{ padding: '1.5rem' }}>
        <h2 className="heading-sm mb-3" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <IconStethoscope size={18} color="var(--clinical-teal)" />
          Synthesized Differential Diagnoses
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {conditions.map((condition, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.875rem 1rem',
                background: i === 0 ? 'var(--clinical-teal-subtle)' : 'var(--surface-subtle)',
                borderRadius: 'var(--radius-md)',
                border: i === 0 ? '1px solid var(--clinical-teal-border)' : '1px solid var(--border-subtle)'
              }}
            >
              <div>
                <span className="text-caption" style={{ fontWeight: 600 }}>Differential #{i + 1}</span>
                <span style={{ fontWeight: 600, marginLeft: '0.5rem', color: 'var(--text-primary)' }}>
                  {condition.name}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="text-caption text-tabular" style={{ fontWeight: 600, color: 'var(--clinical-teal)' }}>
                  {typeof condition.confidence === 'number' ? `${Math.round(condition.confidence * 100)}% model estimate` : 'No estimate'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {submission.explanation && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
            <h3 className="text-caption" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>
              Diagnostic Synthesis Reasoning
            </h3>
            <p className="text-secondary" style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
              {submission.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Feature Contributions & Symptom Alignment */}
      {submission.feature_contributions && Object.keys(submission.feature_contributions).length > 0 && (
        <div className="clinical-card mb-4" style={{ padding: '1.5rem' }}>
          <h2 className="heading-sm mb-3" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IconFileText size={18} color="var(--clinical-teal)" />
            Contributing Symptom Vectors (Weights)
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Object.entries(submission.feature_contributions)
              .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
              .slice(0, 8)
              .map(([feat, w], idx, arr) => (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.375rem 0',
                  borderBottom: idx < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none'
                }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                    {feat.replace(/_/g, ' ')}
                  </span>
                  <span className="text-caption text-tabular" style={{ fontWeight: 600 }}>
                    {Number(w) > 0 ? `+${Number(w).toFixed(3)}` : Number(w).toFixed(3)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Clinician Action & Feedback Sign-Off */}
      <div className="clinical-card-elevated mb-6" style={{ padding: '1.75rem', borderLeft: '4px solid var(--clinical-teal)' }}>
        <h2 className="heading-sm mb-1">
          Physician Verification &amp; Calibration Sign-Off
        </h2>
        <p className="text-caption mb-3">
          Your review updates the case status visible to the patient. Review feedback is recorded but is not used to retrain this model.
        </p>

        {success && (
          <div className="alert alert-success mb-3" role="status">
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="alert alert-error mb-3" role="alert">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmitFeedback}>
          <div className="form-group">
            <label className="form-label">Clinical Action</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn btn-sm ${feedbackAction === 'approve' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFeedbackAction('approve')}
              >
                ✓ Approve Diagnosis
              </button>
              <button
                type="button"
                className={`btn btn-sm ${feedbackAction === 'correct' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFeedbackAction('correct')}
              >
                ✎ Correct Primary Finding
              </button>
              <button
                type="button"
                className={`btn btn-sm ${feedbackAction === 'override' ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => setFeedbackAction('override')}
              >
                ⟳ Override / Reject
              </button>
            </div>
          </div>

          {feedbackAction && feedbackAction !== 'approve' && (
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Correct Clinical Diagnosis</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Acute Viral Bronchitis"
                  value={correctionName}
                  onChange={(e) => setCorrectionName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confidence Weight (0.1 - 1.0)</label>
                <input
                  type="number"
                  className="form-input"
                  value={correctionConfidence}
                  onChange={(e) => setCorrectionConfidence(parseFloat(e.target.value))}
                  step="0.05"
                  min="0.1"
                  max="1.0"
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Physician Clinical Notes <span className="text-caption">(optional)</span></label>
            <textarea
              className="form-input"
              rows="3"
              placeholder="Record clinical rationale, differential notes, or follow-up recommendations..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={!feedbackAction || submitting}
          >
            {submitting ? (
              <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></span>
            ) : (
              'Submit Physician Evaluation'
            )}
          </button>
        </form>
      </div>

      <ClinicalDisclaimer compact />
    </div>
  )
}
