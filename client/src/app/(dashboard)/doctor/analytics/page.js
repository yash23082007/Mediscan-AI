/* eslint-disable */
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import {
  IconActivity,
  IconStethoscope,
  IconCheckCircle,
  IconFileText
} from '@/components/Icons'
import ClinicalDisclaimer from '@/components/ClinicalDisclaimer'

export default function AnalyticsPage() {
  const { authFetch, loading: authLoading } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    loadAnalytics()
  }, [authLoading, authFetch])

  const loadAnalytics = async () => {
    try {
      const res = await authFetch('/doctors/analytics')
      const data = await res.json()
      setAnalytics(data.analytics)
    } catch (err) {
      console.error('Failed to load clinical analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center" style={{ minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner spinner-lg mb-2" style={{ margin: '0 auto' }}></div>
          <p className="text-caption">Aggregating epidemiological and triage telemetry...</p>
        </div>
      </div>
    )
  }

  const conditionDist = analytics?.conditionDistribution || []
  const accuracyTrends = analytics?.accuracyTrends || []
  const dailySubmissions = analytics?.dailySubmissions || []
  const feedbackBreakdown = analytics?.feedbackBreakdown || []

  const maxConditionCount = Math.max(...conditionDist.map(c => parseInt(c.count, 10) || 0), 1)
  const maxDailyCount = Math.max(...dailySubmissions.map(d => parseInt(d.count, 10) || 0), 1)
  const totalFeedback = feedbackBreakdown.reduce((sum, f) => sum + (parseInt(f.count, 10) || 0), 0)

  return (
    <div className="animate-calm-fade">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div className="eyebrow-clinical mb-1">Clinical Epidemiology &amp; Accuracy</div>
        <h1 className="editorial-heading-lg" style={{ fontSize: '1.875rem' }}>
          Clinical Intelligence &amp; Model Agreement
        </h1>
        <p className="text-secondary mt-1" style={{ fontSize: '0.9375rem' }}>
          Epidemiological distribution of evaluated conditions, physician agreement rates, and intake volume.
        </p>
      </div>

      {/* Feedback Distribution Summary */}
      <div className="grid-3 mb-6">
        {feedbackBreakdown.map((fb, i) => {
          const count = parseInt(fb.count, 10) || 0
          const pct = totalFeedback > 0 ? Math.round((count / totalFeedback) * 100) : 0
          const isApprove = fb.action === 'approve'

          return (
            <div key={i} className="clinical-card">
              <div className="text-caption" style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                {isApprove ? 'Physician Approvals' : fb.action === 'correct' ? 'Clinical Corrections' : 'Overrides'}
              </div>
              <div style={{ fontFamily: 'var(--font-editorial)', fontSize: '2rem', fontWeight: 500, color: isApprove ? 'var(--clinical-teal)' : 'var(--text-primary)', marginTop: '0.25rem' }}>
                {count}
              </div>
              <div className="text-caption mt-1">
                {pct}% of verified clinical evaluations
              </div>
            </div>
          )
        })}

        {feedbackBreakdown.length === 0 && (
          <div className="clinical-card">
            <div className="text-caption" style={{ fontWeight: 600 }}>Physician Feedback Log</div>
            <div style={{ fontFamily: 'var(--font-editorial)', fontSize: '2rem', fontWeight: 500, color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              0
            </div>
            <div className="text-caption mt-1">
              Awaiting initial physician evaluations in queue.
            </div>
          </div>
        )}
      </div>

      {/* Top Clinical Conditions Distribution */}
      <div className="clinical-card mb-6" style={{ padding: '1.75rem' }}>
        <h2 className="heading-sm mb-1">
          Top Pathological Conditions Evaluated
        </h2>
        <p className="text-caption mb-4">
          Frequency of synthesized primary conditions across patient symptom intake consultations.
        </p>

        {conditionDist.length === 0 ? (
          <p className="text-secondary" style={{ fontSize: '0.875rem' }}>No clinical condition records available.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {conditionDist.slice(0, 10).map((condition, i) => {
              const count = parseInt(condition.count, 10) || 0
              const barWidth = Math.max(4, Math.round((count / maxConditionCount) * 100))

              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ width: '220px', flexShrink: 0, fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {condition.condition_name}
                  </span>
                  <div style={{ flex: 1, height: '20px', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-xs)', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${barWidth}%`,
                        background: 'var(--clinical-teal)',
                        borderRadius: 'var(--radius-xs)',
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: '0.5rem',
                        transition: 'width 0.6s var(--ease-calm)'
                      }}
                    >
                      <span className="text-tabular" style={{ color: '#ffffff', fontSize: '0.6875rem', fontWeight: 700 }}>
                        {count}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Daily Consultation Intake Volume */}
      <div className="clinical-card mb-6" style={{ padding: '1.75rem' }}>
        <h2 className="heading-sm mb-1">
          Daily Assessment Volume (Past 30 Days)
        </h2>
        <p className="text-caption mb-4">
          Temporal distribution of patient symptom consultations.
        </p>

        {dailySubmissions.length === 0 ? (
          <p className="text-secondary" style={{ fontSize: '0.875rem' }}>No recent intake activity.</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '140px', padding: '0 0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
            {dailySubmissions.map((day, i) => {
              const c = parseInt(day.count, 10) || 0
              const barH = Math.max(4, Math.round((c / maxDailyCount) * 120))

              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }} title={`${day.date}: ${c} assessments`}>
                  <div
                    style={{
                      width: '100%',
                      height: `${barH}px`,
                      background: 'var(--clinical-teal-border)',
                      borderRadius: '2px 2px 0 0',
                      transition: 'height 0.4s var(--ease-calm)',
                      minWidth: '4px'
                    }}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Longitudinal Accuracy & Agreement Trends */}
      {accuracyTrends.length > 0 && (
        <div className="clinical-card mb-6" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <h2 className="heading-sm">
              Longitudinal Physician Agreement Rate
            </h2>
            <p className="text-caption mt-0.5">
              Monthly calibration measuring doctor approvals versus diagnostic overrides.
            </p>
          </div>

          <table className="clinical-table">
            <thead>
              <tr>
                <th>Evaluation Month</th>
                <th>Approved Diagnoses</th>
                <th>Physician Corrections</th>
                <th>Total Reviewed</th>
                <th>Clinical Agreement Rate</th>
              </tr>
            </thead>
            <tbody>
              {accuracyTrends.map((trend, i) => {
                const total = parseInt(trend.total, 10) || 0
                const approved = parseInt(trend.approved, 10) || 0
                const corrected = parseInt(trend.corrected, 10) || 0
                const rate = total > 0 ? Math.round((approved / total) * 100) : 0

                return (
                  <tr key={i}>
                    <td className="text-tabular" style={{ fontWeight: 500 }}>
                      {new Date(trend.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </td>
                    <td className="text-tabular" style={{ color: 'var(--triage-routine)', fontWeight: 600 }}>
                      {approved}
                    </td>
                    <td className="text-tabular" style={{ color: 'var(--triage-urgent)', fontWeight: 600 }}>
                      {corrected}
                    </td>
                    <td className="text-tabular">
                      {total}
                    </td>
                    <td>
                      <span className="triage-tier-badge routine text-tabular">
                        {rate}% Agreement
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ClinicalDisclaimer compact />
    </div>
  )
}
