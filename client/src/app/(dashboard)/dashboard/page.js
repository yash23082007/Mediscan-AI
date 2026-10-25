'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { formatDate } from '@/lib/format'
import {
  IconStethoscope,
  IconFileText,
  IconAlertTriangle,
  IconArrowRight,
  IconActivity
} from '@/components/Icons'
import ClinicalDisclaimer from '@/components/ClinicalDisclaimer'
import EmergencyNotice from '@/components/EmergencyNotice'

function formatCategory(value) {
  if (!value) return 'Not provided'
  return value.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())
}

function formatRecordDate(value) {
  return formatDate(value)
}

export default function PatientDashboard() {
  const { user, authFetch, loading: authLoading } = useAuth()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const patientId = user?.id

  const loadData = useCallback(async () => {
    setLoadError('')
    try {
      const response = await authFetch('/patients/' + patientId + '/history?limit=5')
      if (!response.ok) throw new Error('History request failed')
      const data = await response.json()
      if (!Array.isArray(data.history)) throw new Error('History response was incomplete')
      setHistory(data.history)
    } catch {
      setLoadError('Your recent assessments could not be loaded. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [authFetch, patientId])

  useEffect(() => {
    if (authLoading || !patientId) return
    Promise.resolve().then(loadData)
  }, [authLoading, loadData, patientId])

  const retryLoadData = () => {
    setLoading(true)
    loadData()
  }

  const firstName = user?.name?.trim().split(/\s+/)[0]
  const reviewedCount = history.filter(record =>
    ['approved', 'corrected', 'overridden'].includes(record.status)
  ).length

  return (
    <div className="patient-workspace animate-calm-fade">
      <header className="workspace-hero">
        <div className="workspace-heading">
          <p className="eyebrow-clinical">Your health workspace</p>
          <h1>{firstName ? 'Welcome back, ' + firstName + '.' : 'Your health records'}</h1>
          <p>Start a new symptom assessment or return to a summary you have already saved.</p>
        </div>
        <Link href="/questionnaire" className="btn btn-primary btn-lg workspace-primary-action" id="start-checkup">
          <IconStethoscope size={18} aria-hidden="true" />
          <span>Start an assessment</span>
          <IconArrowRight size={17} aria-hidden="true" />
        </Link>
      </header>

      <EmergencyNotice className="workspace-emergency" />

      <div className="patient-workspace-grid">
        <section className="workspace-main" aria-labelledby="history-heading">
          <div className="workspace-section-heading">
            <div>
              <p className="eyebrow-clinical">Recent activity</p>
              <h2 id="history-heading">Assessment history</h2>
            </div>
            <Link href="/health-report" className="workspace-text-link">
              Health records <IconArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>

          {loading ? (
            <div className="workspace-state" role="status" aria-live="polite">
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-copy" />
              <span className="sr-only">Loading your recent assessments…</span>
            </div>
          ) : loadError ? (
            <div className="workspace-state workspace-error" role="alert">
              <IconAlertTriangle size={21} aria-hidden="true" />
              <div>
                <h3>Records are temporarily unavailable</h3>
                <p>{loadError}</p>
                <button type="button" className="btn btn-secondary btn-sm" onClick={retryLoadData}>
                  Try again
                </button>
              </div>
            </div>
          ) : history.length === 0 ? (
            <div className="workspace-state workspace-empty">
              <div className="workspace-empty-mark" aria-hidden="true">
                <IconFileText size={22} />
              </div>
              <div>
                <p className="eyebrow-clinical">A clear place to start</p>
                <h3>Your first assessment will appear here.</h3>
                <p>Answer a guided set of symptom questions. You can review your responses and any returned model estimate in a saved summary.</p>
                <Link href="/questionnaire" className="btn btn-primary">
                  Begin your first assessment <IconArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="workspace-history-summary" role="status">
                <span><strong>{history.length}</strong> recent {history.length === 1 ? 'record' : 'records'}</span>
                <span><strong>{reviewedCount}</strong> reviewed by a clinician</span>
              </div>
              <div className="workspace-record-list">
                {history.map((record, index) => {
                  const estimate = record.conditions?.[0]
                  const confidence = typeof estimate?.confidence === 'number' && Number.isFinite(estimate.confidence)
                    ? Math.max(0, Math.min(1, estimate.confidence))
                    : null
                  const reviewed = ['approved', 'corrected', 'overridden'].includes(record.status)
                  const pending = ['pending', 'in_review'].includes(record.status)
                  const statusLabel = reviewed ? 'Clinician reviewed' : pending ? 'Awaiting review' : formatCategory(record.status)

                  return (
                    <article className="workspace-record" key={record.id || index}>
                      <div className="workspace-record-topline">
                        <time className="workspace-record-date" dateTime={record.created_at || undefined}>
                          {formatRecordDate(record.created_at)}
                        </time>
                        <span className={'triage-tier-badge ' + (reviewed ? 'routine' : pending ? 'moderate' : 'neutral')}>
                          {statusLabel}
                        </span>
                      </div>
                      <div className="workspace-record-body">
                        <div>
                          <h3>{estimate?.name || 'Symptom assessment'}</h3>
                          <p>{estimate ? 'Experimental model estimate' : 'No model estimate was returned for this record.'}</p>
                        </div>
                        {confidence !== null && (
                          <div className="workspace-record-confidence" aria-label={Math.round(confidence * 100) + ' percent experimental model estimate'}>
                            <span>{Math.round(confidence * 100)}%</span>
                            <span>model estimate</span>
                          </div>
                        )}
                      </div>
                      {confidence !== null && (
                        <div className="workspace-confidence-track" aria-hidden="true">
                          <span style={{ width: Math.round(confidence * 100) + '%' }} />
                        </div>
                      )}
                      <div className="workspace-record-footer">
                        <span><IconActivity size={15} aria-hidden="true" /> Summary includes recorded answers and safety flags</span>
                        <Link href={'/diagnosis?id=' + encodeURIComponent(record.id)}>
                          Open summary <IconArrowRight size={15} aria-hidden="true" />
                        </Link>
                      </div>
                    </article>
                  )
                })}
              </div>
            </>
          )}
        </section>

        <aside className="workspace-rail" aria-label="Profile and assessment guidance">
          <section className="workspace-rail-card workspace-profile-card">
            <p className="eyebrow-clinical">Profile on file</p>
            <h2>Your baseline</h2>
            <dl>
              <div><dt>Age</dt><dd>{user?.age ? user.age + ' years' : 'Not provided'}</dd></div>
              <div><dt>Sex / gender</dt><dd>{formatCategory(user?.gender)}</dd></div>
            </dl>
            <p className="workspace-rail-note">Review these details with a healthcare professional if they are out of date.</p>
          </section>

          <section className="workspace-rail-card workspace-guide-card">
            <p className="eyebrow-clinical">Before you begin</p>
            <h2>What to expect</h2>
            <ol>
              <li><span>01</span><div><strong>Describe what changed</strong><p>Choose the answers that best match what you are experiencing.</p></div></li>
              <li><span>02</span><div><strong>Follow the questions</strong><p>Later questions depend on the answers you select.</p></div></li>
              <li><span>03</span><div><strong>Review your summary</strong><p>Your responses and safety guidance stay visible in the record.</p></div></li>
            </ol>
            <Link href="/datasets" className="workspace-text-link">
              Read about the model and its limits <IconArrowRight size={15} aria-hidden="true" />
            </Link>
          </section>
        </aside>
      </div>

      <ClinicalDisclaimer />
    </div>
  )
}
