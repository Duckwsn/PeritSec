import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Clock } from 'lucide-react'

export function ProgressBar({
  value,
  max = 100,
  label,
  compact = false,
  tone = 'teal',
}: {
  value: number
  max?: number
  label: string
  compact?: boolean
  tone?: 'teal' | 'amber' | 'light'
}) {
  const safeMax = Math.max(1, max)
  const safeValue = Math.max(0, Math.min(value, safeMax))
  const percent = Math.round((safeValue / safeMax) * 100)
  return (
    <div className={`progress ${compact ? 'progress--compact' : ''} progress--${tone}`}>
      <div className="progress__meta">
        <span>{label}</span>
        <span className="mono">{percent}%</span>
      </div>
      <div
        className="progress__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={label}
      >
        <span className="progress__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

export type TagTone = 'neutral' | 'teal' | 'amber' | 'rust' | 'green' | 'blue' | 'dark'

export function Tag({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode
  tone?: TagTone
  className?: string
}) {
  return <span className={`tag tag--${tone} ${className}`.trim()}>{children}</span>
}

export function PageHeader({
  title,
  lede,
  actions,
  meta,
}: {
  title: string
  lede?: string
  actions?: ReactNode
  meta?: ReactNode
}) {
  return (
    <header className="page-head">
      <div className="page-head__copy">
        <h1 className="text-balance">{title}</h1>
        {lede && <p className="page-head__lede">{lede}</p>}
        {meta && <div className="page-head__meta">{meta}</div>}
        {actions && <div className="page-head__actions">{actions}</div>}
      </div>
    </header>
  )
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="section-head">
      <div className="section-head__title">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="section-head__action">{action}</div>}
    </div>
  )
}

export function TextLink({
  to,
  children,
  external = false,
}: {
  to: string
  children: ReactNode
  external?: boolean
}) {
  if (external) {
    return (
      <a className="text-link" href={to} target="_blank" rel="noreferrer">
        {children}
        <ArrowRight size={14} aria-hidden="true" />
      </a>
    )
  }
  return (
    <Link className="text-link" to={to}>
      {children}
      <ArrowRight size={14} aria-hidden="true" />
    </Link>
  )
}

export function MetaItem({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <span className="meta-item">
      {icon ?? <Clock size={14} aria-hidden="true" />}
      {children}
    </span>
  )
}

/** Renderização inline mínima e segura: **negrito** e `código`. Sem HTML bruto. */
export function InlineText({ text }: { text: string }) {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return (
    <>
      {tokens.map((token, index) => {
        if (token.startsWith('**') && token.endsWith('**')) {
          return <strong key={index}>{token.slice(2, -2)}</strong>
        }
        if (token.startsWith('`') && token.endsWith('`')) {
          return <code key={index}>{token.slice(1, -1)}</code>
        }
        return <span key={index}>{token}</span>
      })}
    </>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <span className="empty-state__mark" aria-hidden="true" />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}

export function Callout({
  tone = 'nota',
  title,
  children,
}: {
  tone?: 'nota' | 'atencao' | 'limite'
  title: string
  children: ReactNode
}) {
  return (
    <aside className={`callout callout--${tone}`}>
      <span className="callout__label">{tone === 'nota' ? 'Nota' : tone === 'atencao' ? 'Atenção' : 'Limite'}</span>
      <div>
        <strong>{title}</strong>
        <div className="callout__body">{children}</div>
      </div>
    </aside>
  )
}
