'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { formatDateTime } from '@/lib/format'
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
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')

  const loadSubmission = useCallback(async () => {
    try {
      const res = await authFetch(`/doctors/submissions/${id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Case details could not be loaded')
      setSubmission(data.submission)
      setFeedbackHistory(data.feedbackHistory || [])
    } catch (err) {
      console.error('Failed to load submission detail:', err)
      setLoadError(err.message || 'Case details could not be loaded. Check your connection and try again.')
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

      if (feedbackAction !== 'approve') {
        body.correction = {
          conditions: [{ name: correctionName.trim() }],
          notes: notes.trim()
        }
      }
      body.notes = notes.trim()

      const response = await authFetch('/feedback', {
        method: 'POST',
        body: JSON.stringify(body)
      })
      const responseData = await response.json()
      if (!response.ok) throw new Error(responseData.error || 'Review could not be recorded')

      setSuccess('Review saved.')
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
        <h2 className="heading-md mb-2">{loadError ? 'Case unavailable' : 'Submission not found'}</h2>
        <p className="text-secondary mb-4" style={{ fontSize: '0.875rem' }}>
          {loadError || 'The requested case could not be found.'}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {loadError && <button onClick={() => { setLoading(true); setLoadError(''); loadSubmission() }} className="btn btn-primary">Try again</button>}
          <button onClick={() => router.back()} className="btn btn-secondary">Back to triage</button>
        </div>
      </div>
    )
  }

  const conditions = submission.conditions || []
  const rawContributions = submission.feature_contributions || {}
  const contributions = rawContributions.factors && typeof rawContributions.factors === 'object'
    ? rawContributions.factors
    : rawContributions
  const numericContributions = Object.entries(contributions)
    .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    .slice(0, 8)
  const triage = submission.triage_details || rawContributions.triage
  const patientAnswers = submission.questionnaire_responses || {}
  const isReviewed = ['approved', 'corrected', 'overridden'].includes(submission.status)
  const requiresCorrection = feedbackAction !== 'approve' && Boolean(feedbackAction)
  const requiresNotes = requiresCorrection
  const canSubmit = feedbackAction && !submitting
    && (!requiresCorrection || correctionName.trim().length > 0)
    && (!requiresNotes || notes.trim().length > 0)

  return (
    <div className="animate-calm-fade review-page" style={{ maxWidth: '1120px', margin: '0 auto' }}>
      {/* Navigation & Patient Identification */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => router.back()} className="btn btn-ghost btn-sm" style={{ padding: '0.25rem 0.5rem' }}>
          <IconChevronLeft size={16} />
          <span>Back to Triage</span>
        </button>
        <div>
          <h1 className="editorial-heading-lg" style={{ fontSize: '1.625rem' }}>
            Case · {submission.patient_name}
          </h1>
        </div>
      </div>

      {triage && ['urgent', 'emergency'].includes(triage.urgency_level) && (
        <section className="clinical-alert clinical-alert-urgent mb-4" role="alert">
          <div>
            <strong>{triage.title || `${triage.urgency_level} priority`}</strong>
            <p>{triage.guidance}</p>
          </div>
          <span className="triage-tier-badge urgent">{triage.urgency_level === 'emergency' ? 'Emergency' : 'Urgent'}</span>
        </section>
      )}

      <div className="review-page-grid">
        <div className="review-evidence-column">

      {/* Patient Clinical Baseline Profile */}
      <div className="clinical-card mb-4" style={{ padding: '1.5rem' }}>
        <h2 className="heading-sm mb-3" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <IconUser size={18} color="var(--clinical-teal)" />
          Patient details
        </h2>
        <div className="grid-3" style={{ gap: '1rem' }}>
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
              <span className={`triage-tier-badge ${isReviewed ? 'routine' : 'moderate'}`}>
                {isReviewed ? 'Reviewed' : 'Waiting for review'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Model Diagnostic Evaluation & Differentials */}
      <div className="clinical-card mb-4" style={{ padding: '1.5rem' }}>
        <h2 className="heading-sm mb-3" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <IconStethoscope size={18} color="var(--clinical-teal)" />
          Model estimates
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
                <span className="text-caption" style={{ fontWeight: 600 }}>{i === 0 ? 'Top estimate' : 'Also possible'}</span>
                <span style={{ fontWeight: 600, marginLeft: '0.5rem', color: 'var(--text-primary)' }}>
                  {condition.name}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="text-caption text-tabular" style={{ fontWeight: 600, color: 'var(--clinical-teal)' }}>
                  {typeof condition.confidence === 'number' && Number.isFinite(condition.confidence) ? `${Math.round(condition.confidence * 100)}% model estimate` : 'No score'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {submission.explanation && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
            <h3 className="heading-sm" style={{ marginBottom: '0.375rem' }}>
              How the model got here
            </h3>
            <p className="text-secondary" style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
              {submission.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Feature Contributions & Symptom Alignment */}
      {numericContributions.length > 0 && (
        <div className="clinical-card mb-4" style={{ padding: '1.5rem' }}>
          <h2 className="heading-sm mb-3" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IconFileText size={18} color="var(--clinical-teal)" />
            Factors in this estimate
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {numericContributions
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
                    {w > 0 ? 'Points toward this' : 'Points away from this'}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {triage && (
        <section className="clinical-panel-subtle mb-4" aria-labelledby="case-priority-heading">
          <h2 id="case-priority-heading" className="heading-sm mb-2">Priority and safety flags</h2>
          <p className="mb-2">
            <span className={`triage-tier-badge ${triage.urgency_level === 'emergency' || triage.urgency_level === 'urgent' ? 'urgent' : triage.urgency_level === 'routine' ? 'routine' : 'moderate'}`}>
              {triage.urgency_level || submission.triage_level || 'Not recorded'}
            </span>
          </p>
          {triage.red_flags?.length > 0 && (
            <ul className="review-safety-list">
              {triage.red_flags.map((flag, index) => <li key={`${flag.id || flag.title || 'flag'}-${index}`}>{flag.title || flag.id || flag}</li>)}
            </ul>
          )}
          {triage.guidance && <p className="text-secondary mt-2">{triage.guidance}</p>}
        </section>
      )}

      <section className="clinical-card mb-4" aria-labelledby="patient-answers-heading">
        <h2 id="patient-answers-heading" className="heading-sm mb-3">What the patient answered</h2>
        {Object.keys(patientAnswers).length > 0 ? (
          <dl className="review-answer-list">
            {Object.entries(patientAnswers).map(([question, answer]) => (
              <div key={question}>
                <dt>{question.replace(/_/g, ' ')}</dt>
                <dd>{Array.isArray(answer) ? answer.join(', ') : String(answer)}</dd>
              </div>
            ))}
          </dl>
        ) : <p className="text-caption">No questionnaire answers were attached to this case.</p>}
      </section>

      <section className="clinical-card mb-4" aria-labelledby="review-history-heading">
        <h2 id="review-history-heading" className="heading-sm mb-3">Earlier reviews</h2>
        {feedbackHistory.length > 0 ? (
          <ol className="review-history-list">
            {feedbackHistory.map(item => (
              <li key={item.id}>
                <div className="review-history-heading">
                  <strong>{item.doctor_name || 'Clinician'}</strong>
                  <time dateTime={item.created_at}>{formatDateTime(item.created_at)}</time>
                </div>
                <p>{item.action || 'Review'}{item.notes ? ` · ${item.notes}` : ''}</p>
              </li>
            ))}
          </ol>
        ) : <p className="text-caption">No review has been recorded for this case.</p>}
      </section>

        </div>

      {/* Clinician Action & Feedback Sign-Off */}
      <aside className="clinical-card-elevated review-form-card mb-6" style={{ padding: '1.5rem', borderLeft: '4px solid var(--clinical-teal)' }}>
        <h2 className="heading-sm mb-1">
          Your review
        </h2>
        <p className="text-caption mb-3">
          Your review updates the result the patient sees. Feedback is recorded but does not retrain this model.
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

        {isReviewed ? (
          <p className="clinical-panel-subtle" role="status">This case has already been reviewed.</p>
        ) : (
        <form onSubmit={handleSubmitFeedback}>
          <fieldset className="form-group review-action-fieldset">
            <legend className="form-label">Choose an action</legend>
            <div className="review-action-options" role="radiogroup" aria-label="Review action">
              {[
                { value: 'approve', label: 'Approve' },
                { value: 'correct', label: 'Correct' },
                { value: 'override', label: 'Override' }
              ].map(action => (
                <label key={action.value} className={`review-action-option ${feedbackAction === action.value ? 'selected' : ''}`}>
                  <input type="radio" name="review-action" value={action.value} checked={feedbackAction === action.value} onChange={() => setFeedbackAction(action.value)} />
                  <span>{action.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {feedbackAction && feedbackAction !== 'approve' && (
            <div className="form-group">
              <label className="form-label" htmlFor="corrected-condition">Updated condition</label>
              <input
                id="corrected-condition"
                type="text"
                className="form-input"
                placeholder="Enter the condition"
                value={correctionName}
                onChange={(e) => setCorrectionName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="review-notes">Review notes {requiresNotes ? <span aria-hidden="true">(required)</span> : <span className="text-caption">(optional)</span>}</label>
            <textarea
              id="review-notes"
              className="form-input"
              rows="3"
              placeholder={requiresNotes ? 'Explain the correction or override for the patient and care team.' : 'Add context for the patient or care team.'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required={requiresNotes}
              style={{ resize: 'vertical' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={!canSubmit}
          >
            {submitting ? (
              <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></span>
            ) : (
              'Save review'
            )}
          </button>
        </form>
        )}
      </aside>
      </div>

      <ClinicalDisclaimer compact />
    </div>
  )
}
