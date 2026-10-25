import Link from 'next/link'
import { IconCaduceus, IconLock } from '@/components/Icons'

export default function AuthShell({ eyebrow, contextTitle, description, steps, children }) {
  return (
    <main className="auth-layout">
      <aside className="auth-context" aria-label="About the MediscanAI workspace">
        <Link href="/" className="auth-brand" aria-label="MediscanAI home">
          <span className="clinical-brand-symbol" aria-hidden="true">
            <IconCaduceus size={19} color="#ffffff" />
          </span>
          <span>MediscanAI</span>
        </Link>

        <div className="auth-context-intro">
          <p className="auth-eyebrow">{eyebrow}</p>
          <p className="auth-context-title">{contextTitle}</p>
          <p className="auth-context-copy">{description}</p>
        </div>

        <ol className="auth-guidance">
          {steps.map((step, index) => (
            <li key={step.title}>
              <span className="auth-step-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="auth-boundary">
          MediscanAI is a research prototype. It does not provide a diagnosis or emergency care.
        </p>
      </aside>

      <section className="auth-workspace" aria-label="Account access">
        {children}
        <p className="auth-security-note">
          <IconLock size={14} color="var(--clinical-sage)" aria-hidden="true" />
          <span>Allergies and chronic conditions are encrypted before database storage.</span>
        </p>
      </section>
    </main>
  )
}
