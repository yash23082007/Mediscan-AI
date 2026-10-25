'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import {
  IconCaduceus,
  IconFileText,
  IconShield
} from '@/components/Icons'
import ClinicalDisclaimer from '@/components/ClinicalDisclaimer'

const researchReferences = [
  {
    number: '01',
    title: 'Random Forests',
    citation: 'Breiman, 2001 · Machine Learning 45(1), 5–32',
    relevance: 'The prototype uses a calibrated Random Forest classifier. The paper describes the ensemble method; it does not validate this medical use or this model.',
    href: 'https://doi.org/10.1023/A:1010933404324'
  },
  {
    number: '02',
    title: 'A Unified Approach to Interpreting Model Predictions',
    citation: 'Lundberg & Lee, 2017 · NeurIPS 30, 4765–4774',
    relevance: 'SHAP is a research method for feature attribution. This app does not currently compute SHAP values or provide patient-specific feature explanations.',
    href: 'https://proceedings.neurips.cc/paper/2017/hash/8a20a8621978632d76c43dfd28b67767-Abstract.html'
  },
  {
    number: '03',
    title: 'Ethics and Governance of Artificial Intelligence for Health',
    citation: 'World Health Organization, 2021',
    relevance: 'The guidance emphasizes human autonomy, safety, transparency, accountability, equity, and sustainability. A clinician must remain responsible for care decisions.',
    href: 'https://www.who.int/publications/i/item/9789240029200'
  },
  {
    number: '04',
    title: 'Disease Symptom Description Dataset',
    citation: 'Kaggle · itachi9604',
    relevance: 'The repository supplies symptom-pattern profiles. Its record count must not be described as 4,920 verified patient records; the app treats these as synthetic profiles and reports overlap between the supplied train/test files.',
    href: 'https://www.kaggle.com/datasets/itachi9604/disease-symptom-description-dataset'
  },
  {
    number: '05',
    title: 'Advanced Encryption Standard (FIPS 197-upd1)',
    citation: 'National Institute of Standards and Technology, 2023 update',
    relevance: 'The update clarifies the AES standard without changing its algorithm. Using AES alone does not establish that an application or deployment is secure or compliant.',
    href: 'https://doi.org/10.6028/NIST.FIPS.197-upd1'
  },
  {
    number: '06',
    title: 'HIPAA Security Rule',
    citation: 'U.S. Department of Health and Human Services · 45 CFR Part 160 and Subparts A and C of Part 164',
    relevance: 'HIPAA obligations depend on whether an organization is a covered entity or business associate and require administrative, physical, and technical safeguards. This prototype does not claim HIPAA compliance.',
    href: 'https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html'
  },
  {
    number: '07',
    title: 'AI in Health and Medicine',
    citation: 'Rajpurkar, Chen, Banerjee & Topol, 2022 · Nature Medicine 28, 31–38',
    relevance: 'A review of medical AI research and deployment challenges; it is background literature, not validation evidence for this symptom classifier.',
    href: 'https://www.nature.com/articles/s41591-021-01614-0'
  },
  {
    number: '08',
    title: 'Clinical Decision Support in the Era of Artificial Intelligence',
    citation: 'Shortliffe & Sepúlveda, 2018 · JAMA 320(21), 2199–2200',
    relevance: 'Clinical decision support belongs in an interactive workflow with healthcare professionals, rather than replacing their judgment.',
    href: 'https://doi.org/10.1001/jama.2018.17163'
  },
  {
    number: '09',
    title: 'WHO guidance on large multimodal models for health',
    citation: 'World Health Organization, 2024',
    relevance: 'Newer WHO guidance examines large multimodal models; this app uses a classical Random Forest, so the document is governance context rather than a direct technical description of this model.',
    href: 'https://www.who.int/publications/b/70584'
  },
  {
    number: '10',
    title: 'Marketing recommendations for AI device change plans',
    citation: 'U.S. Food and Drug Administration, final guidance, August 2025',
    relevance: 'The guidance discusses evidence, risk, transparency, and lifecycle change controls for relevant regulated AI-enabled devices. It is not an approval or compliance claim for this research prototype.',
    href: 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents/marketing-submission-recommendations-predetermined-change-control-plan-artificial-intelligence'
  },
  {
    number: '11',
    title: 'AI Risk Management Framework',
    citation: 'National Institute of Standards and Technology, AI RMF 1.0 and current resources',
    relevance: 'A voluntary framework for documenting context, measuring risk, assigning oversight, and monitoring deployed systems over time.',
    href: 'https://airc.nist.gov/airmf-resources/airmf/'
  }
]

