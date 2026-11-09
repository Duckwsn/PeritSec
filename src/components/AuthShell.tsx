import type { ReactNode } from 'react'

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

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="auth-top">
        <span className="brand brand--static">
          <BrandMark />
          <span className="brand__text">
            <strong>PeritSec</strong>
            <span>formação técnica</span>
          </span>
        </span>
        <span className="auth-top__note mono">instalação local</span>
      </header>
      <main id="conteudo" className="auth-main" tabIndex={-1}>
        {children}
      </main>
      <footer className="auth-footer">
        <span>PeritSec · dados sintéticos, prática local.</span>
        <span>As contas pertencem a esta instalação e não são sincronizadas entre computadores.</span>
      </footer>
    </div>
  )
}
