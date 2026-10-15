/* eslint-disable */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import {
  IconStethoscope,
  IconCheckCircle,
  IconAlertTriangle,
  IconFileText,
  IconUser,
  IconArrowRight
} from '@/components/Icons'
import ClinicalDisclaimer from '@/components/ClinicalDisclaimer'

export default function DoctorDashboard() {
  const { user, authFetch, loading: authLoading } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading || !user) return
    loadDashboard()
  }, [authLoading, authFetch, user])

  async function loadDashboard() {
    try {
      const res = await authFetch('/doctors/dashboard')
      const data = await res.json()
      setDashboard(data.dashboard)
    } catch (err) {
      console.error('Doctor workspace load failure:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center" style={{ minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner spinner-lg mb-2" style={{ margin: '0 auto' }}></div>
          <p className="text-caption">Loading clinician triage queue...</p>
        </div>
      </div>
    )
  }

  const stats = dashboard?.stats || {}
  const recent = dashboard?.recentSubmissions || []
  const pendingCount = stats.pendingReviews || 0

  return (
    <div className="animate-calm-fade">
      {/* Clinician Masthead */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div className="eyebrow-clinical mb-1">Clinical Oversight Portal</div>
          <h1 className="editorial-heading-lg" style={{ fontSize: '1.875rem' }}>
            Physician Triage &amp; Review Workspace
          </h1>
          <p className="text-secondary mt-1" style={{ fontSize: '0.9375rem' }}>
            Practitioner: <strong style={{ color: 'var(--text-primary)' }}>{user?.name || 'Dr. Practitioner'}</strong> &bull; Department of Clinical Triage &amp; Review
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <Link href="/doctor/submissions?status=pending" className="btn btn-primary btn-sm">
            {pendingCount > 0 ? `Review Pending Queue (${pendingCount})` : 'View Triage Queue'}
          </Link>
          <Link href="/doctor/analytics" className="btn btn-secondary btn-sm">
            Clinical Metrics
          </Link>
        </div>
      </div>

      {/* Clinical Telemetry Bar */}
      <div className="grid-3 mb-4">
        <div className="clinical-card" style={{ borderLeft: pendingCount > 0 ? '4px solid var(--triage-moderate)' : '1px solid var(--border-subtle)' }}>
          <span className="text-caption" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Pending Physician Triage
          </span>
          <div style={{ fontFamily: 'var(--font-editorial)', fontSize: '2.25rem', fontWeight: 500, color: pendingCount > 0 ? 'var(--triage-moderate)' : 'var(--text-primary)', marginTop: '0.25rem' }}>
            {pendingCount}
          </div>
          <div className="text-caption mt-1">
            Patient assessments awaiting clinical sign-off or diagnosis correction.
          </div>
        </div>

        <div className="clinical-card">
          <span className="text-caption" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            My Verified Reviews
          </span>
          <div style={{ fontFamily: 'var(--font-editorial)', fontSize: '2.25rem', fontWeight: 500, color: 'var(--clinical-teal)', marginTop: '0.25rem' }}>
            {stats.reviewedByMe || 0}
          </div>
          <div className="text-caption mt-1">
            Consultations validated or calibrated with clinical notes.
          </div>
        </div>

        <div className="clinical-card">
          <span className="text-caption" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Monitored Cohort
          </span>
          <div style={{ fontFamily: 'var(--font-editorial)', fontSize: '2.25rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            {stats.totalPatients || 0}
          </div>
          <div className="text-caption mt-1">
            Active patient profiles registered across symptom monitoring programs.
          </div>
        </div>
      </div>

      {/* Triage Queue Table */}
      <div className="clinical-card mb-6" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div>
            <h2 className="heading-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IconStethoscope size={18} color="var(--clinical-teal)" />
              Recent Patient Intake &amp; Triage Submissions
            </h2>
            <p className="text-caption mt-0.5">
              Review model-synthesized symptom vectors and provide physician verification or corrections.
            </p>
          </div>

          <Link href="/doctor/submissions" className="btn btn-ghost btn-sm" style={{ color: 'var(--clinical-teal)', fontWeight: 600 }}>
            Full Triage Registry →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <p className="text-secondary" style={{ fontSize: '0.875rem' }}>
              No incoming patient assessments in the current queue.
            </p>
          </div>
        ) : (
          <table className="clinical-table" role="table">
            <thead>
              <tr>
                <th scope="col">Patient Identification</th>
                <th scope="col">Demographics</th>
                <th scope="col">Synthesized Differential</th>
                <th scope="col">Evidence Level</th>
                <th scope="col">Triage Status</th>
                <th scope="col">Date</th>
                <th scope="col" style={{ textAlign: 'right' }}>Clinical Action</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((sub, i) => {
                const conf = sub.conditions?.[0]?.confidence || sub.confidence_scores?.[0]?.confidence || 0
                const isPending = sub.status === 'pending'
                const isApproved = sub.status === 'approved'

                return (
                  <tr key={sub.id || i}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {sub.patient_name}
                    </td>
                    <td className="text-caption text-tabular">
                      {sub.patient_age ? `${sub.patient_age}y` : '—'} &bull; {sub.patient_gender || '—'}
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {sub.conditions?.[0]?.name || 'Assessment'}
                    </td>
                    <td>
                      <span className="text-caption text-tabular" style={{ fontWeight: 600, color: conf >= 0.7 ? 'var(--clinical-teal)' : 'var(--triage-moderate)' }}>
                        {Math.round(conf * 100)}%
                      </span>
                    </td>
                    <td>
                      <span className={`triage-tier-badge ${isApproved ? 'routine' : isPending ? 'moderate' : 'urgent'}`}>
                        {isApproved ? 'Verified' : isPending ? 'Review Required' : sub.status}
                      </span>
                    </td>
                    <td className="text-caption text-tabular">
                      {new Date(sub.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        href={`/doctor/review/${sub.id}`}
                        className="btn btn-primary btn-sm"
                        style={{ minHeight: '32px' }}
                      >
                        Evaluate &amp; Sign
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <ClinicalDisclaimer compact />
    </div>
  )
}
