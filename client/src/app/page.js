'use client'

import Link from 'next/link'
import {
  IconCaduceus,
  IconStethoscope,
  IconShield,
  IconActivity,
  IconFileText,
  IconCheckCircle,
  IconLock,
  IconArrowRight
} from '@/components/Icons'
import ClinicalDisclaimer from '@/components/ClinicalDisclaimer'
import EmergencyNotice from '@/components/EmergencyNotice'

export default function Home() {
  const clinicalSteps = [
    {
      index: '01',
      title: 'Adaptive Clinical Intake',
      description: 'Answer tailored clinical questions that branch dynamically according to your symptoms, avoiding redundant inquiries.',
      benefit: 'Average consultation takes 3 to 4 minutes'
    },
    {
      index: '02',
      title: 'Differential Evidence Mapping',
      description: 'Symptoms are evaluated against structured clinical datasets (4,920 validated diagnostic cases across 41 conditions).',
      benefit: 'Transparent weighting of contributing symptoms'
    },
    {
      index: '03',
      title: 'Physician Review Integration',
      description: 'Licensed medical practitioners review assessments, annotate feedback, and calibrate ongoing clinical precision.',
      benefit: 'Physician oversight built into the care cycle'
    },
    {
      index: '04',
      title: 'Dignified Health Summary',
      description: 'Receive a structured, plain-language clinical summary with triage recommendations to share with your primary doctor.',
      benefit: 'Clear care pathways: routine, in-person, or urgent'
    },
  ]

  const trustPrinciples = [
    {
      icon: <IconShield size={22} color="var(--clinical-teal)" />,
      title: 'Data Confidentiality & AES-256',
      desc: 'All health profiles and symptom inputs are encrypted at rest and in transit. Your personal health records are never monetized.'
    },
    {
      icon: <IconStethoscope size={22} color="var(--clinical-teal)" />,
      title: 'Evidence-Based Transparency',
      desc: 'No black-box predictions. Every finding explains contributing factors, potential differential diagnoses, and inherent clinical uncertainties.'
    },
    {
      icon: <IconCheckCircle size={22} color="var(--clinical-teal)" />,
      title: 'Clinical Oversight by Design',
      desc: 'The platform integrates doctor feedback loops to continuously review accuracy, prevent over-diagnosis, and ensure clinical sanity.'
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Calm Clinical Header */}
      <header className="clinical-navbar" id="main-nav" role="banner">
        <div className="clinical-navbar-inner">
          <Link href="/" className="clinical-brand" aria-label="MediscanAI Home">
            <div className="clinical-brand-symbol" aria-hidden="true">
              <IconCaduceus size={18} color="#ffffff" />
            </div>
            <span>MediscanAI</span>
          </Link>

          <nav className="clinical-nav-links" aria-label="Primary Navigation">
            <a href="#how-it-works" className="clinical-nav-link">Methodology</a>
            <a href="#clinical-safety" className="clinical-nav-link">Safety & Privacy</a>
            <Link href="/datasets" className="clinical-nav-link">Clinical Datasets</Link>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link href="/login" className="btn btn-ghost btn-sm">
              Sign In
            </Link>
            <Link href="/register" className="btn btn-primary btn-sm">
              Begin Assessment
            </Link>
          </div>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        {/* Editorial Masthead / Hero */}
        <section style={{ padding: '4.5rem 0 3.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="container-narrow">
            <div className="animate-calm-fade">
              <div className="eyebrow-clinical mb-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--clinical-teal)' }}></span>
                Clinical Symptom Assessment & Triage
              </div>

              <h1 className="editorial-display mb-3" style={{ color: 'var(--text-primary)' }}>
                Care begins with clarity.
              </h1>

              <p className="text-editorial-lead mb-4">
                MediscanAI transforms uncertain health symptoms into structured, evidence-oriented clinical assessments. Designed for patient peace of mind and verified through clinician review.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.875rem', alignItems: 'center' }}>
                <Link href="/register" className="btn btn-primary btn-lg" id="hero-start-btn">
                  Start Symptom Assessment
                  <IconArrowRight size={18} />
                </Link>
                <Link href="/login" className="btn btn-secondary btn-lg">
                  Clinician Portal
                </Link>
              </div>

              {/* Contextual Clinical Note */}
              <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                <IconLock size={15} color="var(--clinical-sage)" />
                <span>Private & encrypted. No registration required to preview medical datasets.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Emergency Escalation Banner */}
        <section style={{ padding: '1.5rem 0 0' }}>
          <div className="container-narrow">
            <EmergencyNotice />
          </div>
        </section>

        {/* Methodology: How MediscanAI Works */}
        <section id="how-it-works" style={{ padding: '3.5rem 0 4rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="container">
            <div className="mb-4" style={{ maxWidth: '640px' }}>
              <div className="eyebrow-clinical mb-1">Clinical Process</div>
              <h2 className="editorial-heading-lg mb-2">A measured, four-stage journey to clinical understanding.</h2>
              <p className="text-secondary" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
                Unlike generic symptom checkers that present endless checklists, MediscanAI adapts to your specific presentation through decision trees and multi-dataset validation.
              </p>
            </div>

            <div className="grid-4" style={{ marginTop: '2.5rem' }}>
              {clinicalSteps.map((step) => (
                <div key={step.index} className="clinical-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{
                    fontFamily: 'var(--font-editorial)',
                    fontSize: '1.5rem',
                    color: 'var(--clinical-teal)',
                    fontWeight: 500,
                    marginBottom: '0.75rem'
                  }}>
                    {step.index}
                  </div>
                  <h3 className="heading-sm mb-2">{step.title}</h3>
                  <p className="text-secondary" style={{ fontSize: '0.875rem', lineHeight: 1.55, flex: 1 }}>
                    {step.description}
                  </p>
                  <div style={{
                    marginTop: '1.25rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--border-subtle)',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    fontWeight: 500
                  }}>
                    ✓ {step.benefit}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Dual Experience: For Patients & Clinicians */}
        <section style={{ padding: '4rem 0', background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="container">
            <div className="grid-2" style={{ gap: '2rem', alignItems: 'stretch' }}>
              {/* Patient Experience */}
              <div className="clinical-card-elevated" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="eyebrow-clinical mb-2">For Individuals & Families</div>
                <h3 className="editorial-heading-lg mb-2" style={{ fontSize: '1.5rem' }}>
                  Calm, unhurried symptom evaluation.
                </h3>
                <p className="text-secondary mb-4" style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                  When health symptoms appear, uncertainty is overwhelming. MediscanAI provides a quiet, focused environment that listens to your condition, explains why each question is asked, and provides actionable steps.
                </p>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--clinical-teal)' }}>—</span> Clear distinction between self-care and medical urgency
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--clinical-teal)' }}>—</span> Plain-language explanations without medical jargon
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--clinical-teal)' }}>—</span> Printable clinical summary for your doctor visit
                  </li>
                </ul>
                <div style={{ marginTop: 'auto' }}>
                  <Link href="/register" className="btn btn-primary">
                    Create Personal Profile
                  </Link>
                </div>
              </div>

              {/* Clinician Experience */}
              <div className="clinical-card-elevated" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="eyebrow-clinical mb-2">For Physicians & Clinical Staff</div>
                <h3 className="editorial-heading-lg mb-2" style={{ fontSize: '1.5rem' }}>
                  A structured triage & feedback workspace.
                </h3>
                <p className="text-secondary mb-4" style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                  Clinicians can review patient-submitted assessments, inspect contributing symptom vectors, override or approve predictions, and contribute directly to model calibration.
                </p>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--clinical-teal)' }}>—</span> Triage prioritization by clinical urgency
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--clinical-teal)' }}>—</span> Full feature attribution and symptom audit trails
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--clinical-teal)' }}>—</span> Direct feedback loop for continuous model calibration
                  </li>
                </ul>
                <div style={{ marginTop: 'auto' }}>
                  <Link href="/login" className="btn btn-secondary">
                    Access Physician Portal
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust & Safety Principles */}
        <section id="clinical-safety" style={{ padding: '4rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="container">
            <div className="mb-4" style={{ maxWidth: '640px' }}>
              <div className="eyebrow-clinical mb-1">Integrity & Governance</div>
              <h2 className="editorial-heading-lg mb-2">Built upon clinical restraint and patient safety.</h2>
              <p className="text-secondary" style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
                Healthcare software carries a psychological and physical responsibility. We do not inflate confidence scores, replace physicians, or sell your health disclosures.
              </p>
            </div>

            <div className="grid-3" style={{ marginTop: '2.5rem' }}>
              {trustPrinciples.map((item, i) => (
                <div key={i} className="clinical-panel-subtle">
                  <div style={{ marginBottom: '0.75rem' }}>{item.icon}</div>
                  <h3 className="heading-sm mb-2">{item.title}</h3>
                  <p className="text-secondary" style={{ fontSize: '0.875rem', lineHeight: 1.55 }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Official Clinical Disclaimer */}
            <div style={{ marginTop: '3rem' }}>
              <ClinicalDisclaimer />
            </div>
          </div>
        </section>
      </main>

      {/* Editorial Clinical Footer */}
      <footer className="clinical-footer" role="contentinfo">
        <div className="clinical-footer-inner">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div className="clinical-brand-symbol" style={{ width: 24, height: 24 }}>
              <IconCaduceus size={14} color="#ffffff" />
            </div>
            <span style={{ fontWeight: 600, fontSize: '0.9375rem', letterSpacing: '-0.01em' }}>MediscanAI</span>
          </div>

          <p className="text-caption mb-2">
            Clinical decision-support and symptom triage. Operating with AES-256 data protection.
          </p>

          <p className="text-caption" style={{ maxWidth: '680px', margin: '0.5rem auto 0', fontSize: '0.75rem' }}>
            Notice: MediscanAI provides informational health assessments based on clinical algorithms and validated medical datasets. It does not replace clinical consultation with a qualified medical professional. Always consult your doctor for diagnosis and treatment.
          </p>
        </div>
      </footer>
    </div>
  )
}
