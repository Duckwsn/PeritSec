import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Clock,
  FileText,
  FolderSearch,
  Hash,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useProgress } from '../context/ProgressContext'
import {
  CASE_CATALOG_PREVIEW,
  investigationCases,
} from '../data/cases'
import { CASE_PASS_SCORE, evidenceKindLabel } from '../lib/caseEngine'
import { getCaseProgress } from '../lib/progress'
import {
  accessForContent,
  effectiveLevel,
  explainBlock,
  levelLabel,
  nextActivity,
} from '../lib/progression'
import { PageHeader, SectionHeading, Tag } from '../components/ui'

const difficultyLabel: Record<string, string> = {
  intermediario: 'Intermediário',
  avancado: 'Avançado',
}

export function CasesPage() {
  const { account, isAdmin } = useAuth()
  const { progress } = useProgress()
  if (!account) return null
  const caseDefinition = investigationCases[0]
  const caseProgress = getCaseProgress(progress, caseDefinition.id)
  const submitted = caseProgress.submitted
  const started = caseProgress.evidenceOpened.length > 0 || caseProgress.actions.length > 0
  const caseAccess = accessForContent(caseDefinition.id, account.expertise, progress, {
    admin: isAdmin,
  })
  const locked = !caseAccess.allowed && !caseAccess.historical
  const level = effectiveLevel(account.expertise, progress)
  const recommendation = nextActivity(account.expertise, progress, { admin: isAdmin })
  const blockedReason = locked ? explainBlock(caseAccess, recommendation) : null

  return (
    <div className="cases-page">
      <PageHeader
        title="Casos periciais para aplicar o método completo."
        lede="Um caso pericial completo exige examinar fontes, testar hipóteses, ordenar eventos e comunicar o que as evidências sustentam — inclusive quando não sustentam uma acusação."
        meta={
          <>
            <span className="meta-item">Nível efetivo: {level.label}</span>
            <span className="meta-item">1 caso completo disponível</span>
            <span className="meta-item">8 fontes sintéticas</span>
            <span className="meta-item">relatório com rubrica</span>
          </>
        }
      />

      <section className="page-section">
        <SectionHeading
          title="Dossiê em aberto"
          description="Dados sintéticos, personagens fictícios e escopo educacional autorizado."
        />

        <article className="case-dossier" aria-labelledby="case-dossier-title">
          <div className="case-dossier__body">
            <header className="case-dossier__top">
              <div className="case-dossier__meta">
                <span className="mono case-dossier__code">{caseDefinition.code}</span>
                {locked ? (
                  <Tag tone="rust">requer preparação</Tag>
                ) : submitted?.passed ? (
                  <Tag tone="green">concluído · {submitted.score}/100</Tag>
                ) : submitted ? (
                  <Tag tone="amber">relatório submetido · {submitted.score}/100 · revisar</Tag>
                ) : started ? (
                  <Tag tone="amber">análise em andamento</Tag>
                ) : (
                  <Tag tone="teal">disponível</Tag>
                )}
                <Tag tone="neutral">
                  {difficultyLabel[caseDefinition.difficulty] ?? caseDefinition.difficulty}
                </Tag>
                <span className="case-dossier__duration">
                  {caseDefinition.durationMinutes} min estimados
                </span>
              </div>

              <h3 id="case-dossier-title">{caseDefinition.title}</h3>
              <p className="case-dossier__subtitle">{caseDefinition.subtitle}</p>
            </header>

            <div className="case-dossier__context">
              <p>{caseDefinition.context[0]}</p>
              <p>{caseDefinition.context[1]}</p>
            </div>

            {locked && blockedReason ? (
              <section className="case-dossier__section case-dossier__locked" aria-labelledby="case-locked-title">
                <h4 id="case-locked-title">Preparação necessária</h4>
                <p>{blockedReason.text}</p>
                {blockedReason.requirements.length > 0 && (
                  <ul className="gate-requirements">
                    {blockedReason.requirements.map((requirement) => (
                      <li key={requirement}>{requirement}</li>
                    ))}
                  </ul>
                )}
                {blockedReason.next && (
                  <Link className="text-link" to={blockedReason.next.href}>
                    {blockedReason.next.label}
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                )}
              </section>
            ) : (
              <>
                <section className="case-dossier__section" aria-labelledby="case-evidence-title">
                  <h4 id="case-evidence-title">Inventário de evidências</h4>
                  <ul className="evidence-preview">
                    {caseDefinition.evidence.map((evidence) => (
                      <li key={evidence.id}>
                        <span className="mono evidence-preview__id">{evidence.id}</span>
                        <span className="evidence-preview__title">{evidence.title}</span>
                        <span className="evidence-preview__kind">
                          {evidenceKindLabel(evidence.kind)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="case-dossier__section" aria-labelledby="case-criteria-title">
                  <h4 id="case-criteria-title">Critérios de avaliação</h4>
                  <p className="case-dossier__criteria-lede">
                    A soma dos critérios compõe 100 pontos. A submissão é aprovada a partir de{' '}
                    {CASE_PASS_SCORE}.
                  </p>
                  <ul className="rubric-list case-dossier__criteria">
                    <li>
                      <span>Causa provável</span>
                      <strong className="mono">25 pontos</strong>
                    </li>
                    <li>
                      <span>Correlação de evidências</span>
                      <strong className="mono">20 pontos</strong>
                    </li>
                    <li>
                      <span>Hipóteses e linha do tempo</span>
                      <strong className="mono">30 pontos</strong>
                    </li>
                    <li>
                      <span>Limite da conclusão</span>
                      <strong className="mono">5 pontos</strong>
                    </li>
                    <li>
                      <span>Relatório</span>
                      <strong className="mono">20 pontos</strong>
                    </li>
                  </ul>
                  <div className="case-dossier__rubric-note">
                    <Hash size={15} aria-hidden="true" />
                    <span>Hashes SHA-256 reais sobre extratos sintéticos.</span>
                  </div>
                </section>
              </>
            )}

            <footer className="case-dossier__foot">
              <div className="case-dossier__objectives">
                <span className="case-dossier__label">Objetivo principal</span>
                <p>{caseDefinition.objectives[0]}</p>
                {locked && (
                  <p className="case-dossier__lock-note">
                    Disponível a partir do nível {levelLabel(caseAccess.minLevel)} e com os
                    pré-requisitos de rede, logs, custódia, tráfego e método.
                  </p>
                )}
              </div>
              <Link className="button button--primary" to={`/casos/${caseDefinition.id}`}>
                <FolderSearch size={17} aria-hidden="true" />
                {locked
                  ? 'Ver requisitos'
                  : submitted?.passed
                    ? 'Revisar análise'
                    : started
                      ? 'Retomar investigação'
                      : 'Abrir dossiê'}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </footer>
          </div>
        </article>
      </section>

      <section className="page-section">
        <SectionHeading
          title="Como um caso é conduzido"
          description="O ambiente registra o exame e avalia o raciocínio, não apenas a alternativa final."
        />
        <ol className="case-method">
          <li className="case-method__step">
            <div className="case-method__head">
              <span className="case-method__icon" aria-hidden="true">
                <FileText size={19} />
              </span>
              <h3>Delimitar</h3>
            </div>
            <p>Leia contexto, escopo autorizado, objetivos e limitações do exercício.</p>
          </li>
          <li className="case-method__step">
            <div className="case-method__head">
              <span className="case-method__icon" aria-hidden="true">
                <Hash size={19} />
              </span>
              <h3>Preservar</h3>
            </div>
            <p>Confira identificadores, custódia e hashes antes de interpretar.</p>
          </li>
          <li className="case-method__step">
            <div className="case-method__head">
              <span className="case-method__icon" aria-hidden="true">
                <FolderSearch size={19} />
              </span>
              <h3>Correlacionar</h3>
            </div>
            <p>Examine fontes distintas, normalize horários e selecione o que sustenta a causa.</p>
          </li>
          <li className="case-method__step">
            <div className="case-method__head">
              <span className="case-method__icon" aria-hidden="true">
                <ShieldCheck size={19} />
              </span>
              <h3>Sustentar</h3>
            </div>
            <p>Teste hipóteses e separe observação, inferência e conclusão.</p>
          </li>
          <li className="case-method__step">
            <div className="case-method__head">
              <span className="case-method__icon" aria-hidden="true">
                <FileText size={19} />
              </span>
              <h3>Relatar</h3>
            </div>
            <p>Produza conclusão com confiança, limitações e recomendações verificáveis.</p>
          </li>
        </ol>
      </section>

      <section className="page-section">
        <SectionHeading
          title="Próximos casos"
          description="Itens em preparação aparecem identificados e não possuem link ativo. Não há simulação de caso concluído."
        />
        <div className="case-preview-list">
          {CASE_CATALOG_PREVIEW.map((preview) => (
            <article className="case-preview" key={preview.code}>
              <div className="case-preview__head">
                <span className="mono">{preview.code}</span>
                <Tag tone="neutral">{preview.status}</Tag>
              </div>
              <div className="case-preview__copy">
                <h3>{preview.title}</h3>
                <p>{preview.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="page-note">
        <Clock size={16} aria-hidden="true" />
        <p>
          O caso é um exercício educacional. Não substitui orientação jurídica, protocolo
          institucional ou formação profissional regulamentada. As fontes legais e técnicas
          utilizadas estão documentadas na página de metodologia.
        </p>
      </div>
    </div>
  )
}
