'use client'

import { AuthProvider, useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { IconCaduceus, IconUser, IconActivity, IconFileText, IconStethoscope, IconShield } from '@/components/Icons'
import ClinicalDisclaimer from '@/components/ClinicalDisclaimer'

function isActivePath(pathname, href) {
  return pathname === href || (href !== '/doctor' && pathname.startsWith(href + '/'))
}

function DashboardNav() {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  const isPatient = user?.role === 'patient'
  const isClinician = user?.role === 'doctor' || user?.role === 'admin'

  return (
    <header className="clinical-navbar" id="dashboard-nav" role="banner">
      <div className="clinical-navbar-inner">
        <Link href="/" className="clinical-brand" aria-label="MediscanAI Home">
          <div className="clinical-brand-symbol" aria-hidden="true">
            <IconCaduceus size={18} color="#ffffff" />
          </div>
          <span>MediscanAI</span>
        </Link>

        <nav className="clinical-nav-links" aria-label="Dashboard Navigation">
          {isPatient && (
            <>
              <Link
                href="/dashboard"
                className={`clinical-nav-link ${pathname === '/dashboard' ? 'active' : ''}`}
                aria-current={pathname === '/dashboard' ? 'page' : undefined}
              >
                Health Workspace
              </Link>
              <Link
                href="/questionnaire"
                className={`clinical-nav-link ${pathname === '/questionnaire' ? 'active' : ''}`}
                aria-current={pathname === '/questionnaire' ? 'page' : undefined}
              >
                New Assessment
              </Link>
              <Link
                href="/health-report"
                className={`clinical-nav-link ${pathname === '/health-report' ? 'active' : ''}`}
                aria-current={pathname === '/health-report' ? 'page' : undefined}
              >
                Health Records
              </Link>
            </>
          )}

          {isClinician && (
            <>
              <Link
                href="/doctor"
                className={`clinical-nav-link ${pathname === '/doctor' ? 'active' : ''}`}
                aria-current={pathname === '/doctor' ? 'page' : undefined}
              >
                Overview
              </Link>
              <Link
                href="/doctor/submissions"
                className={`clinical-nav-link ${pathname.startsWith('/doctor/submissions') ? 'active' : ''}`}
                aria-current={pathname.startsWith('/doctor/submissions') ? 'page' : undefined}
              >
                Patient Triage
              </Link>
              <Link
                href="/doctor/analytics"
                className={`clinical-nav-link ${pathname === '/doctor/analytics' ? 'active' : ''}`}
                aria-current={pathname === '/doctor/analytics' ? 'page' : undefined}
              >
                Clinical Metrics
              </Link>
            </>
          )}

          <Link
            href="/datasets"
            className={`clinical-nav-link ${pathname === '/datasets' ? 'active' : ''}`}
            aria-current={pathname === '/datasets' ? 'page' : undefined}
          >
            Clinical Datasets
          </Link>
        </nav>

        <div className="dashboard-user-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--surface-subtle)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)'
            }}>
              <IconUser size={15} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {user?.name || 'User'}
              </span>
              <span className="dashboard-role-badge">
                {user?.role === 'doctor' ? 'Physician' : user?.role || 'Patient'}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  )
}

function MobileBottomNav() {
  const { user } = useAuth()
  const pathname = usePathname()
  const links = user?.role === 'patient'
    ? [
        { href: '/dashboard', label: 'Home', Icon: IconActivity },
        { href: '/questionnaire', label: 'Assess', Icon: IconStethoscope },
        { href: '/health-report', label: 'Records', Icon: IconFileText },
        { href: '/datasets', label: 'Evidence', Icon: IconShield }
      ]
    : [
        { href: '/doctor', label: 'Overview', Icon: IconActivity },
        { href: '/doctor/submissions', label: 'Triage', Icon: IconStethoscope },
        { href: '/doctor/analytics', label: 'Metrics', Icon: IconFileText },
        { href: '/datasets', label: 'Evidence', Icon: IconShield }
      ]

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {links.map(link => (
        <Link key={link.href} href={link.href} className={isActivePath(pathname, link.href) ? 'active' : ''} aria-current={isActivePath(pathname, link.href) ? 'page' : undefined}>
          <link.Icon size={18} aria-hidden="true" />
          <span>{link.label}</span>
        </Link>
      ))}
    </nav>
  )
}

function DashboardShell({ children }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [loading, router, user])

  if (loading) {
    return (
      <main className="page-wrapper" aria-label="Loading your workspace">
        <div className="container">
          <div className="dashboard-skeleton" role="status" aria-live="polite">
            <div className="skeleton skeleton-eyebrow" />
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-copy" />
            <div className="skeleton skeleton-card" />
          </div>
          <span className="sr-only">Loading your workspace…</span>
        </div>
      </main>
    )
  }

  if (!user) return null

  return (
    <>
      <DashboardNav />
      <main className="page-wrapper">
        <div className="container">
          {children}
        </div>
      </main>
      <footer className="clinical-footer">
        <div className="clinical-footer-inner">
          <ClinicalDisclaimer compact />
          <div style={{ marginTop: '1.25rem', fontSize: '0.75rem', color: 'var(--text-caption)' }}>
            MediscanAI Clinical Assessment & Triage System • Confidential Patient Record System
          </div>
        </div>
      </footer>
      <MobileBottomNav />
    </>
  )
}

export default function DashboardLayout({ children }) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  )
}
