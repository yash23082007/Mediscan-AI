import { IconAlertTriangle } from './Icons'

export default function ClinicalDisclaimer({ compact = false, className = '' }) {
  if (compact) {
    return (
      <div className={`clinical-disclaimer-box ${className}`} style={{ padding: '0.875rem 1rem' }}>
        <p className="clinical-disclaimer-text" style={{ fontSize: '0.78125rem' }}>
          <strong>Clinical Note:</strong> MediScan provides preliminary health information and triage guidance for educational purposes only. It does not establish a physician-patient relationship or constitute a definitive medical diagnosis. If you are experiencing acute distress, call emergency services immediately.
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
        MediScan is an informational triage and clinical decision-support tool designed to assist patients in understanding health symptoms.
        <strong> It is not a substitute for clinical judgment, diagnostic confirmation, or emergency medical treatment.</strong>
      </p>
      <p className="clinical-disclaimer-text mt-1">
        All assessments are preliminary and should be discussed with a licensed healthcare practitioner. In the event of a suspected medical emergency—such as acute chest pain, severe dyspnea, sudden weakness, or unconsciousness—contact emergency medical services (e.g. 911/112) without delay.
      </p>
    </div>
  )
}
