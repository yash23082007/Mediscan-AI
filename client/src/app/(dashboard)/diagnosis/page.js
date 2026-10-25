'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { formatDate } from '@/lib/format'
import {
  IconCaduceus,
  IconStethoscope,
  IconShield,
  IconFileText,
  IconCheckCircle,
  IconAlertTriangle,
  IconArrowRight,
  IconHelpCircle
} from '@/components/Icons'
import ClinicalDisclaimer from '@/components/ClinicalDisclaimer'

function EvidenceIndicator({ confidence }) {
  if (typeof confidence !== 'number' || !Number.isFinite(confidence)) {
    return <p className="text-caption">Added by clinician. No model score.</p>
  }
  const pct = Math.round(confidence * 100)

  return (
    <div>
      <p className="text-caption text-tabular" style={{ marginBottom: '0.375rem' }}>Experimental model estimate: {pct}%</p>
      <div className="evidence-bar" style={{ maxWidth: '180px' }} aria-hidden="true">
        <div
          className="evidence-bar-fill"
          style={{
            width: `${pct}%`,
            background: confidence >= 0.75 ? 'var(--clinical-teal)' : 'var(--triage-moderate)'
          }}
        />
      </div>
    </div>
  )
}

function DiagnosisContent() {
  const searchParams = useSearchParams()
  const diagnosisId = searchParams.get('id')
  const { user, authFetch, loading: authLoading } = useAuth()
  const [diagnosis, setDiagnosis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showTechnicalWeights, setShowTechnicalWeights] = useState(false)
  const [diagnosisError, setDiagnosisError] = useState('')

  const loadDiagnosis = useCallback(async () => {
    try {
      setDiagnosisError('')
      let url = '/diagnoses/latest'
      if (diagnosisId) url = `/diagnoses/${diagnosisId}`
      const res = await authFetch(url)
      const data = await res.json()
      if (!res.ok && res.status !== 404) throw new Error(data.error || 'Assessment could not be loaded')
      setDiagnosis(data.diagnosis)
    } catch (err) {
      console.error('Failed to load diagnosis record:', err)
      setDiagnosisError('We could not load this assessment. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [authFetch, diagnosisId])

  useEffect(() => {
    if (authLoading || !user) return
    Promise.resolve().then(loadDiagnosis)
  }, [authLoading, loadDiagnosis, user])

  if (loading) {
    return (
      <div className="flex justify-center items-center" style={{ minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner spinner-lg mb-2" style={{ margin: '0 auto' }}></div>
          <p className="text-caption">Synthesizing clinical findings...</p>
        </div>
      </div>
    )
  }

  if (!diagnosis) {
    if (diagnosisError) {
      return (
        <div className="clinical-panel-subtle text-center" style={{ maxWidth: '600px', margin: '3rem auto', padding: '3rem 2rem' }} role="alert">
          <h2 className="heading-md mb-2">Assessment unavailable</h2>
          <p className="text-secondary mb-4">{diagnosisError}</p>
          <button className="btn btn-primary" onClick={() => { setLoading(true); loadDiagnosis() }}>Try again</button>
        </div>
      )
    }
    return (
      <div className="clinical-panel-subtle text-center" style={{ maxWidth: '600px', margin: '3rem auto', padding: '3rem 2rem' }}>
        <IconStethoscope size={32} color="var(--clinical-teal)" style={{ margin: '0 auto 1rem' }} />
        <h2 className="heading-md mb-2">No Assessment Available</h2>
        <p className="text-secondary mb-4" style={{ fontSize: '0.875rem' }}>
          No active or previous symptom consultations were located in this session. Complete a guided consultation to receive a clinical evaluation.
        </p>
        <Link href="/questionnaire" className="btn btn-primary">
          Start New Assessment
        </Link>
      </div>
    )
  }

  const conditions = diagnosis.conditions || []
  const explanation = diagnosis.explanation || ''
  const primaryCondition = conditions[0] || null
  const differentialConditions = conditions.slice(1)

  // Clinical metadata extraction
  const rawContributions = diagnosis.feature_contributions || {}
  const hasStructured = rawContributions && rawContributions.factors !== undefined
  const contributions = hasStructured ? (rawContributions.factors || {}) : rawContributions
  const clinicalOverview = hasStructured ? rawContributions.clinical_overview : ''
  const precautions = hasStructured ? (rawContributions.precautions || []) : []
  const triage = hasStructured ? (rawContributions.triage || null) : null

  return (
    <div className="animate-calm-fade" style={{ maxWidth: '820px', margin: '0 auto' }}>
      {triage?.urgency_level === 'urgent' || triage?.urgency_level === 'emergency' ? (
        <section className="clinical-alert clinical-alert-urgent mb-4" role="alert" aria-live="assertive">
          <div>
            <strong>{triage.title}</strong>
            <p>{triage.guidance}</p>
          </div>
          <span className="triage-tier-badge urgent">{triage.urgency_level === 'emergency' ? 'Emergency' : 'Urgent'}</span>
        </section>
      ) : null}

      {/* Header & Verification Status */}
      <div style={{ marginBottom: '2rem' }}>
        <div className="eyebrow-clinical mb-1">Assessment Summary</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="editorial-heading-lg" style={{ fontSize: '1.875rem' }}>
              Symptom Evaluation Summary
            </h1>
            <p className="text-caption mt-1">
              Assessment ID: <span className="text-tabular">{diagnosis.id?.slice(0, 8) || 'Current'}</span> • Recorded on{' '}
              <span className="text-tabular">
                {formatDate(diagnosis.created_at, { dateStyle: 'long' })}
              </span>
            </p>
          </div>

          <span className={`triage-tier-badge ${['approved', 'corrected', 'overridden'].includes(diagnosis.status) ? 'routine' : 'moderate'}`}>
            {['approved', 'corrected', 'overridden'].includes(diagnosis.status) ? 'Case reviewed' : 'Awaiting review'}
          </span>
        </div>
      </div>

      {diagnosis.review && (
        <section className="clinical-panel-subtle mb-4" aria-labelledby="review-status-heading">
          <h2 className="heading-sm mb-1" id="review-status-heading">A clinician reviewed this result</h2>
          <p className="text-caption mb-2">
            {diagnosis.review.reviewer_name ? `Reviewed by ${diagnosis.review.reviewer_name}` : 'Clinician review'}
            {diagnosis.review.reviewed_at ? ` · ${formatDate(diagnosis.review.reviewed_at)}` : ''}
          </p>
          {diagnosis.review.final_conditions?.[0]?.name && diagnosis.review.final_conditions[0].name !== primaryCondition?.name && (
            <p className="mb-2"><strong>Updated result:</strong> {diagnosis.review.final_conditions[0].name}</p>
          )}
          {diagnosis.review.notes && <p className="text-secondary">{diagnosis.review.notes}</p>}
        </section>
      )}

      {/* Primary Clinical Consideration Card */}
      {primaryCondition ? (
      <div className="triage-tier-card primary mb-4" style={{ padding: '2rem' }}>
        <p className="text-caption mb-1">Possible match based on your answers</p>
        <div className="eyebrow-clinical mb-1" style={{ color: 'var(--clinical-teal)' }}>
          Model Estimate
        </div>
        <h2 className="editorial-heading-lg mb-2" style={{ fontSize: '1.625rem', color: 'var(--text-primary)' }}>
          {primaryCondition.name}
        </h2>

        <div style={{ margin: '1rem 0 1.25rem' }}>
          <EvidenceIndicator confidence={primaryCondition.confidence} />
        </div>

        {clinicalOverview ? (
          <div style={{
            background: 'var(--surface-subtle)',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            borderLeft: '3px solid var(--clinical-teal)',
            marginBottom: '1rem'
          }}>
            <h3 className="heading-sm mb-1" style={{ fontSize: '0.875rem', color: 'var(--clinical-teal)' }}>
              About this condition
            </h3>
            <p className="text-secondary" style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
              {clinicalOverview}
            </p>
          </div>
        ) : null}

        <div className="clinical-panel-subtle" style={{ padding: '0.875rem 1.125rem' }}>
          <p className="text-caption" style={{ fontSize: '0.8125rem', lineHeight: 1.55 }}>
            <strong>What this means:</strong> The model assigned an estimate to {primaryCondition.name} based on your reported symptoms.
            <br />
            <strong>What this does not mean:</strong> This is not an in-person physical examination, radiological imaging, or laboratory blood test. It provides preliminary guidance to focus your upcoming clinical consultation.
          </p>
        </div>
      </div>
      ) : (
        <div className="clinical-panel-subtle mb-4" role="status">
          <h2 className="heading-sm mb-1">No condition estimate available</h2>
          <p className="text-secondary" style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
            {explanation || 'The available information was not enough to provide a condition estimate.'}
          </p>
          {diagnosis.feature_contributions?.missing_evidence_hints?.length > 0 && (
            <ul className="mt-2">
              {diagnosis.feature_contributions.missing_evidence_hints.map((hint) => <li key={hint}>{hint}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Secondary Differential Diagnoses to Consider */}
      {differentialConditions.length > 0 && (
        <div className="mb-6">
          <h2 className="heading-sm mb-3">
            Other Model Estimates
          </h2>
          <div className="grid-2">
            {differentialConditions.map((diff, i) => (
              <div key={i} className="clinical-card" style={{ padding: '1.25rem' }}>
                <div className="text-caption" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Also possible
                </div>
                <div style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0.25rem 0 0.5rem' }}>
                  {diff.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="triage-tier-badge moderate" style={{ fontSize: '0.6875rem' }}>
                    {Math.round(diff.confidence * 100)}% model estimate
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clinical Precautions & Patient Safety Regimens */}
      {precautions.length > 0 && (
        <div className="mb-6">
          <h2 className="heading-sm mb-3" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IconShield size={18} color="var(--clinical-teal)" />
            What you can do now
          </h2>
          <ul className="precaution-list">
            {precautions.map((prec, i) => (
              <li key={i}>{prec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Symptoms Contributing to This Result */}
      {explanation && (
        <div className="clinical-panel-subtle mb-4">
          <h2 className="heading-sm mb-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IconFileText size={18} color="var(--clinical-teal)" />
            How the model got here
          </h2>
          <p className="text-secondary" style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
            {explanation}
          </p>
        </div>
      )}

      {/* Symptoms Contributing to Evaluation (Humanized XAI) */}
      {Object.keys(contributions).length > 0 && (
        <div className="clinical-card mb-6">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="heading-sm">
              Symptoms Contributing to This Assessment
            </h2>
            <button
              onClick={() => setShowTechnicalWeights(!showTechnicalWeights)}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.75rem', color: 'var(--clinical-teal)' }}
            >
              {showTechnicalWeights ? 'Hide scores' : 'Show scores'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Object.entries(contributions)
              .filter(([k]) => typeof contributions[k] === 'number')
              .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
              .slice(0, 8)
              .map(([feature, weight], i, arr) => {
                const isPositive = weight > 0
                const formattedName = feature.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

                return (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0',
                    borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: isPositive ? 'var(--clinical-teal)' : 'var(--text-muted)', fontSize: '0.875rem' }}>
                        {isPositive ? '●' : '○'}
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {formattedName}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className="text-caption" style={{ fontSize: '0.75rem' }}>
                        {isPositive ? 'Points toward this' : 'Points away from this'}
                      </span>
                      {showTechnicalWeights && (
                        <span className="text-caption text-tabular" style={{ fontSize: '0.75rem', minWidth: '42px', textAlign: 'right' }}>
                          {isPositive ? '+' : ''}{Number(weight).toFixed(3)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Dataset Provenance Reference */}
      <div className="clinical-panel-subtle mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Dataset Provenance
          </div>
          <p className="text-caption mt-0.5">
            The training corpus contains synthetic symptom profiles. See the source and measured dataset details on the transparency page.
          </p>
        </div>
        <Link href="/datasets" className="btn btn-secondary btn-sm">
          Review Dataset Provenance →
        </Link>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem' }}>
        <Link href="/health-report" className="btn btn-primary btn-lg">
          Add to Health Records
        </Link>
        <Link href="/questionnaire" className="btn btn-secondary btn-lg">
          Start Another Consultation
        </Link>
        <button
          onClick={() => window.print()}
          className="btn btn-ghost btn-lg"
          style={{ marginLeft: 'auto' }}
        >
          Print Clinical Summary
        </button>
      </div>

      {/* Comprehensive Medical Disclaimer */}
      <ClinicalDisclaimer />
    </div>
  )
}

export default function DiagnosisPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner spinner-lg"></div>
      </div>
    }>
      <DiagnosisContent />
    </Suspense>
  )
}
