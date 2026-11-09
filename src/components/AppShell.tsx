import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ChevronRight, LogOut, Menu, ShieldCheck, UserRound, X } from 'lucide-react'
import { getLesson, tracks } from '../data/courses'
import { investigationCases } from '../data/cases'
import { useAuth } from '../context/AuthContext'
import { levelLabel } from '../lib/progression'

const navItems = [
  { to: '/', label: 'Início', match: (path: string) => path === '/' },
  {
    to: '/trilhas',
    label: 'Aprender',
    match: (path: string) => path.startsWith('/trilhas') || path.startsWith('/licoes'),
  },
  {
    to: '/laboratorios',
    label: 'Laboratórios',
    match: (path: string) => path.startsWith('/laboratorio'),
  },
  { to: '/casos', label: 'Casos periciais', match: (path: string) => path.startsWith('/casos') },
  { to: '/progresso', label: 'Meu progresso', match: (path: string) => path === '/progresso' },
  { to: '/metodologia', label: 'Metodologia', match: (path: string) => path === '/metodologia' },
]

function BrandMark() {
  return (
    <svg className="brand__mark" viewBox="0 0 40 40" aria-hidden="true">
      <rect x="0.5" y="0.5" width="39" height="39" fill="none" stroke="currentColor" />
      <path d="M10 13h20M10 27h20M13 10v20M27 10v20" stroke="currentColor" strokeWidth="1" opacity="0.55" />
      <circle cx="13" cy="13" r="3.5" fill="var(--paper-raised)" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="27" cy="27" r="3.5" fill="var(--paper-raised)" stroke="var(--amber)" strokeWidth="1.4" />
      <circle cx="27" cy="13" r="2" fill="var(--amber)" />
      <circle cx="13" cy="27" r="2" fill="currentColor" />
    </svg>
  )
}

