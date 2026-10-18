'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import {
  IconUser,
  IconShield
} from '@/components/Icons'
import EmergencyNotice from '@/components/EmergencyNotice'
import ClinicalDisclaimer from '@/components/ClinicalDisclaimer'

export default function HealthReportPage() {
  const { user, authFetch } = useAuth()
  const [history, setHistory] = useState([])
  const [latestDiagnosis, setLatestDiagnosis] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [histRes, latestRes] = await Promise.all([
          authFetch('/api/patients/history'),
          authFetch('/api/diagnoses/latest')
        ])

        if (histRes.ok) {
          const histData = await histRes.json()
          setHistory(histData.history || [])
        }

        if (latestRes.ok) {
          const latestData = await latestRes.json()
          setLatestDiagnosis(latestData.diagnosis)
        }
      } catch (err) {
        console.error('Failed to load health summary data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [authFetch])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '360px' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner spinner-lg mb-2" style={{ margin: '0 auto' }}></div>
          <p className="text-caption">Compiling confidential personal health summary...</p>
        </div>
      </div>
    )
  }

  const reviewedCheckups = history.filter(h => h.status === 'approved' || h.status === 'corrected').length

  // Extract real precautions from the patient's own latest assessment (F12)
  const realPrecautions = latestDiagnosis?.feature_contributions?.precautions || []
  const primaryCondition = latestDiagnosis?.conditions?.[0]?.name || null

  return (
    <div className="animate-calm-fade" style={{ maxWidth: '880px', margin: '0 auto' }}>
      {/* Document Header */}
      <div style={{
        paddingBottom: '1.5rem',
        marginBottom: '2rem',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div className="eyebrow-clinical mb-1">Confidential Clinical Document</div>
          <h1 className="editorial-heading-lg" style={{ fontSize: '2rem' }}>
            Personal Health Assessment Document
          </h1>
          <p className="text-caption mt-1">
            Patient: <strong style={{ color: 'var(--text-primary)' }}>{user?.name || '—'}</strong> • Record ID: <span className="text-tabular">{user?.id ? user.id.slice(0, 8) : '—'}</span> • Generated: <span className="text-tabular">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => window.print()}
            className="btn btn-secondary btn-sm"
          >
            Export / Print PDF
          </button>
          <Link href="/questionnaire" className="btn btn-primary btn-sm">
            New Consultation
          </Link>
        </div>
      </div>

      {/* Emergency Alert */}
      <EmergencyNotice className="mb-4" />

      {/* Clinical Profile & Telemetry Summary */}
      <div className="clinical-card mb-4" style={{ padding: '1.75rem' }}>
        <h2 className="heading-sm mb-3" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <IconUser size={18} color="var(--clinical-teal)" />
          Patient Baseline Profile & Consultation History
        </h2>

        <div className="grid-4" style={{ gap: '1rem' }}>
          <div className="clinical-panel-subtle" style={{ padding: '0.875rem 1rem' }}>
            <span className="text-caption">Baseline Demographics</span>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginTop: '0.25rem', color: 'var(--text-primary)' }}>
              {user?.age ? `${user.age} Years` : 'Age unrecorded'}{user?.gender ? ` • ${user.gender}` : ''}
            </div>
          </div>

          <div className="clinical-panel-subtle" style={{ padding: '0.875rem 1rem' }}>
            <span className="text-caption">Body Metrics</span>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginTop: '0.25rem', color: 'var(--text-primary)' }}>
              {user?.weight ? `${user.weight} kg` : 'Weight unrecorded'}{user?.height ? ` • ${user.height} cm` : ''}
            </div>
          </div>

          <div className="clinical-panel-subtle" style={{ padding: '0.875rem 1rem' }}>
            <span className="text-caption">Total Consultations</span>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginTop: '0.25rem', color: 'var(--clinical-teal)' }}>
              {history.length} Completed
            </div>
          </div>

          <div className="clinical-panel-subtle" style={{ padding: '0.875rem 1rem' }}>
            <span className="text-caption">Physician Reviews</span>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginTop: '0.25rem', color: 'var(--clinical-forest)' }}>
              {reviewedCheckups} Verified
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Consultation History Table */}
      <div className="clinical-card mb-4" style={{ padding: '1.75rem' }}>
        <h2 className="heading-sm mb-3">
          Clinical Consultation Records
        </h2>

        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <p className="text-secondary mb-2">No prior consultations recorded.</p>
            <Link href="/questionnaire" className="btn btn-secondary btn-sm">
              Start Your First Assessment
            </Link>
          </div>
        ) : (
          <table className="clinical-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Primary Clinical Impression</th>
                <th>Model Estimate</th>
                <th>Triage Review Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map((record) => {
                const primary = record.conditions?.[0]
                const conf = primary?.confidence || 0
                const isApproved = record.status === 'approved' || record.status === 'reviewed'

                return (
                  <tr key={record.id}>
                    <td className="text-tabular">
                      {new Date(record.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {primary?.name || 'Symptom Consultation'}
                    </td>
                    <td>
                      <span className="text-caption text-tabular">
                        {Math.round(conf * 100)}% estimate
                      </span>
                    </td>
                    <td>
                      <span className={`triage-tier-badge ${isApproved ? 'routine' : 'moderate'}`}>
                        {isApproved ? 'Verified by Clinician' : 'Pending Review'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        href={`/diagnosis?id=${record.id}`}
                        className="btn btn-ghost btn-sm"
                        style={{ minHeight: '30px', padding: '0.25rem 0.5rem' }}
                      >
                        View Summary →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Evidence-Based Condition Precautions */}
      {realPrecautions.length > 0 && (
        <div className="clinical-card mb-6" style={{ padding: '1.75rem' }}>
          <h2 className="heading-sm mb-3" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IconShield size={18} color="var(--clinical-teal)" />
            Clinical Guidance for {primaryCondition || 'Identified Symptoms'}
          </h2>
          <p className="text-caption mb-3">
            Actionable care guidelines sourced from official medical health protocols for this condition:
          </p>

          <div className="grid-2" style={{ gap: '1rem' }}>
            {realPrecautions.map((precaution, i) => (
              <div key={i} className="clinical-panel-subtle" style={{ padding: '1rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  {i + 1}. {precaution.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Official Medical Disclaimer */}
      <ClinicalDisclaimer />
    </div>
  )
}
