'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
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
import EmergencyNotice from '@/components/EmergencyNotice'

function EvidenceIndicator({ confidence }) {
  const pct = Math.round(confidence * 100)
  let label = 'Investigational Evidence'
  let tier = 'moderate'

  if (confidence >= 0.75) {
    label = 'Strong Symptom Correlation'
    tier = 'routine'
  } else if (confidence >= 0.45) {
    label = 'Moderate Clinical Alignment'
    tier = 'moderate'
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
        <span className={`triage-tier-badge ${tier}`}>
          {label}
        </span>
        <span className="text-caption text-tabular" style={{ fontSize: '0.75rem' }}>
          ({pct}% statistical correlation)
        </span>
      </div>
      <div className="evidence-bar" style={{ maxWidth: '180px' }}>
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
  const { authFetch } = useAuth()
  const [diagnosis, setDiagnosis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showTechnicalWeights, setShowTechnicalWeights] = useState(false)

  useEffect(() => {
    loadDiagnosis()
  }, [diagnosisId])

  const loadDiagnosis = async () => {
    try {
      let url = '/diagnoses/latest'
      if (diagnosisId) url = `/diagnoses/${diagnosisId}`
      const res = await authFetch(url)
      const data = await res.json()
      setDiagnosis(data.diagnosis)
    } catch (err) {
      console.error('Failed to load diagnosis record:', err)
    } finally {
      setLoading(false)
    }
  }

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
  const primaryCondition = conditions[0] || { name: 'Undetermined Condition', confidence: 0.5 }
  const differentialConditions = conditions.slice(1)

  // Clinical metadata extraction
  const rawContributions = diagnosis.feature_contributions || {}
  const hasStructured = rawContributions && rawContributions.factors !== undefined
  const contributions = hasStructured ? (rawContributions.factors || {}) : rawContributions
  const clinicalOverview = hasStructured ? rawContributions.clinical_overview : ''
  const precautions = hasStructured ? (rawContributions.precautions || []) : []

  return (
    <div className="animate-calm-fade" style={{ maxWidth: '820px', margin: '0 auto' }}>
      {/* Header & Verification Status */}
      <div style={{ marginBottom: '2rem' }}>
        <div className="eyebrow-clinical mb-1">Clinical Assessment Document</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="editorial-heading-lg" style={{ fontSize: '1.875rem' }}>
              Symptom Evaluation Summary
            </h1>
            <p className="text-caption mt-1">
              Assessment ID: <span className="text-tabular">{diagnosis.id?.slice(0, 8) || 'Current'}</span> &bull; Recorded on{' '}
              <span className="text-tabular">
                {new Date(diagnosis.created_at || Date.now()).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </p>
          </div>

          <span className={`triage-tier-badge ${diagnosis.status === 'approved' ? 'routine' : 'moderate'}`}>
            {diagnosis.status === 'approved'
              ? '✓ Physician Verified'
              : 'Submitted for Clinical Review'}
          </span>
        </div>
      </div>

      {/* Emergency Guidance Check */}
      <EmergencyNotice className="mb-4" />

      {/* Primary Clinical Consideration Card */}
      <div className="triage-tier-card primary mb-4" style={{ padding: '2rem' }}>
        <div className="eyebrow-clinical mb-1" style={{ color: 'var(--clinical-teal)' }}>
          Primary Differential Consideration
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
              Pathological Description
            </h3>
            <p className="text-secondary" style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
              {clinicalOverview}
            </p>
          </div>
        ) : null}

        <div className="clinical-panel-subtle" style={{ padding: '0.875rem 1.125rem' }}>
          <p className="text-caption" style={{ fontSize: '0.8125rem', lineHeight: 1.55 }}>
            <strong>What this means:</strong> Your reported symptom pattern shows statistical congruence with clinical presentations of {primaryCondition.name}.
            <br />
            <strong>What this does not mean:</strong> This is not an in-person physical examination, radiological imaging, or laboratory blood test. It provides preliminary guidance to focus your upcoming clinical consultation.
          </p>
        </div>
      </div>

      {/* Secondary Differential Diagnoses to Consider */}
      {differentialConditions.length > 0 && (
        <div className="mb-6">
          <h2 className="heading-sm mb-3">
            Secondary Conditions for Physician Consideration
          </h2>
          <div className="grid-2">
            {differentialConditions.map((diff, i) => (
              <div key={i} className="clinical-card" style={{ padding: '1.25rem' }}>
                <div className="text-caption" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Alternative Presentation #{i + 1}
                </div>
                <div style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0.25rem 0 0.5rem' }}>
                  {diff.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="triage-tier-badge moderate" style={{ fontSize: '0.6875rem' }}>
                    {Math.round(diff.confidence * 100)}% differential overlap
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
            Clinical Safety & Recommended Care Steps
          </h2>
          <div className="grid-2">
            {precautions.map((prec, i) => (
              <div key={i} className="clinical-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'var(--clinical-teal-subtle)',
                  color: 'var(--clinical-teal)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  flexShrink: 0
                }}>
                  {i + 1}
                </div>
                <span className="text-secondary" style={{ fontSize: '0.875rem', fontWeight: 500, textTransform: 'capitalize' }}>
                  {prec}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Symptoms Contributing to This Result */}
      {explanation && (
        <div className="clinical-panel-subtle mb-4">
          <h2 className="heading-sm mb-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IconFileText size={18} color="var(--clinical-teal)" />
            Diagnostic Reasoning Summary
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
              {showTechnicalWeights ? 'Hide Technical Weights' : 'Show Technical Weights'}
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
                        {isPositive ? 'Strong alignment' : 'Differential marker'}
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
            Clinical Validation & Reference Corpora
          </div>
          <p className="text-caption mt-0.5">
            Calibrated against 4,920 authentic patient diagnostic records across 132 validated clinical symptoms.
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