function Breadcrumbs() {
  const location = useLocation()
  const crumbs = useMemo(() => {
    const path = location.pathname
    if (path === '/') return []
    const items: Array<{ label: string; to?: string }> = []
    if (path.startsWith('/trilhas')) {
      items.push({ label: 'Aprender', to: '/trilhas' })
      const trackId = path.split('/')[2]
      if (trackId) {
        const track = tracks.find((candidate) => candidate.id === trackId)
        if (track) items.push({ label: track.title })
      }
      return items
    }
    if (path.startsWith('/licoes')) {
      items.push({ label: 'Aprender', to: '/trilhas' })
      const lesson = getLesson(path.split('/')[2] ?? '')
      if (lesson) {
        const track = tracks.find((candidate) => candidate.id === lesson.trackId)
        if (track) items.push({ label: track.title, to: `/trilhas/${track.id}` })
        items.push({ label: lesson.title })
      }
      return items
    }
    if (path === '/laboratorios') return [{ label: 'Laboratórios' }]
    if (path.startsWith('/laboratorio')) {
      const names: Record<string, string> = {
        '/laboratorio/redes': 'Simulador de rede',
        '/laboratorio/trafego': 'Análise de tráfego',
        '/laboratorio/cripto': 'Laboratório criptográfico',
      }
      return [
        { label: 'Laboratórios', to: '/laboratorios' },
        { label: names[path] ?? 'Laboratório' },
      ]
    }
    if (path === '/casos') return [{ label: 'Casos periciais' }]
    if (path.startsWith('/casos/')) {
      const caseDefinition = investigationCases.find((candidate) => candidate.id === path.split('/')[2])
      return [
        { label: 'Casos periciais', to: '/casos' },
        { label: caseDefinition ? caseDefinition.code : 'Caso' },
      ]
    }
    if (path === '/progresso') return [{ label: 'Meu progresso' }]
    if (path === '/metodologia') return [{ label: 'Metodologia' }]
    if (path === '/admin') return [{ label: 'Administração' }]
    if (path === '/conta') return [{ label: 'Conta local' }]
    if (path === '/comecar') return [{ label: 'Comece por aqui' }]
    if (path === '/nao-encontrado') return [{ label: 'Página não encontrada' }]
    return items
  }, [location.pathname])

  if (crumbs.length === 0) return null

  return (
    <nav
      className={`breadcrumbs${location.pathname === '/comecar' ? ' breadcrumbs--welcome' : ''}`}
      aria-label="Você está em"
    >
      {crumbs.map((crumb, index) => (
        <span key={`${crumb.label}-${index}`} className="breadcrumbs__item">
          {index > 0 && <ChevronRight size={12} aria-hidden="true" />}
          {crumb.to && index < crumbs.length - 1 ? (
            <Link to={crumb.to}>{crumb.label}</Link>
          ) : (
            <span aria-current={index === crumbs.length - 1 ? 'page' : undefined}>{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutBusy, setLogoutBusy] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { account, logout } = useAuth()

  const closeMenu = useCallback((returnFocus = false) => {
    setMenuOpen(false)
    if (returnFocus) menuButtonRef.current?.focus()
  }, [])

  const handleLogout = useCallback(async () => {
    setLogoutBusy(true)
    await logout()
    setLogoutBusy(false)
    closeMenu()
    navigate('/entrar', { replace: true })
  }, [closeMenu, logout, navigate])

  useEffect(() => {
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return
    closeButtonRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu(true)
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.classList.add('nav-open')
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.classList.remove('nav-open')
    }
  }, [menuOpen, closeMenu])

  return (
    <div className="app-shell">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>

      <header className="site-header">
        <div className="site-header__inner">
          <Link to="/" className="brand">
            <BrandMark />
            <span className="brand__text">
              <strong>PeritSec</strong>
              <span>formação técnica</span>
            </span>
          </Link>

          <nav className="main-nav" aria-label="Navegação principal">
            <ul>
              {navItems.map((item) => {
                const active = item.match(location.pathname)
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={`main-nav__link ${active ? 'is-active' : ''}`}
                      aria-current={active ? 'page' : undefined}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {account && (
            <Link
              className={`site-header__account ${location.pathname === '/conta' ? 'is-active' : ''}`}
              to="/conta"
              aria-current={location.pathname === '/conta' ? 'page' : undefined}
              aria-label={`Conta local de ${account.displayName}`}
            >
              <UserRound size={16} aria-hidden="true" />
              <span className="site-header__account-name">{account.displayName}</span>
              <span className="site-header__account-level mono">
                {levelLabel(account.expertise)}
              </span>
            </Link>
          )}

          <button
            type="button"
            className="icon-button site-header__menu"
            ref={menuButtonRef}
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-controls="menu-principal"
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      <div
        className={`menu-drawer ${menuOpen ? 'menu-drawer--open' : ''}`}
        id="menu-principal"
        aria-hidden={menuOpen ? undefined : true}
      >
        <div className="menu-drawer__top">
          <span className="menu-drawer__title">Navegação</span>
          <button
            type="button"
            className="icon-button"
            ref={closeButtonRef}
            onClick={() => closeMenu(true)}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="menu-drawer__nav" aria-label="Áreas do PeritSec">
          <ul>
            {navItems.map((item) => {
              const active = item.match(location.pathname)
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={`menu-drawer__link ${active ? 'is-active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span>{item.label}</span>
                    <ChevronRight size={15} aria-hidden="true" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        {account && (
          <div className="menu-drawer__account">
            <div className="menu-drawer__identity">
              <span className="menu-drawer__identity-name">{account.displayName}</span>
              <span className="menu-drawer__identity-meta mono">
                {account.username} · {levelLabel(account.expertise)}
              </span>
            </div>
            <Link
              to="/conta"
              className={`menu-drawer__link ${location.pathname === '/conta' ? 'is-active' : ''}`}
              aria-current={location.pathname === '/conta' ? 'page' : undefined}
            >
              <span>Conta local</span>
              <UserRound size={15} aria-hidden="true" />
            </Link>
            <Link
              to="/admin"
              className={`menu-drawer__link ${location.pathname === '/admin' ? 'is-active' : ''}`}
              aria-current={location.pathname === '/admin' ? 'page' : undefined}
            >
              <span>Administração</span>
              <ShieldCheck size={15} aria-hidden="true" />
            </Link>
            <button
              type="button"
              className="menu-drawer__link menu-drawer__logout"
              onClick={() => void handleLogout()}
              disabled={logoutBusy}
            >
              <span>{logoutBusy ? 'Saindo…' : 'Sair desta conta'}</span>
              <LogOut size={15} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {menuOpen && (
        <button
          type="button"
          className="menu-scrim"
          aria-label="Fechar menu de navegação"
          onClick={() => closeMenu(true)}
        />
      )}

      <div className="app-main">
        <main id="conteudo" className="content" tabIndex={-1}>
          <Breadcrumbs />
          <Outlet />
        </main>

        <footer className="site-footer">
          <span>PeritSec · cenários sintéticos para prática educacional.</span>
          <span className="site-footer__links">
            <Link to="/metodologia">Metodologia, limites e avaliação</Link>
            <Link to="/admin">Administração local</Link>
          </span>
        </footer>
      </div>
    </div>
  )
}
