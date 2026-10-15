import './globals.css'

export const metadata = {
  title: 'MediScan — Clinical Symptom Assessment & Triage Support',
  description: 'Evidence-based clinical symptom assessment, physician review integration, and transparent medical explanations. Designed for patient safety and clinical rigor.',
  keywords: 'clinical assessment, symptom triage, medical decision support, physician review, explainable healthcare, differential diagnosis',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        {children}
      </body>
    </html>
  )
}
