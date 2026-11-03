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
    <header className="workspace-topbar" id="dashboard-nav" role="banner">
      <div className="workspace-topbar-inner">
        <Link href="/" className="clinical-brand" aria-label="MediscanAI Home">
          <div className="clinical-brand-symbol" aria-hidden="true">
            <IconCaduceus size={18} color="#ffffff" />
          </div>
          <span>MediscanAI</span>
        </Link>
        <p className="workspace-topbar-context">{isPatient ? 'Patient workspace' : 'Clinical review workspace'}</p>
        <div className="workspace-topbar-account">
          <span className="workspace-account-avatar" aria-hidden="true"><IconUser size={16} /></span>
          <span className="workspace-account-name">{user?.name || 'User'}</span>
          <span className="dashboard-role-badge">
            {user?.role === 'doctor' ? 'Physician' : user?.role || 'Patient'}
          </span>
          <button onClick={logout} className="btn btn-ghost btn-sm workspace-signout">Sign Out</button>
        </div>
      </div>
    </header>
  )
}

function WorkspaceSidebar() {
  const { user } = useAuth()
  const pathname = usePathname()
  const isPatient = user?.role === 'patient'
  const isClinician = user?.role === 'doctor' || user?.role === 'admin'

  return (
    <aside className="workspace-sidebar" aria-label="Workspace navigation">
      <p className="workspace-sidebar-label">{isPatient ? 'My care' : 'Clinical work'}</p>
      <nav className="workspace-sidebar-nav" aria-label="Workspace">
          {isPatient && (
            <>
              <Link
                href="/dashboard"
                className={`workspace-sidebar-link ${pathname === '/dashboard' ? 'active' : ''}`}
                aria-current={pathname === '/dashboard' ? 'page' : undefined}
              >
                <IconActivity size={17} aria-hidden="true" /><span>Overview</span>
              </Link>
              <Link
                href="/questionnaire"
                className={`workspace-sidebar-link ${pathname === '/questionnaire' ? 'active' : ''}`}
                aria-current={pathname === '/questionnaire' ? 'page' : undefined}
              >
                <IconStethoscope size={17} aria-hidden="true" /><span>New assessment</span>
              </Link>
              <Link
                href="/health-report"
                className={`workspace-sidebar-link ${pathname === '/health-report' ? 'active' : ''}`}
                aria-current={pathname === '/health-report' ? 'page' : undefined}
              >
                <IconFileText size={17} aria-hidden="true" /><span>Health records</span>
              </Link>
            </>
          )}

          {isClinician && (
            <>
              <Link
                href="/doctor"
                className={`workspace-sidebar-link ${pathname === '/doctor' ? 'active' : ''}`}
                aria-current={pathname === '/doctor' ? 'page' : undefined}
              >
                <IconActivity size={17} aria-hidden="true" /><span>Overview</span>
              </Link>
              <Link
                href="/doctor/submissions"
                className={`workspace-sidebar-link ${pathname.startsWith('/doctor/submissions') ? 'active' : ''}`}
                aria-current={pathname.startsWith('/doctor/submissions') ? 'page' : undefined}
              >
                <IconStethoscope size={17} aria-hidden="true" /><span>Patient triage</span>
              </Link>
              <Link
                href="/doctor/analytics"
                className={`workspace-sidebar-link ${pathname === '/doctor/analytics' ? 'active' : ''}`}
                aria-current={pathname === '/doctor/analytics' ? 'page' : undefined}
              >
                <IconFileText size={17} aria-hidden="true" /><span>Clinical metrics</span>
              </Link>
            </>
          )}

          <Link
            href="/datasets"
            className={`workspace-sidebar-link ${pathname === '/datasets' ? 'active' : ''}`}
            aria-current={pathname === '/datasets' ? 'page' : undefined}
          >
            <IconShield size={17} aria-hidden="true" /><span>Evidence & model</span>
          </Link>
      </nav>
      <section className="workspace-sidebar-note" aria-label="Research prototype notice">
        <IconShield size={16} aria-hidden="true" />
        <p>Research prototype<br /><span>Not for diagnosis or emergency care</span></p>
      </section>
    </aside>
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
      <div className="workspace-app-frame">
        <WorkspaceSidebar />
        <div className="workspace-app-column">
          <main className="page-wrapper">
            <div className="container">
              {children}
            </div>
          </main>
          <footer className="clinical-footer">
            <div className="clinical-footer-inner">
              <ClinicalDisclaimer compact />
              <div style={{ marginTop: '1.25rem', fontSize: '0.75rem', color: 'var(--text-caption)' }}>
                MediscanAI • Research workspace
              </div>
            </div>
          </footer>
          </div>
      </div>
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