function DatasetsContent() {
  const { authFetch } = useAuth()
  const [liveInfo, setLiveInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [metadataStatus, setMetadataStatus] = useState('checking')
  const [modelStatus, setModelStatus] = useState('checking')
  const [databaseStatus, setDatabaseStatus] = useState('checking')
  const [lastStatusCheck, setLastStatusCheck] = useState(null)
  const [refreshRequest, setRefreshRequest] = useState(0)

  useEffect(() => {
    let active = true
    let statusRequestInFlight = false

    async function fetchDatasetMetadata() {
      try {
        const res = await fetch('/api/diagnoses/datasets/info', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (active && data?.status === 'active' && data?.metrics) {
            setLiveInfo(data)
            setMetadataStatus('connected')
          } else if (active) {
            setMetadataStatus('unavailable')
          }
        } else {
          if (active) setMetadataStatus('unavailable')
        }
      } catch {
        if (active) setMetadataStatus('unavailable')
      } finally {
        if (active) setLoading(false)
      }
    }

    async function checkModelStatus() {
      if (statusRequestInFlight) return
      statusRequestInFlight = true
      try {
        const response = await fetch('/api/health/ready', { cache: 'no-store' })
        const data = await response.json().catch(() => null)
        if (!active) return
        const available = data?.checks?.ai_engine === 'healthy'
        setModelStatus(available ? 'online' : 'unavailable')
        setDatabaseStatus(data?.checks?.database === 'healthy' ? 'healthy' : 'unavailable')
        setLastStatusCheck(data?.timestamp ? new Date(data.timestamp) : new Date())
      } catch {
        if (active) {
          setModelStatus('unavailable')
          setDatabaseStatus('unavailable')
          setLastStatusCheck(new Date())
        }
      } finally {
        statusRequestInFlight = false
      }
    }

    fetchDatasetMetadata()
    checkModelStatus()
    const refreshTimer = window.setInterval(checkModelStatus, 15000)

    return () => {
      active = false
      window.clearInterval(refreshTimer)
    }
  }, [authFetch, refreshRequest])

  const formatCheckedAt = (date) => date
    ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(date)
    : null

  return (
    <>
      <header className="clinical-navbar" role="banner">
        <div className="clinical-navbar-inner">
          <Link href="/" className="clinical-brand" aria-label="MediscanAI Home">
            <div className="clinical-brand-symbol" aria-hidden="true">
              <IconCaduceus size={18} color="#ffffff" />
            </div>
            <span>MediscanAI</span>
          </Link>
          <nav className="clinical-nav-links" aria-label="Primary Navigation">
            <Link href="/#how-it-works" className="clinical-nav-link">Methodology</Link>
            <Link href="/#clinical-safety" className="clinical-nav-link">Safety & Privacy</Link>
            <Link href="/datasets" className="clinical-nav-link active" aria-current="page">Clinical Datasets</Link>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link href="/login" className="btn btn-ghost btn-sm">Sign In</Link>
            <Link href="/register" className="btn btn-primary btn-sm">Begin Assessment</Link>
          </div>
        </div>
      </header>
      <main className="page-wrapper">
        <div className="container">
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

        <Link href="/register" className="btn btn-primary btn-sm">
          Begin Assessment
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
            <span className="text-caption" style={{ fontSize: '0.75rem' }}>
              {liveInfo?.metrics?.model_type || 'Model details are unavailable.'}
            </span>
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

      {/* Live process health is independent from model evidence and metadata. */}
      <section className="clinical-card live-model-status mb-4" aria-labelledby="model-status-heading" role="status" aria-live="polite">
        <div className="live-model-status-copy">
          <div className="eyebrow-clinical">Live service check · refreshes every 15 seconds</div>
          <h2 id="model-status-heading">
            Model service: {modelStatus === 'online' ? 'Available' : modelStatus === 'checking' ? 'Checking' : 'Unavailable'}
          </h2>
          <p>
            {modelStatus === 'online'
              ? 'The model process is responding. This confirms service availability only; it does not validate an estimate.'
              : modelStatus === 'checking'
                ? 'Checking the analysis service now. No cached status is presented as live.'
                : 'The analysis service did not confirm that its model is loaded. New model estimates may be unavailable.'}
          </p>
          <span className="text-caption">
            {lastStatusCheck ? `Last checked ${formatCheckedAt(lastStatusCheck)} · local time shown by your browser` : 'Waiting for the first health check'}
          </span>
        </div>
        <div className="live-model-status-actions">
          <span className={`triage-tier-badge ${modelStatus === 'online' ? 'routine' : 'moderate'}`}>
            {modelStatus === 'online' ? 'Model loaded' : modelStatus === 'checking' ? 'Checking' : 'Not confirmed'}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setRefreshRequest(request => request + 1)}
            disabled={modelStatus === 'checking'}
          >
            Check now
          </button>
        </div>
      </section>

      <div className="clinical-panel-subtle metadata-status-note mb-4" role="status">
        <p><strong>Database: </strong>{databaseStatus === 'healthy' ? 'Available for account and assessment records.' : databaseStatus === 'checking' ? 'Checking the API readiness report…' : 'Unavailable. Sign-in, saved assessments, and review workflows may not work until storage is restored.'}</p>
        <p><strong>Dataset metadata: </strong>{metadataStatus === 'connected'
          ? 'Loaded from the analysis service.'
          : loading
            ? 'Loading model and dataset details…'
            : 'Unavailable. Model health and dataset metadata are checked separately.'}</p>
      </div>

      <details className="research-reference-panel mb-4">
        <summary>
          <span>
            <span className="eyebrow-clinical">Evidence and limitations</span>
            <strong>Research references &amp; current governance guidance</strong>
            <span className="text-caption">What these sources support—and what they do not establish for this prototype.</span>
          </span>
          <span className="research-reference-count">{researchReferences.length} sources</span>
        </summary>
        <div className="research-reference-content">
          <div className="research-principle-grid">
            <article>
              <h3>What the code uses</h3>
              <p>A calibrated Random Forest over symptom-combination profiles. SHAP is cited as interpretability research, but per-assessment SHAP explanations are not implemented.</p>
            </article>
            <article>
              <h3>What the data represents</h3>
              <p>The Kaggle source is a small symptom-pattern dataset, not a verified cohort of 4,920 patients. Exact train/test profile overlap is measured; this app publishes no clinical performance claim.</p>
            </article>
            <article>
              <h3>What governance standards mean here</h3>
              <p>WHO, NIST, FDA, AES, and HIPAA sources inform design and risk questions. Citing them does not make this prototype clinically validated, FDA-authorized, AES-certified, or HIPAA-compliant.</p>
            </article>
          </div>
          <ol className="research-reference-list">
            {researchReferences.map(reference => (
              <li key={reference.number}>
                <span className="research-reference-number">{reference.number}</span>
                <div>
                  <a href={reference.href} target="_blank" rel="noreferrer" className="research-reference-title">
                    {reference.title}<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                  <p className="research-reference-citation">{reference.citation}</p>
                  <p>{reference.relevance}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </details>

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
        {metadataStatus === 'unavailable' && (
          <div className="clinical-panel-subtle">Dataset details could not be loaded from the analysis service. The figures above remain blank instead of substituting unverified values.</div>
        )}
      </div>

      {/* Clinical Disclaimer */}
      <ClinicalDisclaimer />
          </div>
        </div>
      </main>
    </>
  )
}

export default function DatasetsPage() {
  return (
    <AuthProvider>
      <DatasetsContent />
    </AuthProvider>
  )
}
