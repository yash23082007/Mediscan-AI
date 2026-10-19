'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import {
  IconFileText,
  IconShield,
  IconCheckCircle
} from '@/components/Icons'
import ClinicalDisclaimer from '@/components/ClinicalDisclaimer'

export default function DatasetsPage() {
  const { authFetch } = useAuth()
  const [liveInfo, setLiveInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [serviceStatus, setServiceStatus] = useState('checking')

  useEffect(() => {
    async function fetchDatasetMetadata() {
      try {
        const res = await authFetch('/api/diagnoses/datasets/info')
        if (res.ok) {
          const data = await res.json()
          setLiveInfo(data)
          setServiceStatus('connected')
        } else {
          setServiceStatus('unavailable')
        }
      } catch (err) {
        console.warn('Dataset metadata fetch error:', err)
        setServiceStatus('unavailable')
      } finally {
        setLoading(false)
      }
    }

    fetchDatasetMetadata()
  }, [authFetch])

  return (
    <div className="animate-calm-fade" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Page Header */}
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
          <div className="eyebrow-clinical mb-1">Model Transparency & Data Provenance</div>
          <h1 className="editorial-heading-lg" style={{ fontSize: '2rem' }}>
            Clinical Datasets & Training Transparency
          </h1>
          <p className="text-secondary mt-1" style={{ maxWidth: '680px' }}>
            Model and dataset details are loaded from the running analysis service. The available training profiles are synthetic symptom combinations, not patient records.
          </p>
        </div>

        <Link href="/questionnaire" className="btn btn-primary btn-sm">
          Start Assessment
        </Link>
      </div>

      {/* Model & Dataset Architecture Metrics */}
      <div className="clinical-card mb-4" style={{ padding: '1.75rem' }}>
        <h2 className="heading-sm mb-3" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <IconShield size={18} color="var(--clinical-teal)" />
          Model Metrics & Training Parameters
        </h2>

        <div className="grid-4" style={{ gap: '1rem' }}>
          <div className="clinical-panel-subtle" style={{ padding: '1rem' }}>
            <span className="text-caption">Symptoms Monitored</span>
            <div className="editorial-stat-md" style={{ color: 'var(--clinical-teal)', marginTop: '0.25rem' }}>
              {liveInfo?.symptoms_count ?? '—'}
            </div>
            <span className="text-caption" style={{ fontSize: '0.75rem' }}>Binary clinical features</span>
          </div>

          <div className="clinical-panel-subtle" style={{ padding: '1rem' }}>
            <span className="text-caption">Target Conditions</span>
            <div className="editorial-stat-md" style={{ color: 'var(--clinical-forest)', marginTop: '0.25rem' }}>
              {liveInfo?.conditions_count ?? '—'}
            </div>
            <span className="text-caption" style={{ fontSize: '0.75rem' }}>Primary care pathologies</span>
          </div>

          <div className="clinical-panel-subtle" style={{ padding: '1rem' }}>
            <span className="text-caption">Corpus Profiles</span>
            <div className="editorial-stat-md" style={{ color: 'var(--text-primary)', marginTop: '0.25rem' }}>
              {liveInfo?.datasets?.[0]?.unique_profiles ?? '—'}
            </div>
            <span className="text-caption" style={{ fontSize: '0.75rem' }}>Unique clinical templates</span>
          </div>

          <div className="clinical-panel-subtle" style={{ padding: '1rem' }}>
            <span className="text-caption">Calibration Method</span>
            <div style={{ fontWeight: 600, fontSize: '1.125rem', color: 'var(--text-primary)', marginTop: '0.5rem' }}>
              {liveInfo?.metrics?.calibration || '—'}
            </div>
            <span className="text-caption" style={{ fontSize: '0.75rem' }}>CalibratedClassifierCV</span>
          </div>
        </div>
      </div>

      {liveInfo?.evaluation && (
        <div className="clinical-panel-subtle mb-4" role="status" style={{ padding: '1.25rem 1.5rem' }}>
          <strong>Evaluation limitation:</strong> the {liveInfo.evaluation.test_rows} test profiles include {liveInfo.evaluation.exact_training_overlaps} exact profiles also present in training data.
          {liveInfo.evaluation.performance_metrics_published
            ? ' Reported performance metrics should be interpreted with this overlap in mind.'
            : ' The test set is not independent, so this service does not publish performance metrics.'}
        </div>
      )}

      {/* Service Connection Status */}
      <div className="clinical-card mb-4" style={{ padding: '1.25rem 1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              AI Model Engine Status: {serviceStatus === 'connected' ? 'Online' : loading ? 'Checking...' : 'Unavailable'}
            </div>
            <div className="text-caption">
              {serviceStatus === 'connected'
                ? 'Model metadata loaded from the analysis service.'
                : 'Live model metadata is unavailable.'}
            </div>
          </div>
          <span className={`triage-tier-badge ${serviceStatus === 'connected' ? 'routine' : 'moderate'}`}>
            {serviceStatus === 'connected' ? 'Connected' : 'Metadata unavailable'}
          </span>
        </div>
      </div>

      {/* Dataset Inventory Cards */}
      <div className="grid-2 mb-6" style={{ gap: '1.25rem' }}>
        {(liveInfo?.datasets || []).map((ds) => (
          <div key={ds.id} className="clinical-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span className="triage-tier-badge routine">Training dataset</span>
                <span className="text-caption text-tabular">{ds.records} rows</span>
              </div>
              <h3 className="heading-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                {ds.name}
              </h3>
              <p className="text-secondary mb-3" style={{ fontSize: '0.8125rem', lineHeight: 1.55 }}>
                {ds.type}. {ds.unique_profiles} unique profiles, {ds.features} features and {ds.target_classes} classes, as reported by the model service.
              </p>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
              <div className="text-caption" style={{ fontSize: '0.75rem' }}>
                <strong>Source:</strong> <a href={ds.url} target="_blank" rel="noreferrer">{ds.source}</a>
              </div>
            </div>
          </div>
        ))}
        {serviceStatus === 'unavailable' && (
          <div className="clinical-panel-subtle">Dataset details are unavailable while the analysis service is offline.</div>
        )}
      </div>

      {/* Clinical Disclaimer */}
      <ClinicalDisclaimer />
    </div>
  )
}
