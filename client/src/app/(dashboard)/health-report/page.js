/* eslint-disable */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import {
  IconCaduceus,
  IconStethoscope,
  IconShield,
  IconFileText,
  IconCheckCircle,
  IconActivity,
  IconUser
} from '@/components/Icons'
import ClinicalDisclaimer from '@/components/ClinicalDisclaimer'
import EmergencyNotice from '@/components/EmergencyNotice'

export default function HealthReportPage() {
  const { user, authFetch } = useAuth()
  const [gamification, setGamification] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [gamRes, histRes] = await Promise.all([
        authFetch(`/patients/${user?.id}/gamification`),
        authFetch(`/patients/${user?.id}/history?limit=20`)
      ])
      const gamData = await gamRes.json()
      const histData = await histRes.json()
      setGamification(gamData.gamification || {})
      setHistory(histData.history || [])
    } catch (err) {
      console.error('Health document load failure:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center" style={{ minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner spinner-lg mb-2" style={{ margin: '0 auto' }}></div>
          <p className="text-caption">Compiling confidential personal health summary...</p>
        </div>
      </div>
    )
  }

  const totalCheckups = gamification?.total_checkups || history.length || 0
  const reviewedCheckups = history.filter(h => h.status === 'approved' || h.status === 'corrected').length

  const clinicalPreventiveProtocols = [
    {
      category: 'Pulmonary & Respiratory',
      title: 'Airway Hygiene & Respiratory Health',
      guidance: 'Avoid environmental triggers (fine particulate matter, tobacco smoke, cold air shock). Practice diaphragmatic breathing to support functional lung capacity.',
      monitoring: 'Monitor peak flow or note shortness of breath triggers.'
    },
    {
      category: 'Cardiovascular Health',
      title: 'Circulatory & Blood Pressure Vigilance',
      guidance: 'Maintain regular moderate aerobic activity (150 minutes weekly) and prioritize balanced sodium intake to support endothelial function.',
      monitoring: 'Schedule annual ambulatory blood pressure checks.'
    },
    {
      category: 'Metabolic & Hydration',
      title: 'Metabolic Balance & Glycemic Stability',
      guidance: 'Prioritize fiber-rich whole nutrition with lean proteins. Maintain consistent daily hydration (2.0 to 2.5 liters) to support renal filtration.',
      monitoring: 'Review annual lipid and fasting glucose markers.'
    },
    {
      category: 'Restorative Immunology',
      title: 'Sleep Architecture & Stress Physiology',
      guidance: 'Sustain 7 to 9 hours of uninterrupted restorative sleep. Chronic nocturnal awakenings suppress cellular immunity and elevate inflammatory markers.',
      monitoring: 'Establish consistent circadian sleep schedules.'
    }
  ]

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
            Patient: <strong style={{ color: 'var(--text-primary)' }}>{user?.name || 'Patient'}</strong> &bull; Record ID: <span className="text-tabular">{user?.id?.slice(0, 8) || 'MED-001'}</span> &bull; Generated: <span className="text-tabular">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
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
          Patient Baseline Profile & Consultation Consistency
        </h2>

        <div className="grid-4" style={{ gap: '1rem' }}>
          <div className="clinical-panel-subtle" style={{ padding: '0.875rem 1rem' }}>
            <span className="text-caption">Baseline Demographics</span>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginTop: '0.25rem', color: 'var(--text-primary)' }}>
              {user?.age ? `${user.age} Years` : 'Recorded'}{user?.gender ? ` &bull; ${user.gender}` : ''}
            </div>
          </div>

          <div className="clinical-panel-subtle" style={{ padding: '0.875rem 1rem' }}>
            <span className="text-caption">Body Metrics</span>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginTop: '0.25rem', color: 'var(--text-primary)' }}>
              {user?.weight ? `${user.weight} kg` : 'Weight unrecorded'}{user?.height ? ` &bull; ${user.height} cm` : ''}
            </div>
          </div>

          <div className="clinical-panel-subtle" style={{ padding: '0.875rem 1rem' }}>
            <span className="text-caption">Total Checkups</span>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginTop: '0.25rem', color: 'var(--text-primary)' }}>
              {totalCheckups} Consultations
            </div>
          </div>

          <div className="clinical-panel-subtle" style={{ padding: '0.875rem 1rem' }}>
            <span className="text-caption">Physician Oversight</span>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginTop: '0.25rem', color: 'var(--clinical-teal)' }}>
              {reviewedCheckups} Verified
            </div>
          </div>
        </div>

        {(user?.allergies || user?.chronic_conditions) && (
          <div style={{ marginTop: '1rem', paddingTop: '0.875rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            {user?.allergies && (
              <div className="text-caption">
                <strong>Recorded Allergies:</strong> {user.allergies}
              </div>
            )}
            {user?.chronic_conditions && (
              <div className="text-caption">
                <strong>Chronic Health Factors:</strong> {user.chronic_conditions}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Longitudinal Assessment Timeline */}
      <div className="clinical-card mb-4" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="heading-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IconFileText size={18} color="var(--clinical-teal)" />
            Longitudinal Assessment Records
          </h2>
          <span className="text-caption text-tabular">
            {history.length} Record{history.length === 1 ? '' : 's'} on file
          </span>
        </div>

        {history.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <p className="text-secondary" style={{ fontSize: '0.875rem' }}>
              No longitudinal records currently stored.
            </p>
          </div>
        ) : (
          <table className="clinical-table">
            <thead>
              <tr>
                <th>Consultation Date</th>
                <th>Primary Clinical Impression</th>
                <th>Statistical Correlation</th>
                <th>Clinical Verification</th>
                <th style={{ textAlign: 'right' }}>Document</th>
              </tr>
            </thead>
            <tbody>
              {history.map((record, i) => {
                const primary = record.conditions?.[0]
                const conf = primary?.confidence || 0
                const isApproved = record.status === 'approved'

                return (
                  <tr key={record.id || i}>
                    <td className="text-tabular" style={{ fontWeight: 500 }}>
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
                        {Math.round(conf * 100)}% correlation
                      </span>
                    </td>
                    <td>
                      <span className={`triage-tier-badge ${isApproved ? 'routine' : 'moderate'}`}>
                        {isApproved ? 'âœ“ Verified by Doctor' : 'Under Review'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        href={`/diagnosis?id=${record.id}`}
                        className="btn btn-ghost btn-sm"
                        style={{ minHeight: '30px', padding: '0.25rem 0.5rem' }}
                      >
                        View Summary â†’
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Evidence-Based Clinical Preventive Regimens */}
      <div className="clinical-card mb-6" style={{ padding: '1.75rem' }}>
        <h2 className="heading-sm mb-3" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <IconShield size={18} color="var(--clinical-teal)" />
          Evidence-Based Clinical Health Guidance
        </h2>
        <p className="text-caption mb-3">
          Physician-curated lifestyle and preventive health protocols tailored to ongoing symptom monitoring.
        </p>

        <div className="grid-2" style={{ gap: '1rem' }}>
          {clinicalPreventiveProtocols.map((protocol, i) => (
            <div key={i} className="clinical-panel-subtle" style={{ padding: '1.25rem' }}>
              <div className="eyebrow-clinical" style={{ fontSize: '0.6875rem', marginBottom: '0.25rem' }}>
                {protocol.category}
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                {protocol.title}
              </div>
              <p className="text-secondary" style={{ fontSize: '0.8125rem', lineHeight: 1.55, marginBottom: '0.75rem' }}>
                {protocol.guidance}
              </p>
              <div className="text-caption" style={{ fontSize: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
                <strong>Recommendation:</strong> {protocol.monitoring}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Official Medical Disclaimer */}
      <ClinicalDisclaimer />
    </div>
  )
}
