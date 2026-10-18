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

const CLINICAL_DATASETS = [
  {
    id: 'training',
    name: 'Disease-Symptom Classification Corpus',
    source: 'Kaggle Clinical Benchmark (Disease Prediction from Symptoms)',
    url: 'https://www.kaggle.com/datasets/itachi9604/disease-symptom-description-dataset',
    records: 4920,
    uniqueProfiles: 304,
    features: 132,
    classes: 41,
    description: '304 unique synthetic symptom combination profiles (4,920 rows with duplicates) mapping binary symptom indicators to 41 target conditions.',
    badge: 'Primary Symptom Corpus'
  },
  {
    id: 'descriptions',
    name: 'Medical Disease Pathology Descriptions',
    source: 'Public Medical Knowledge Base',
    url: 'https://www.kaggle.com/datasets/itachi9604/disease-symptom-description-dataset',
    records: 41,
    features: 2,
    description: 'Curated clinical summaries explaining disease etiology, typical manifestation, and clinical presentation.',
    badge: 'Clinical Descriptions'
  },
  {
    id: 'precautions',
    name: 'Clinical Precautions & Care Protocols',
    source: 'Healthcare Guideline Knowledge Base',
    url: 'https://www.kaggle.com/datasets/itachi9604/disease-symptom-description-dataset',
    records: 41,
    features: 4,
    description: 'Structured non-pharmacological care advice and escalation protocols for each of the 41 classified conditions.',
    badge: 'Clinical Care Protocols'
  },
  {
    id: 'severity',
    name: 'Symptom Triage Severity Scale',
    source: 'Emergency Medical Triage Weights',
    url: 'https://www.kaggle.com/datasets/itachi9604/disease-symptom-description-dataset',
    records: 132,
    features: 2,
    description: 'Clinical urgency weights scaled from 1 to 7 used for red-flag rule evaluation and triage prioritization.',
    badge: 'Urgency Matrix'
  }
]

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
            MediscanAI operates on calibrated Random Forest estimators trained on authentic open-source medical corpora. Every training record, feature count, and limitation is documented honestly.
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
              132
            </div>
            <span className="text-caption" style={{ fontSize: '0.75rem' }}>Binary clinical features</span>
          </div>

          <div className="clinical-panel-subtle" style={{ padding: '1rem' }}>
            <span className="text-caption">Target Conditions</span>
            <div className="editorial-stat-md" style={{ color: 'var(--clinical-forest)', marginTop: '0.25rem' }}>
              41
            </div>
            <span className="text-caption" style={{ fontSize: '0.75rem' }}>Primary care pathologies</span>
          </div>

          <div className="clinical-panel-subtle" style={{ padding: '1rem' }}>
            <span className="text-caption">Corpus Profiles</span>
            <div className="editorial-stat-md" style={{ color: 'var(--text-primary)', marginTop: '0.25rem' }}>
              304
            </div>
            <span className="text-caption" style={{ fontSize: '0.75rem' }}>Unique clinical templates</span>
          </div>

          <div className="clinical-panel-subtle" style={{ padding: '1rem' }}>
            <span className="text-caption">Calibration Method</span>
            <div style={{ fontWeight: 600, fontSize: '1.125rem', color: 'var(--text-primary)', marginTop: '0.5rem' }}>
              Isotonic
            </div>
            <span className="text-caption" style={{ fontSize: '0.75rem' }}>CalibratedClassifierCV</span>
          </div>
        </div>
      </div>

      {/* Service Connection Status */}
      <div className="clinical-card mb-4" style={{ padding: '1.25rem 1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              AI Model Engine Status: {serviceStatus === 'connected' ? 'Online' : loading ? 'Checking...' : 'Unavailable'}
            </div>
            <div className="text-caption">
              {serviceStatus === 'connected'
                ? `Model version ${liveInfo?.metrics?.calibration || 'calibrated'} loaded successfully.`
                : 'Showing verified repository documentation.'}
            </div>
          </div>
          <span className={`triage-tier-badge ${serviceStatus === 'connected' ? 'routine' : 'moderate'}`}>
            {serviceStatus === 'connected' ? 'Verified Connected' : 'Offline / Standalone'}
          </span>
        </div>
      </div>

      {/* Dataset Inventory Cards */}
      <div className="grid-2 mb-6" style={{ gap: '1.25rem' }}>
        {CLINICAL_DATASETS.map((ds) => (
          <div key={ds.id} className="clinical-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span className="triage-tier-badge routine">{ds.badge}</span>
                <span className="text-caption text-tabular">{ds.records} rows</span>
              </div>
              <h3 className="heading-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                {ds.name}
              </h3>
              <p className="text-secondary mb-3" style={{ fontSize: '0.8125rem', lineHeight: 1.55 }}>
                {ds.description}
              </p>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
              <div className="text-caption" style={{ fontSize: '0.75rem' }}>
                <strong>Source:</strong> {ds.source}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Clinical Disclaimer */}
      <ClinicalDisclaimer />
    </div>
  )
}
