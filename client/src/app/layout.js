import './globals.css'

export const metadata = {
  title: 'MediscanAI — Symptom Intake Research Prototype',
  description: 'A research prototype for guided symptom intake and experimental model estimates. Not clinically validated.',
  keywords: 'symptom intake, research prototype, experimental health model',
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
