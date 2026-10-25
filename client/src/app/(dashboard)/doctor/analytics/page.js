'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { formatDate } from '@/lib/format'
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

  const loadAnalytics = useCallback(async () => {
    try {
      const res = await authFetch('/doctors/analytics')
      const data = await res.json()
      setAnalytics(data.analytics)
    } catch (err) {
      console.error('Failed to load clinical analytics:', err)
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => {
    if (authLoading) return
    Promise.resolve().then(loadAnalytics)
  }, [authLoading, loadAnalytics])

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
  const accuracyTrends = analytics?.agreementTrends || []
  const dailySubmissions = analytics?.dailySubmissions || []
  const feedbackBreakdown = analytics?.feedbackBreakdown || []

  const maxConditionCount = Math.max(...conditionDist.map(c => parseInt(c.count, 10) || 0), 1)
  const maxDailyCount = Math.max(...dailySubmissions.map(d => parseInt(d.count, 10) || 0), 1)
  const totalFeedback = feedbackBreakdown.reduce((sum, f) => sum + (parseInt(f.count, 10) || 0), 0)
  const changedReviews = feedbackBreakdown
    .filter(item => ['correct', 'override'].includes(item.action))
    .reduce((sum, item) => sum + (parseInt(item.count, 10) || 0), 0)
  const changeShare = totalFeedback ? Math.round((changedReviews / totalFeedback) * 100) : 0

  return (
    <div className="animate-calm-fade">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div className="eyebrow-clinical mb-1">Recorded Service Activity</div>
        <h1 className="editorial-heading-lg" style={{ fontSize: '1.875rem' }}>
          Review activity
        </h1>
        <p className="text-secondary mt-1" style={{ fontSize: '0.9375rem' }}>
          Counts from assessments and clinician feedback recorded in this system.
        </p>
      </div>

      <section className="clinical-panel-subtle mb-4" aria-labelledby="change-share-heading">
        <h2 id="change-share-heading" className="heading-sm">How often do doctors change a model estimate?</h2>
        <p className="editorial-heading-lg" style={{ fontSize: '2rem', marginTop: '0.35rem' }}>
          {changedReviews} of {totalFeedback} reviews ({changeShare}%)
        </p>
        <p className="text-caption mt-1">Prototype review counts only. This is not a model accuracy or performance measure.</p>
      </section>

      {/* Feedback Distribution Summary */}
      <div className="grid-3 mb-6">
        {feedbackBreakdown.map((fb, i) => {
          const count = parseInt(fb.count, 10) || 0
          const pct = totalFeedback > 0 ? Math.round((count / totalFeedback) * 100) : 0
          const isApprove = fb.action === 'approve'

          return (
            <div key={i} className="clinical-card">
              <div className="text-caption" style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                {isApprove ? 'Clinician Approvals' : fb.action === 'correct' ? 'Clinician Corrections' : 'Overrides'}
              </div>
              <div style={{ fontFamily: 'var(--font-editorial)', fontSize: '2rem', fontWeight: 500, color: isApprove ? 'var(--clinical-teal)' : 'var(--text-primary)', marginTop: '0.25rem' }}>
                {count}
              </div>
              <div className="text-caption mt-1">
                {pct}% of recorded review actions
              </div>
            </div>
          )
        })}

        {feedbackBreakdown.length === 0 && (
          <div className="clinical-card">
            <div className="text-caption" style={{ fontWeight: 600 }}>Clinician Feedback</div>
            <div style={{ fontFamily: 'var(--font-editorial)', fontSize: '2rem', fontWeight: 500, color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              0
            </div>
            <div className="text-caption mt-1">
              No clinician feedback has been recorded yet.
            </div>
          </div>
        )}
      </div>

      {/* Top Clinical Conditions Distribution */}
      <div className="clinical-card mb-6" style={{ padding: '1.75rem' }}>
        <h2 className="heading-sm mb-1">
          Most common model estimates
        </h2>
        <p className="text-caption mb-4">
          Counts of condition names recorded in submitted assessments; not a measure of model quality.
        </p>
        <p className="sr-only">This chart lists the most frequent model estimate labels recorded by this prototype.</p>

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
          Daily assessments (past 30 days)
        </h2>
        <p className="text-caption mb-4">
          Number of assessments saved on each day.
        </p>
        <p className="sr-only">This chart shows assessment counts by day for the past 30 days.</p>

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

      {/* Review Outcomes Over Time */}
      {accuracyTrends.length > 0 && (
        <div className="clinical-card mb-6" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <h2 className="heading-sm">
              Review Outcomes by Month
            </h2>
            <p className="text-caption mt-0.5">
              Monthly review counts recorded by this prototype; these do not measure clinical accuracy.
            </p>
          </div>

          <table className="clinical-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Approved</th>
                <th>Changed</th>
                <th>Total reviews</th>
                <th>Approved share</th>
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
                      {formatDate(trend.month, { month: 'short', year: 'numeric' })}
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
