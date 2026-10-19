'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
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
    { key: '', label: 'All Submissions' },
    { key: 'pending', label: 'Review Required' },
    { key: 'approved', label: 'Doctor Verified' },
    { key: 'corrected', label: 'Clinically Corrected' },
    { key: 'overridden', label: 'Overridden' },
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
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {filterOptions.map((opt) => (
          <button
            key={opt.key}
            className={`btn btn-sm ${filter === opt.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(opt.key)}
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
                <th scope="col">Patient Identification</th>
                <th scope="col">Demographic Profile</th>
                <th scope="col">Primary Differential</th>
                <th scope="col">Evidence Level</th>
                <th scope="col">Triage Status</th>
                <th scope="col">Intake Date</th>
                <th scope="col" style={{ textAlign: 'right' }}>Review Action</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub, i) => {
                const conf = sub.conditions?.[0]?.confidence ?? sub.confidence_scores?.[0]?.confidence ?? null
                const isPending = sub.status === 'pending'
                const isApproved = sub.status === 'approved'

                return (
                  <tr key={sub.id || i}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {sub.patient_name}
                    </td>
                    <td className="text-caption text-tabular">
                      {sub.patient_age ? `${sub.patient_age} yrs` : '—'} • {sub.patient_gender || '—'}
                      {sub.patient_weight && ` • ${sub.patient_weight} kg`}
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
                        Clinical Review
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
