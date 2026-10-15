/* eslint-disable */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import {
  IconStethoscope,
  IconFileText,
  IconCheckCircle,
  IconAlertTriangle,
  IconArrowRight,
  IconActivity,
  IconUser
} from '@/components/Icons'
import ClinicalDisclaimer from '@/components/ClinicalDisclaimer'
import EmergencyNotice from '@/components/EmergencyNotice'

export default function PatientDashboard() {
  const { user, authFetch, loading: authLoading } = useAuth()
  const [history, setHistory] = useState([])
  const [gamification, setGamification] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading || !user) return
    loadData()
  }, [authLoading, authFetch, user])

  async function loadData() {
    try {
      const [histRes, gamRes] = await Promise.all([
        authFetch(`/patients/${user?.id}/history?limit=5`),
        authFetch(`/patients/${user?.id}/gamification`)
      ])
      const histData = await histRes.json()
      const gamData = await gamRes.json()
      setHistory(histData.history || [])
      setGamification(gamData.gamification || {})
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-skeleton" aria-label="Loading health workspace" role="status">
        <div className="skeleton skeleton-eyebrow" />
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-copy" />
        <div className="grid-3">
          {[1, 2, 3].map(item => <div key={item} className="clinical-card skeleton-card"><div className="skeleton skeleton-line" /><div className="skeleton skeleton-number" /></div>)}
        </div>
        <span className="text-caption">Retrieving confidential health records...</span>
      </div>
    )
  }

  const reviewedCount = history.filter(h => h.status === 'approved' || h.status === 'corrected').length
  const latestAssessment = history[0] || null

  return (
    <div className="animate-calm-fade">
      {/* Workspace Header */}
      <div className="workspace-hero" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div className="eyebrow-clinical mb-1">Personal Health Workspace</div>
          <h1 className="heading-xl" style={{ fontSize: '1.75rem' }}>
            Health Overview &bull; {user?.name || 'Patient'}
          </h1>
          <p className="text-secondary mt-1" style={{ fontSize: '0.9375rem' }}>
            Review past assessments, clinician feedback, and initiate new symptom consultations.
          </p>
        </div>

        <Link href="/questionnaire" className="btn btn-primary workspace-primary-action" id="start-checkup">
          <IconStethoscope size={18} />
          <span>New Symptom Assessment</span>
        </Link>
      </div>

      {/* Emergency Red Flag Notice */}
      <EmergencyNotice className="mb-4" />

      {/* Status Highlights */}
      <div className="grid-3 mb-4">
        <div className="clinical-card workspace-stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span className="text-caption" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Recorded Assessments
            </span>
            <div style={{ fontFamily: 'var(--font-editorial)', fontSize: '2rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '0.375rem' }}>
              {gamification?.total_checkups || history.length || 0}
            </div>
          </div>
          <div className="text-caption mt-2">
            Longitudinal consultations stored under AES-256 encryption.
          </div>
        </div>

        <div className="clinical-card workspace-stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span className="text-caption" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Physician Oversight
            </span>
            <div style={{ fontFamily: 'var(--font-editorial)', fontSize: '2rem', fontWeight: 500, color: 'var(--clinical-teal)', marginTop: '0.375rem' }}>
              {reviewedCount} / {history.length}
            </div>
          </div>
          <div className="text-caption mt-2">
            Assessments formally reviewed and verified by licensed practitioners.
          </div>
        </div>

        <div className="clinical-card workspace-stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span className="text-caption" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Baseline Profile
            </span>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.5rem', lineHeight: 1.4 }}>
              {user?.age ? `${user.age} yrs` : 'Profile active'}{user?.gender ? ` &bull; ${user.gender}` : ''}
            </div>
          </div>
          <div className="text-caption mt-2">
            {user?.chronic_conditions ? `Conditions: ${user.chronic_conditions}` : 'No chronic conditions recorded.'}
          </div>
        </div>
      </div>

      {/* Recent Clinical Assessments */}
      <div className="mb-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
          <h2 className="heading-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IconFileText size={18} color="var(--clinical-teal)" />
            Recent Clinical Records
          </h2>
          <Link href="/health-report" className="text-caption" style={{ color: 'var(--clinical-teal)', fontWeight: 600 }}>
            View Complete Health Document →
          </Link>
        </div>

        {history.length === 0 ? (
          <div className="clinical-panel-subtle workspace-empty-state text-center" style={{ padding: '3.5rem 1.5rem' }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'var(--surface-card)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              color: 'var(--clinical-teal)'
            }}>
              <IconStethoscope size={22} />
            </div>
            <h3 className="heading-sm mb-1">No recorded consultations</h3>
            <p className="text-secondary" style={{ maxWidth: '440px', margin: '0 auto 1.5rem', fontSize: '0.875rem' }}>
              You have not conducted any symptom evaluations yet. Complete a guided 3-minute assessment to record your initial clinical report.
            </p>
            <Link href="/questionnaire" className="btn btn-primary">
              Begin Initial Assessment
            </Link>
          </div>
        ) : (
          <div className="clinical-table-wrapper">
            <table className="clinical-table" role="table" aria-label="Assessment History">
              <thead>
                <tr>
                  <th scope="col">Consultation Date</th>
                  <th scope="col">Primary Clinical Presentation</th>
                  <th scope="col">Evidence Level</th>
                  <th scope="col">Clinical Review Status</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record, i) => {
                  const primaryCondition = record.conditions?.[0]
                  const confidenceVal = primaryCondition?.confidence || 0
                  const isApproved = record.status === 'approved'
                  const isPending = record.status === 'pending'

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
                        {primaryCondition?.name || 'Symptom Assessment'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            width: '48px',
                            height: '5px',
                            background: 'var(--surface-subtle)',
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.round(confidenceVal * 100)}%`,
                              background: confidenceVal >= 0.7 ? 'var(--clinical-teal)' : 'var(--triage-moderate)'
                            }}></div>
                          </div>
                          <span className="text-caption text-tabular">
                            {confidenceVal >= 0.75 ? 'Strong correlation' : confidenceVal >= 0.5 ? 'Moderate' : 'Investigational'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`triage-tier-badge ${isApproved ? 'routine' : isPending ? 'moderate' : 'urgent'}`}>
                          {isApproved ? 'Verified by Doctor' : isPending ? 'In Clinician Review' : record.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          href={`/diagnosis?id=${record.id}`}
                          className="btn btn-secondary btn-sm"
                          style={{ minHeight: '32px' }}
                        >
                          Review Summary
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Clinical Disclaimer */}
      <ClinicalDisclaimer />
    </div>
  )
}
