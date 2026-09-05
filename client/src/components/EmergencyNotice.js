import { IconAlertTriangle } from './Icons'

export default function EmergencyNotice({ className = '' }) {
  return (
    <div className={`emergency-callout ${className}`} role="alert">
      <IconAlertTriangle size={20} color="var(--triage-urgent)" style={{ flexShrink: 0, marginTop: '2px' }} />
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--triage-urgent)', marginBottom: '0.25rem' }}>
          When to Seek Immediate Emergency Care
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          If you or someone in your care experiences severe chest pressure, sudden numbness or speech difficulty, uncontrollable bleeding, or severe shortness of breath, please contact your local emergency response service immediately rather than completing an online assessment.
        </p>
      </div>
    </div>
  )
}
