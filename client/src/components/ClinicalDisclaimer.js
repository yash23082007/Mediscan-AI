import { IconAlertTriangle } from './Icons'

export default function ClinicalDisclaimer({ compact = false, className = '' }) {
  if (compact) {
    return (
      <div className={`clinical-disclaimer-box ${className}`} style={{ padding: '0.875rem 1rem' }}>
        <p className="clinical-disclaimer-text" style={{ fontSize: '0.78125rem' }}>
          <strong>Clinical Note:</strong> MediscanAI provides preliminary health information and triage guidance for educational purposes only. It does not establish a physician-patient relationship or constitute a definitive medical diagnosis. If you are experiencing acute distress, call emergency services immediately.
        </p>
      </div>
    )
  }

  return (
    <div className={`clinical-disclaimer-box ${className}`} role="note" aria-label="Medical Disclaimer">
      <div className="clinical-disclaimer-header">
        <IconAlertTriangle size={18} color="var(--triage-moderate)" />
        <span>Clinical Information & Safety Notice</span>
      </div>
      <p className="clinical-disclaimer-text">
        MediscanAI is a research prototype for symptom intake and experimental model estimates. It is not clinically validated and does not provide a diagnosis.
      </p>
      <p className="clinical-disclaimer-text mt-1">
        Discuss health concerns with a qualified healthcare professional. In the event of a suspected medical emergency, contact emergency medical services (India: 108 or 112) without delay.
      </p>
    </div>
  )
}
