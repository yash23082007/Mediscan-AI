'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { formatRelativeTime } from '@/lib/format'
import {
  IconStethoscope,
  IconCheckCircle,
  IconAlertTriangle,
  IconFileText,
  IconUser
} from '@/components/Icons'
import ClinicalDisclaimer from '@/components/ClinicalDisclaimer'

function SubmissionsContent() {
  const searchParams = useSearchParams()
  const statusFilter = searchParams.get('status') || ''
  const { authFetch, loading: authLoading } = useAuth()
  const [submissions, setSubmissions] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(statusFilter)

  const loadSubmissions = useCallback(async () => {
    setLoading(true)
    try {
      const url = filter ? `/doctors/submissions?status=${filter}` : '/doctors/submissions'
      const res = await authFetch(url)
      const data = await res.json()
      setSubmissions(data.submissions || [])
      setPagination(data.pagination || null)
    } catch (err) {
      console.error('Failed to load patient submissions:', err)
    } finally {
      setLoading(false)
    }
  }, [authFetch, filter])

  useEffect(() => {
    if (authLoading) return
    Promise.resolve().then(loadSubmissions)
  }, [authLoading, loadSubmissions])

  const filterOptions = [
    { key: '', label: 'All' },
    { key: 'pending', label: 'Waiting' },
    { key: 'reviewed', label: 'Reviewed' },
  ]

  return (
    <div className="animate-calm-fade">
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div className="eyebrow-clinical mb-1">Clinical Triage Registry</div>
        <h1 className="editorial-heading-lg" style={{ fontSize: '1.875rem' }}>
          Patient Assessment Queue
        </h1>
        <p className="text-secondary mt-1" style={{ fontSize: '0.9375rem' }}>
          Review model estimates and patient history, then record your case review.
        </p>
      </div>

      {/* Triage Filter Pills */}
      <div className="review-filter-group" role="group" aria-label="Filter cases by review status" style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {filterOptions.map((opt) => (
          <button
            key={opt.key}
            className={`btn btn-sm ${filter === opt.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(opt.key)}
            aria-pressed={filter === opt.key}
            style={{ minHeight: '34px', fontSize: '0.8125rem' }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center" style={{ minHeight: '40vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="spinner spinner-lg mb-2" style={{ margin: '0 auto' }}></div>
            <p className="text-caption">Filtering clinical records...</p>
          </div>
        </div>
      ) : submissions.length === 0 ? (
        <div className="clinical-panel-subtle text-center" style={{ padding: '3.5rem 1.5rem' }}>
          <p className="text-secondary" style={{ fontSize: '0.9375rem' }}>
            No patient assessments matching the selected triage filter.
          </p>
        </div>
      ) : (
        <div className="clinical-table-wrapper mb-4">
          <table className="clinical-table" role="table">
            <thead>
              <tr>
                <th scope="col">Patient</th>
                <th scope="col">Top estimate</th>
                <th scope="col">Score</th>
                <th scope="col">Priority</th>
                <th scope="col">Review</th>
                <th scope="col">Submitted</th>
                <th scope="col" style={{ textAlign: 'right' }}>Open</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub, i) => {
                const conf = sub.conditions?.[0]?.confidence ?? sub.confidence_scores?.[0]?.confidence ?? null
                const isPending = sub.status === 'pending'
                const isReviewed = ['approved', 'corrected', 'overridden'].includes(sub.status)
                const urgency = sub.triage_level || 'routine'

                return (
                  <tr key={sub.id || i}>
                    <td>
                      <strong style={{ color: 'var(--text-primary)' }}>{sub.patient_name}</strong>
                      <div className="text-caption text-tabular">
                        {sub.patient_age ? `${sub.patient_age} yrs` : '—'} · {sub.patient_gender || '—'}
                        {sub.patient_weight && ` · ${sub.patient_weight} kg`}
                      </div>
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {sub.conditions?.[0]?.name || 'Assessment'}
                    </td>
                    <td>
                      <span className="text-caption text-tabular" style={{ fontWeight: 600, color: conf >= 0.7 ? 'var(--clinical-teal)' : 'var(--triage-moderate)' }}>
                        {typeof conf === 'number' ? `${Math.round(conf * 100)}% model estimate` : 'No estimate'}
                      </span>
                    </td>
                    <td>
                      <span className={`triage-tier-badge ${urgency === 'emergency' || urgency === 'urgent' ? 'urgent' : urgency === 'routine' ? 'routine' : 'moderate'}`}>
                        {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
                      </span>
                    </td>
                    <td>
                      <span className={`triage-tier-badge ${isReviewed ? 'routine' : 'moderate'}`}>
                        {isReviewed ? 'Reviewed' : isPending ? 'Waiting' : sub.status}
                      </span>
                    </td>
                    <td className="text-caption text-tabular">
                      {formatRelativeTime(sub.created_at)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        href={`/doctor/review/${sub.id}`}
                        className="btn btn-primary btn-sm"
                        style={{ minHeight: '32px' }}
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {pagination && (
        <div style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-caption)', fontSize: '0.8125rem' }}>
          Showing {submissions.length} of {pagination.total} registered submissions
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <ClinicalDisclaimer compact />
      </div>
    </div>
  )
}

export default function SubmissionsPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center" style={{ minHeight: '50vh' }}>
        <div className="spinner spinner-lg"></div>
      </div>
    }>
      <SubmissionsContent />
    </Suspense>
  )
}
