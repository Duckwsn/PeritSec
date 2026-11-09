import { Link } from 'react-router-dom'
import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react'
import { explainBlock, type ContentAccess } from '../lib/progression'
import { Tag } from './ui'

export function ContentGate({
  access,
  recommendation,
  backTo,
  backLabel,
}: {
  access: ContentAccess
  recommendation?: Parameters<typeof explainBlock>[1]
  backTo?: string
  backLabel?: string
}) {
  const reason = explainBlock(access, recommendation)
  return (
    <div className="content-gate">
      <header className="page-head">
        <div className="page-head__copy">
          <h1 className="text-balance">{access.title ?? 'Conteúdo protegido'}</h1>
          <p className="page-head__lede">
            {access.type === 'case'
              ? 'A investigação exige preparação específica antes do exame das evidências.'
              : 'Esta atividade faz parte de uma etapa posterior da jornada.'}
          </p>
          <div className="page-head__meta">
            <span className="meta-item">
              <LockKeyhole size={14} aria-hidden="true" />
              {reason.title}
            </span>
            {access.type && <Tag tone="neutral">{access.type === 'case' ? 'caso pericial' : access.type === 'lab' ? 'laboratório' : 'lição'}</Tag>}
            <span className="meta-item">Nível efetivo: {access.effectiveLevel.label}</span>
          </div>
        </div>
      </header>

      <section className="content-gate__panel" aria-labelledby="gate-title">
        <div className="content-gate__copy">
          <h2 id="gate-title">{reason.title}</h2>
          <p>{reason.text}</p>
          {reason.requirements.length > 0 && (
            <ul className="gate-requirements">
              {reason.requirements.map((requirement) => (
                <li key={requirement}>{requirement}</li>
              ))}
            </ul>
          )}
          <p className="content-gate__safety">
            <ShieldCheck size={15} aria-hidden="true" />
            O bloqueio não revela a conclusão do caso nem o gabarito dos exercícios.
          </p>
        </div>
        <div className="content-gate__actions">
          {reason.next && (
            <Link className="button button--primary" to={reason.next.href}>
              {reason.next.label}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          )}
          <Link className="button button--outline" to="/trilhas">
            Ver a jornada completa
          </Link>
          {backTo && (
            <Link className="text-link" to={backTo}>
              {backLabel ?? 'Voltar'}
            </Link>
          )}
        </div>
      </section>
    </div>
  )
}
