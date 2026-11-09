import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Copy,
  Download,
  FolderSearch,
  Hash,
  Info,
  RotateCcw,
  Save,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useProgress } from '../context/ProgressContext'
import {
  CASE_TIMELINE_INITIAL_ORDER,
  getCaseById,
} from '../data/cases'
import { accessForContent, nextActivity } from '../lib/progression'
import { useEnterContent } from '../hooks/useEnterContent'
import { ContentGate } from '../components/ContentGate'
import {
  CASE_PASS_SCORE,
  caseStepStatus,
  evaluateCase,
  evidenceKindLabel,
  validateCaseSubmission,
  type CaseCriterion,
  type SubmissionValidation,
} from '../lib/caseEngine'
import { sha256Hex } from '../lib/crypto'
import {
  formatDateTime,
  getCaseProgress,
  type CaseProgress,
  type HypothesisVerdict,
} from '../lib/progress'
import { Tag } from '../components/ui'

type CaseTab = 'dossie' | 'evidencias' | 'registro' | 'analise' | 'linha' | 'relatorio'

const tabs: Array<{ id: CaseTab; label: string; stepId?: string }> = [
  { id: 'dossie', label: 'Dossiê' },
  { id: 'evidencias', label: 'Evidências', stepId: 'evidence' },
  { id: 'registro', label: 'Registro', stepId: 'record' },
  { id: 'analise', label: 'Hipóteses', stepId: 'analysis' },
  { id: 'linha', label: 'Linha do tempo', stepId: 'timeline' },
  { id: 'relatorio', label: 'Conclusão', stepId: 'report' },
]

const verdictLabels: Record<HypothesisVerdict, string> = {
  supported: 'Sustentada',
  refuted: 'Refutada',
  insufficient: 'Dados insuficientes',
}

const confidenceLabels = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
}

export function CasePage() {
  const { caseId } = useParams()
  const caseDefinition = caseId ? getCaseById(caseId) : undefined
  const { account, isAdmin } = useAuth()
  const { progress } = useProgress()
  const access =
    caseDefinition && account
      ? accessForContent(caseDefinition.id, account.expertise, progress, { admin: isAdmin })
      : null
  const recommendation = account
    ? nextActivity(account.expertise, progress, { admin: isAdmin })
    : null
  useEnterContent(Boolean(access?.accessible))
  if (!account) return null
  if (caseDefinition && access && !access.accessible) {
    return (
      <ContentGate
        access={access}
        recommendation={recommendation}
        backTo="/casos"
        backLabel="Voltar aos casos"
      />
    )
  }
  return <CaseExperience />
}

function CaseExperience() {
  const { caseId } = useParams()
  const caseDefinition = caseId ? getCaseById(caseId) : undefined
  const { progress, updateCase, submitCase, resetCase } = useProgress()
  const caseProgress = caseDefinition
    ? getCaseProgress(progress, caseDefinition.id)
    : null
  const [activeTab, setActiveTab] = useState<CaseTab>(() =>
    caseProgress?.submitted ? 'relatorio' : 'dossie',
  )
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null)
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null)
  const [integrityStatus, setIntegrityStatus] = useState<Record<string, 'ok' | 'fail'>>({})
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null)
  const [validation, setValidation] = useState<SubmissionValidation | null>(null)
  const [showReset, setShowReset] = useState(false)
  const [savedTimeline, setSavedTimeline] = useState(false)
  const [timelineOrder, setTimelineOrder] = useState<string[]>(() =>
    caseProgress?.timeline.length === (caseDefinition?.timeline.length ?? 0)
      ? caseProgress.timeline
      : CASE_TIMELINE_INITIAL_ORDER,
  )

  if (!caseDefinition || !caseProgress) return <Navigate to="/nao-encontrado" replace />
  const activeCase = caseDefinition
  const activeProgress = caseProgress


  const submitted = activeProgress.submitted
  const steps = caseStepStatus(activeCase, activeProgress)
  const selectedEvidence = activeCase.evidence.find(
    (evidence) => evidence.id === selectedEvidenceId,
  )
  const evidenceSelection = new Set(activeProgress.evidenceSelection)
  const notesCount = Object.values(activeProgress.notes).filter((note) => note.trim().length > 0)
    .length

  function changeTab(tab: CaseTab) {
    setActiveTab(tab)
    setValidation(null)
  }

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : event.key === 'ArrowRight'
            ? (index + 1) % tabs.length
            : (index - 1 + tabs.length) % tabs.length
    const next = tabs[nextIndex]
    changeTab(next.id)
    requestAnimationFrame(() => document.getElementById(`case-tab-${next.id}`)?.focus())
  }

  function openEvidence(evidenceId: string) {
    setSelectedEvidenceId(evidenceId)
    setSavedNoteId(null)
    setCopiedHashId(null)
    const evidence = activeCase?.evidence.find((item) => item.id === evidenceId)
    if (!evidence) return
    if (!activeProgress?.evidenceOpened.includes(evidenceId)) {
      updateCase(
        activeCase.id,
        (current) => ({
          ...current,
          evidenceOpened: [...current.evidenceOpened, evidenceId],
        }),
        `Evidência ${evidenceId} examinada · ${evidence.fileName}.`,
      )
    }
  }

  function openEvidenceTab(evidenceId: string) {
    changeTab('evidencias')
    openEvidence(evidenceId)
  }

  function saveNote(evidenceId: string) {
    const draft = noteDrafts[evidenceId] ?? activeProgress.notes[evidenceId] ?? ''
    updateCase(
      activeCase.id,
      (current) => ({
        ...current,
        notes: { ...current.notes, [evidenceId]: draft },
      }),
      `Observação registrada em ${evidenceId}.`,
    )
    setNoteDrafts((current) => ({ ...current, [evidenceId]: draft }))
    setSavedNoteId(evidenceId)
  }

  function verifyIntegrity(evidenceId: string) {
    const evidence = activeCase.evidence.find((item) => item.id === evidenceId)
    if (!evidence) return
    const matches = sha256Hex(evidence.content) === evidence.hash
    setIntegrityStatus((current) => ({ ...current, [evidenceId]: matches ? 'ok' : 'fail' }))
    updateCase(
      activeCase.id,
      (current) => current,
      `Integridade de ${evidenceId} conferida com SHA-256 (${matches ? 'hash confere' : 'divergência'}).`,
    )
  }

  async function copyHash(evidenceId: string, hash: string) {
    try {
      await navigator.clipboard.writeText(hash)
      setCopiedHashId(evidenceId)
    } catch {
      setCopiedHashId(null)
    }
  }

  function setHypothesis(hypothesisId: string, verdict: HypothesisVerdict) {
    updateCase(
      activeCase.id,
      (current) => ({
        ...current,
        hypotheses: { ...current.hypotheses, [hypothesisId]: verdict },
      }),
      `Hipótese ${hypothesisId} classificada como “${verdictLabels[verdict]}”.`,
    )
  }

  function moveTimeline(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= timelineOrder.length) return
    const next = [...timelineOrder]
    ;[next[index], next[target]] = [next[target], next[index]]
    setTimelineOrder(next)
    setSavedTimeline(false)
    updateCase(activeCase.id, (current) => ({ ...current, timeline: next }))
  }

  function registerTimeline() {
    updateCase(
      activeCase.id,
      (current) => ({ ...current, timeline: timelineOrder }),
      'Linha do tempo registrada no exame.',
    )
    setSavedTimeline(true)
  }

  function updateReportField(field: keyof CaseProgress['report'], value: string) {
    updateCase(activeCase.id, (current) => ({
      ...current,
      report: { ...current.report, [field]: value },
    }))
  }

  function handleSubmit() {
    const current = getCaseProgress(progress, activeCase.id)
    const result = validateCaseSubmission(activeCase, current)
    setValidation(result)
    if (!result.valid) {
      setActiveTab('relatorio')
      return
    }
    const evaluation = evaluateCase(activeCase, current)
    submitCase({
      caseId: activeCase.id,
      caseTitle: activeCase.title,
      submission: {
        score: evaluation.score,
        passed: evaluation.passed,
        at: new Date().toISOString(),
        breakdown: evaluation.criteria,
      },
    })
    changeTab('relatorio')
  }

  function handleReset() {
    resetCase(activeCase.id)
    setSelectedEvidenceId(null)
    setNoteDrafts({})
    setIntegrityStatus({})
    setValidation(null)
    setShowReset(false)
    setTimelineOrder(CASE_TIMELINE_INITIAL_ORDER)
    setSavedTimeline(false)
    changeTab('dossie')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function downloadReport() {
    if (!submitted) return
    const conclusion = activeCase.conclusionOptions.find(
      (option) => option.id === activeProgress.conclusionId,
    )
    const unsupported = activeCase.unsupportedClaimOptions.find(
      (option) => option.id === activeProgress.unsupportedClaimId,
    )
    const lines = [
      `# ${activeCase.code} — ${activeCase.title}`,
      '',
      `Análise submetida em ${formatDateTime(submitted.at)}.`,
      `Avaliação: ${submitted.score}/100 — ${submitted.passed ? 'critérios mínimos atingidos' : 'revisão recomendada'}.`,
      '',
      '> Exercício educacional com dados sintéticos. Não representa perícia real.',
      '',
      '## Causa técnica provável',
      conclusion?.label ?? '(não selecionada)',
      '',
      `Grau de confiança: ${activeProgress.confidence ? confidenceLabels[activeProgress.confidence] : '(não informado)'}.`,
      '',
      '## Fatos observados',
      activeProgress.report.facts,
      '',
      '## Inferência técnica',
      activeProgress.report.inference,
      '',
      '## Limitações',
      activeProgress.report.limitations,
      '',
      '## Recomendações',
      activeProgress.report.recommendations,
      '',
      '## Afirmação não sustentada',
      unsupported?.label ?? '(não selecionada)',
      '',
      '## Avaliação por critério',
      ...submitted.breakdown.map(
        (criterion) => `- ${criterion.label}: ${criterion.earned}/${criterion.max}`,
      ),
      '',
      '## Nota de integridade',
      activeCase.integrityNote,
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${activeCase.code}-relatorio.md`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  const selectedCorrect =
    evidenceSelection.size > 0 &&
    activeCase.evidenceSelectionCorrectIds.length === evidenceSelection.size &&
    activeCase.evidenceSelectionCorrectIds.every((id) => evidenceSelection.has(id))

  return (
    <div className="case-page">
      <header className="case-head">
        <div className="case-head__main">
          <h1 className="text-balance">{activeCase.title}</h1>
          <p className="case-head__subtitle">{activeCase.subtitle}</p>
          <div className="case-head__meta">
            <span className="mono">{activeCase.code}</span>
            <span>
              <Clock size={14} aria-hidden="true" /> {activeCase.durationMinutes} min estimados
            </span>
            <span>
              <FolderSearch size={14} aria-hidden="true" /> {activeCase.evidence.length} evidências
            </span>
            <span>
              <ShieldCheck size={14} aria-hidden="true" /> dados sintéticos
            </span>
            <Tag tone={submitted ? 'green' : 'amber'}>
              {submitted ? 'submetido' : 'dossiê em aberto'}
            </Tag>
          </div>
        </div>
        <div className="case-head__status">
          <span className="mono">Andamento</span>
          <div className="case-head__steps">
            {steps.map((step) => (
              <span key={step.id} className={step.complete ? 'is-complete' : ''}>
                <span className="case-head__step-dot" aria-hidden="true" />
                {step.label}
              </span>
            ))}
          </div>
          {submitted ? (
            <div className="case-score-mini">
              <strong>{submitted.score}</strong>
              <span>/ 100</span>
              <em>{submitted.passed ? 'critérios atingidos' : 'revisão recomendada'}</em>
            </div>
          ) : (
            <p className="case-head__hint">
              O relatório só é aceito quando as etapas obrigatórias estiverem preenchidas.
            </p>
          )}
        </div>
      </header>

      <div className="case-tabs" role="tablist" aria-label="Etapas da investigação">
        {tabs.map((tab, index) => {
          const step = steps.find((candidate) => candidate.id === tab.stepId)
          return (
            <button
              key={tab.id}
              id={`case-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`case-panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              className={`case-tab ${activeTab === tab.id ? 'case-tab--active' : ''} ${
                step?.complete ? 'case-tab--complete' : ''
              }`}
              onClick={() => changeTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              <span className="case-tab__index mono">{String(index + 1).padStart(2, '0')}</span>
              <span>{tab.label}</span>
              {step?.complete && <CheckCircle2 size={14} aria-label="etapa completa" />}
            </button>
          )
        })}
      </div>

      <div
        className="case-panel"
        role="tabpanel"
        id={`case-panel-${activeTab}`}
        aria-labelledby={`case-tab-${activeTab}`}
        tabIndex={0}
      >
        {activeTab === 'dossie' && (
          <div className="case-overview">
            <div className="case-overview__main">
              <section>
                <h2>Contexto do caso</h2>
                {activeCase.context.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
              <section>
                <h2>Objetivos da análise</h2>
                <ol className="case-objectives">
                  {activeCase.objectives.map((objective, index) => (
                    <li key={objective}>
                      <span className="mono">{String(index + 1).padStart(2, '0')}</span>
                      {objective}
                    </li>
                  ))}
                </ol>
              </section>
              <section className="case-scope">
                <div className="case-scope__head">
                  <ShieldCheck size={18} aria-hidden="true" />
                  <strong>Escopo e limites autorizados</strong>
                </div>
                <p>{activeCase.scope}</p>
                <ul>
                  {activeCase.constraints.map((constraint) => (
                    <li key={constraint}>{constraint}</li>
                  ))}
                </ul>
              </section>
              <section>
                <div className="section-minihead">
                  <div>
                    <h2>Fontes de evidência</h2>
                  </div>
                  <span className="mono">{activeProgress.evidenceOpened.length}/{activeCase.evidence.length} examinadas</span>
                </div>
                <ul className="evidence-inventory">
                  {activeCase.evidence.map((evidence) => {
                    const opened = activeProgress.evidenceOpened.includes(evidence.id)
                    return (
                      <li key={evidence.id}>
                        <button
                          type="button"
                          onClick={() => openEvidenceTab(evidence.id)}
                          className={`evidence-inventory__row ${opened ? 'is-opened' : ''}`}
                        >
                          <span className="mono evidence-inventory__id">{evidence.id}</span>
                          <span className="evidence-inventory__main">
                            <strong>{evidence.title}</strong>
                            <small>
                              {evidence.fileName} · {evidence.origin} · {evidence.clock}
                            </small>
                          </span>
                          <span className="evidence-inventory__state">
                            {opened ? (
                              <>
                                <CheckCircle2 size={14} aria-hidden="true" /> examinada
                              </>
                            ) : (
                              'examinar'
                            )}
                          </span>
                          <ChevronRight size={16} aria-hidden="true" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            </div>

            <aside className="case-overview__aside">
              <div className="case-side-panel">
                <div className="section-minihead">
                  <div>
                    <h2>Registro do exame</h2>
                  </div>
                  <span className="mono">{activeProgress.actions.length}</span>
                </div>
                {activeProgress.actions.length === 0 ? (
                  <p className="case-log-empty">
                    Nenhuma ação registrada. Abrir uma evidência, salvar uma nota ou classificar uma
                    hipótese cria um registro com data e hora.
                  </p>
                ) : (
                  <ol className="case-log">
                    {[...activeProgress.actions]
                      .slice(-8)
                      .reverse()
                      .map((action, index) => (
                        <li key={`${action.at}-${index}`}>
                          <span className="case-log__dot" aria-hidden="true" />
                          <div>
                            <p>{action.label}</p>
                            <time className="mono" dateTime={action.at}>
                              {formatDateTime(action.at)}
                            </time>
                          </div>
                        </li>
                      ))}
                  </ol>
                )}
                <p className="case-log-note">
                  O registro acompanha o rascunho do caso no armazenamento local ativo.
                </p>
              </div>
              <div className="case-side-panel case-side-panel--note">
                <Hash size={20} aria-hidden="true" />
                <h3>Integridade da cópia</h3>
                <p>{activeCase.integrityNote}</p>
              </div>
            </aside>
          </div>
        )}

        {activeTab === 'evidencias' && (
          <div>
            <div className="case-section-head">
              <div>
                <h2>Evidências</h2>
                <p>
                  Selecione uma fonte para analisar conteúdo, metadados e custódia. Abrir uma
                  evidência é registrado no exame.
                </p>
              </div>
              <Tag tone="dark">dados sintéticos</Tag>
            </div>

            <div className="evidence-workspace">
              <nav className="evidence-nav" aria-label="Lista de evidências">
                {activeCase.evidence.map((evidence) => {
                  const opened = activeProgress.evidenceOpened.includes(evidence.id)
                  return (
                    <button
                      key={evidence.id}
                      type="button"
                      className={`evidence-nav__item ${
                        selectedEvidenceId === evidence.id ? 'is-selected' : ''
                      }`}
                      aria-pressed={selectedEvidenceId === evidence.id}
                      onClick={() => openEvidence(evidence.id)}
                    >
                      <span className="mono">{evidence.id}</span>
                      <span>
                        <strong>{evidence.title}</strong>
                        <small>{evidence.fileName}</small>
                      </span>
                      {opened && <CheckCircle2 size={14} aria-label="já examinada" />}
                    </button>
                  )
                })}
              </nav>

              <div className="evidence-detail">
                {!selectedEvidence ? (
                  <div className="evidence-empty">
                    <FolderSearch size={28} aria-hidden="true" />
                    <h3>Nenhuma evidência selecionada</h3>
                    <p>
                      Escolha uma fonte na lista. O sistema registra a abertura e exibe conteúdo,
                      clock, cadeia de custódia e hash.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="evidence-detail__head">
                      <div>
                        <div className="tag-row">
                          <Tag tone="dark">{selectedEvidence.id}</Tag>
                          <Tag tone="neutral">
                            {evidenceKindLabel(selectedEvidence.kind)}
                          </Tag>
                          {activeProgress.evidenceOpened.includes(selectedEvidence.id) && (
                            <Tag tone="green">
                              <CheckCircle2 size={12} aria-hidden="true" /> examinada
                            </Tag>
                          )}
                        </div>
                        <h2>{selectedEvidence.title}</h2>
                        <p>{selectedEvidence.description}</p>
                      </div>
                      <span className="mono evidence-detail__file">{selectedEvidence.fileName}</span>
                    </div>

                    <dl className="evidence-meta">
                      <div>
                        <dt>Origem</dt>
                        <dd>{selectedEvidence.origin}</dd>
                      </div>
                      <div>
                        <dt>Relógio da fonte</dt>
                        <dd>{selectedEvidence.clock}</dd>
                      </div>
                      <div>
                        <dt>Coleta</dt>
                        <dd>{selectedEvidence.collectedAt}</dd>
                      </div>
                      <div>
                        <dt>Método</dt>
                        <dd>{selectedEvidence.method}</dd>
                      </div>
                      <div>
                        <dt>Responsável</dt>
                        <dd>{selectedEvidence.collectedBy}</dd>
                      </div>
                      <div>
                        <dt>Lacre didático</dt>
                        <dd>{selectedEvidence.seal}</dd>
                      </div>
                    </dl>

                    <div className="integrity-box">
                      <div className="integrity-box__head">
                        <Hash size={17} aria-hidden="true" />
                        <strong>SHA-256 registrado</strong>
                        <span className="mono">cópia de trabalho</span>
                      </div>
                      <code className="hash-value">{selectedEvidence.hash}</code>
                      <div className="integrity-box__actions">
                        <button
                          type="button"
                          className="button button--outline button--small"
                          onClick={() => verifyIntegrity(selectedEvidence.id)}
                        >
                          <ShieldCheck size={14} aria-hidden="true" /> Verificar integridade
                        </button>
                        <button
                          type="button"
                          className="button button--quiet button--small"
                          onClick={() => copyHash(selectedEvidence.id, selectedEvidence.hash)}
                        >
                          <Copy size={14} aria-hidden="true" />
                          {copiedHashId === selectedEvidence.id ? 'Copiado' : 'Copiar hash'}
                        </button>
                        {integrityStatus[selectedEvidence.id] === 'ok' && (
                          <span className="integrity-result integrity-result--ok">
                            <CheckCircle2 size={14} aria-hidden="true" /> Hash confere
                          </span>
                        )}
                        {integrityStatus[selectedEvidence.id] === 'fail' && (
                          <span className="integrity-result integrity-result--fail">
                            <TriangleAlert size={14} aria-hidden="true" /> Divergência
                          </span>
                        )}
                      </div>
                      <p>
                        A verificação é calculada no navegador sobre o texto exibido. Ela confirma
                        integridade da cópia em relação ao hash registrado; não autentica origem,
                        autoria ou veracidade histórica.
                      </p>
                    </div>

                    <div className="evidence-content">
                      <div className="evidence-content__bar">
                        <span className="mono">Conteúdo do extrato</span>
                        <span className="mono">{selectedEvidence.content.split('\n').length} linhas</span>
                      </div>
                      <pre>
                        <code>{selectedEvidence.content}</code>
                      </pre>
                    </div>

                    <div className="evidence-note evidence-note--cta">
                      <div>
                        <strong>Registre a observação no passo 3</strong>
                        <p>
                          Descreva o que esta fonte mostra — valores, horários e campos — sem
                          antecipar a causa. As hipóteses ficam no passo 4.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="button button--outline button--small"
                        onClick={() => changeTab('registro')}
                      >
                        Abrir registro <ArrowRight size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'registro' && (
          <div>
            <div className="case-section-head">
              <div>
                <h2>Observações das fontes</h2>
                <p>
                  Registre fatos verificáveis de cada fonte: valores, horários, campos e o que ainda
                  precisa ser correlacionado. A causa provável pertence ao passo de hipóteses.
                </p>
              </div>
              <Tag tone={notesCount > 0 ? 'green' : 'neutral'}>
                {notesCount} de {activeCase.evidence.length} fontes com observação
              </Tag>
            </div>

            <div className="record-list">
              {activeCase.evidence.map((evidence) => {
                const opened = activeProgress.evidenceOpened.includes(evidence.id)
                const value = noteDrafts[evidence.id] ?? activeProgress.notes[evidence.id] ?? ''
                return (
                  <article className="record-item" key={evidence.id}>
                    <div className="record-item__head">
                      <div>
                        <span className="mono">
                          {evidence.id} · {evidence.fileName}
                        </span>
                        <h3>{evidence.title}</h3>
                      </div>
                      <Tag tone={opened ? 'green' : 'neutral'}>
                        {opened ? 'fonte examinada' : 'ainda não examinada'}
                      </Tag>
                    </div>
                    <label htmlFor={`note-${evidence.id}`} className="sr-only">
                      Observação sobre a fonte {evidence.id}
                    </label>
                    <textarea
                      id={`note-${evidence.id}`}
                      rows={3}
                      value={value}
                      onChange={(event) => {
                        setNoteDrafts((current) => ({
                          ...current,
                          [evidence.id]: event.target.value,
                        }))
                        setSavedNoteId(null)
                      }}
                      placeholder="Ex.: o registro de 08:06 mostra consulta ao resolvedor 8.8.8.8; comparar com a captura do uplink."
                    />
                    <div className="record-item__actions">
                      <button
                        type="button"
                        className="button button--outline button--small"
                        onClick={() => saveNote(evidence.id)}
                      >
                        <Save size={14} aria-hidden="true" /> Salvar observação
                      </button>
                      {savedNoteId === evidence.id && (
                        <span className="inline-feedback inline-feedback--ok" role="status">
                          <CheckCircle2 size={14} aria-hidden="true" /> Observação registrada.
                        </span>
                      )}
                      {!opened && (
                        <button
                          type="button"
                          className="text-link"
                          onClick={() => {
                            setSelectedEvidenceId(evidence.id)
                            changeTab('evidencias')
                          }}
                        >
                          Examinar esta fonte <ArrowRight size={14} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'analise' && (
          <div className="analysis-panel">
            <div className="case-section-head">
              <div>
                <h2>Evidências e hipóteses</h2>
                <p>
                  Selecione o par de fontes que sustenta a causa imediata e classifique cada
                  hipótese. A classificação é avaliada no relatório.
                </p>
              </div>
              <Tag tone={activeProgress.evidenceSelection.length === 2 ? 'teal' : 'neutral'}>
                {activeProgress.evidenceSelection.length}{' '}
                {activeProgress.evidenceSelection.length === 1
                  ? 'fonte selecionada'
                  : 'fontes selecionadas'}
              </Tag>
            </div>

            <section className="analysis-block">
              <div className="analysis-block__head">
                <h3>Tarefa 1 — Quais duas fontes documentam a configuração entregue e o efeito observado?</h3>
              </div>
              <p className="analysis-instruction">{activeCase.evidenceSelectionPrompt}</p>
              <div className="evidence-select-grid">
                {activeCase.evidence.map((evidence) => {
                  const checked = evidenceSelection.has(evidence.id)
                  return (
                    <label
                      key={evidence.id}
                      className={`evidence-select ${checked ? 'is-selected' : ''} ${
                        submitted && checked
                          ? activeCase.evidenceSelectionCorrectIds.includes(evidence.id)
                            ? 'is-correct'
                            : 'is-wrong'
                          : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={Boolean(submitted)}
                        onChange={() => {
                          const ids = checked
                            ? activeProgress.evidenceSelection.filter((id) => id !== evidence.id)
                            : [...activeProgress.evidenceSelection, evidence.id]
                          updateCase(activeCase.id, (current) => ({
                            ...current,
                            evidenceSelection: ids,
                          }))
                        }}
                      />
                      <span className="mono">{evidence.id}</span>
                      <span>
                        <strong>{evidence.title}</strong>
                        <small>
                          {evidence.fileName} · {evidence.clock}
                        </small>
                      </span>
                    </label>
                  )
                })}
              </div>
              {submitted && (
                <div className={`inline-feedback ${selectedCorrect ? 'inline-feedback--ok' : 'inline-feedback--warn'}`}>
                  {selectedCorrect ? (
                    <>
                      <CheckCircle2 size={15} /> Seleção compatível com o gabarito.
                    </>
                  ) : (
                    <>
                      <TriangleAlert size={15} /> A seleção não corresponde ao conjunto esperado.
                      Veja a justificativa na aba Conclusão.
                    </>
                  )}
                </div>
              )}
            </section>

            <section className="analysis-block">
              <div className="analysis-block__head">
                <h3>Tarefa 2 — Classifique cada hipótese com base nas fontes disponíveis.</h3>
              </div>
              <div className="verdict-legend">
                <span><strong>Sustentada</strong> — as evidências favorecem a hipótese.</span>
                <span><strong>Refutada</strong> — as evidências são incompatíveis com ela.</span>
                <span><strong>Dados insuficientes</strong> — o material não permite decidir.</span>
              </div>
              <div className="hypothesis-list">
                {activeCase.hypotheses.map((hypothesis) => {
                  const currentVerdict = activeProgress.hypotheses[hypothesis.id] ?? ''
                  const hypothesisCorrect = currentVerdict === hypothesis.expected
                  return (
                    <article className="hypothesis" key={hypothesis.id}>
                      <div className="hypothesis__head">
                        <span className="mono">{hypothesis.id}</span>
                        <div>
                          <h3>{hypothesis.label}</h3>
                          <p>{hypothesis.detail}</p>
                        </div>
                        {submitted && (
                          <Tag tone={hypothesisCorrect ? 'green' : 'rust'}>
                            {hypothesisCorrect ? 'correta' : 'rever'}
                          </Tag>
                        )}
                      </div>
                      <fieldset className="verdict-options" disabled={Boolean(submitted)}>
                        <legend className="sr-only">Classificação da hipótese {hypothesis.id}</legend>
                        {(Object.keys(verdictLabels) as HypothesisVerdict[]).map((verdict) => (
                          <label
                            key={verdict}
                            className={`verdict-option ${
                              currentVerdict === verdict ? 'is-selected' : ''
                            } ${
                              submitted && hypothesis.expected === verdict ? 'is-expected' : ''
                            }`}
                          >
                            <input
                              type="radio"
                              name={`hypothesis-${hypothesis.id}`}
                              checked={currentVerdict === verdict}
                              onChange={() => setHypothesis(hypothesis.id, verdict)}
                            />
                            <span>{verdictLabels[verdict]}</span>
                          </label>
                        ))}
                      </fieldset>
                      {submitted && (
                        <div className="hypothesis__key">
                          <strong>Leitura correta: {verdictLabels[hypothesis.expected]}</strong>
                          <p>{hypothesis.justification}</p>
                          <span className="mono">fontes: {hypothesis.evidenceIds.join(', ')}</span>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'linha' && (
          <div>
            <div className="case-section-head">
              <div>
                <h2>Linha do tempo normalizada</h2>
                <p>
                  As fontes usam fusos diferentes. Ordene os eventos pelo momento em que ocorreram,
                  não pela ordem em que aparecem nos extratos. Use as setas para reposicionar.
                </p>
              </div>
              <div className="case-section-head__actions">
                <span className={`mono ${savedTimeline ? 'timeline-saved' : ''}`}>
                  {savedTimeline ? 'ordem registrada' : 'ordem em edição'}
                </span>
                <button
                  type="button"
                  className="button button--outline button--small"
                  onClick={registerTimeline}
                  disabled={Boolean(submitted)}
                >
                  <ClipboardCheck size={14} aria-hidden="true" /> Registrar ordem
                </button>
              </div>
            </div>

            <div className="timeline-note">
              <Clock size={16} aria-hidden="true" />
              <p>
                A captura E-05 e o firewall E-03 estão em UTC. O DHCP, o DNS interno e o servidor do
                portal usam BRT (UTC-3). Converta antes de comparar.
              </p>
            </div>

            <ol className="case-timeline">
              {timelineOrder.map((eventId, index) => {
                const event = activeCase.timeline.find((candidate) => candidate.id === eventId)
                if (!event) return null
                const correctPosition =
                  submitted && activeCase.timeline[index]?.id === event.id
                return (
                  <li key={event.id} className={submitted ? (correctPosition ? 'is-correct' : 'is-wrong') : ''}>
                    <span className="case-timeline__position mono">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="case-timeline__copy">
                      <div className="case-timeline__top">
                        <strong>{event.label}</strong>
                        <span className="mono case-timeline__source-time">{event.sourceTime}</span>
                      </div>
                      <p>{event.note}</p>
                      <div className="case-timeline__meta">
                        <span className="mono">fonte: {event.source}</span>
                        {submitted && (
                          <span className="mono case-timeline__normalized">
                            normalizado: {formatNormalized(event.normalizedTime)}
                          </span>
                        )}
                      </div>
                    </div>
                    {submitted ? (
                      correctPosition ? (
                        <CheckCircle2 size={16} aria-label="posição correta" />
                      ) : (
                        <TriangleAlert size={16} aria-label="posição incorreta" />
                      )
                    ) : (
                      <span className="case-timeline__buttons">
                        <button
                          type="button"
                          className="icon-button icon-button--small"
                          aria-label={`Mover ${event.label} para cima`}
                          disabled={index === 0}
                          onClick={() => moveTimeline(index, -1)}
                        >
                          <ArrowUp size={15} />
                        </button>
                        <button
                          type="button"
                          className="icon-button icon-button--small"
                          aria-label={`Mover ${event.label} para baixo`}
                          disabled={index === timelineOrder.length - 1}
                          onClick={() => moveTimeline(index, 1)}
                        >
                          <ArrowDown size={15} />
                        </button>
                      </span>
                    )}
                  </li>
                )
              })}
            </ol>

            {submitted && (
              <div className="timeline-gabarito">
                <h3>Gabarito da cronologia</h3>
                <ol>
                  {activeCase.timeline.map((event) => (
                    <li key={event.id}>
                      <span className="mono">{formatNormalized(event.normalizedTime)}</span>
                      <span>{event.label}</span>
                      <span className="faint mono">{event.source}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {activeTab === 'relatorio' && (
          <div>
            {!submitted ? (
              <>
                <div className="case-section-head">
                  <div>
                    <h2>Conclusão e relatório técnico</h2>
                    <p>
                      Escolha a causa, explicite o limite da conclusão e escreva um relatório que
                      separe fatos, inferência, limitações e recomendações.
                    </p>
                  </div>
                  <Tag tone="amber">avaliação por rubrica</Tag>
                </div>

                {validation && !validation.valid && (
                  <div className="validation-box" role="alert">
                    <TriangleAlert size={18} aria-hidden="true" />
                    <div>
                      <strong>O relatório ainda não pode ser submetido.</strong>
                      <ul>
                        {validation.missing.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="report-layout">
                  <div className="report-main">
                    <section className="report-block">
                      <h3>Tarefa 3 — Qual causa explica o incidente?</h3>
                      <fieldset className="report-options">
                        <legend className="sr-only">Causa técnica provável</legend>
                        {activeCase.conclusionOptions.map((option) => (
                          <label
                            key={option.id}
                            className={`report-option ${
                              activeProgress.conclusionId === option.id ? 'is-selected' : ''
                            }`}
                          >
                            <input
                              type="radio"
                              name="case-cause"
                              checked={activeProgress.conclusionId === option.id}
                              onChange={() =>
                                updateCase(activeCase.id, (current) => ({
                                  ...current,
                                  conclusionId: option.id,
                                }))
                              }
                            />
                            <span className="mono">{option.id}</span>
                            <span>{option.label}</span>
                          </label>
                        ))}
                      </fieldset>
                    </section>

                    <section className="report-block report-block--split">
                      <div>
                        <h3>Grau de confiança</h3>
                        <div className="confidence-options">
                          {(Object.keys(confidenceLabels) as Array<keyof typeof confidenceLabels>).map(
                            (level) => (
                              <label
                                key={level}
                                className={activeProgress.confidence === level ? 'is-selected' : ''}
                              >
                                <input
                                  type="radio"
                                  name="case-confidence"
                                  checked={activeProgress.confidence === level}
                                  onChange={() =>
                                    updateCase(activeCase.id, (current) => ({
                                      ...current,
                                      confidence: level,
                                    }))
                                  }
                                />
                                {confidenceLabels[level]}
                              </label>
                            ),
                          )}
                        </div>
                      </div>
                      <div>
                        <h3>Afirmação não sustentada</h3>
                        <fieldset className="report-options report-options--compact">
                          <legend className="sr-only">Afirmação não sustentada</legend>
                          {activeCase.unsupportedClaimOptions.map((option) => (
                            <label
                              key={option.id}
                              className={`report-option ${
                                activeProgress.unsupportedClaimId === option.id ? 'is-selected' : ''
                              }`}
                            >
                              <input
                                type="radio"
                                name="case-unsupported"
                                checked={activeProgress.unsupportedClaimId === option.id}
                                onChange={() =>
                                  updateCase(activeCase.id, (current) => ({
                                    ...current,
                                    unsupportedClaimId: option.id,
                                  }))
                                }
                              />
                              <span className="mono">{option.id}</span>
                              <span>{option.label}</span>
                            </label>
                          ))}
                        </fieldset>
                      </div>
                    </section>

                    <section className="report-block">
                      <h3>Tarefa 4 — Relato técnico</h3>
                      <p className="report-instruction">
                        A avaliação verifica conteúdo, separação entre fato e inferência e
                        extensão mínima. Ela não é uma avaliação semântica automática; leia o
                        gabarito após submeter.
                      </p>
                      {(
                        [
                          ['facts', 'Fatos observados', activeCase.reportGuidance.facts],
                          ['inference', 'Inferência técnica', activeCase.reportGuidance.inference],
                          ['limitations', 'Limitações e incertezas', activeCase.reportGuidance.limitations],
                          [
                            'recommendations',
                            'Recomendações',
                            activeCase.reportGuidance.recommendations,
                          ],
                        ] as const
                      ).map(([field, label, guidance]) => (
                        <div className="field report-field" key={field}>
                          <label htmlFor={`report-${field}`}>{label}</label>
                          <span className="field__hint">{guidance}</span>
                          <textarea
                            id={`report-${field}`}
                            rows={field === 'facts' || field === 'inference' ? 5 : 4}
                            value={activeProgress.report[field]}
                            onChange={(event) => updateReportField(field, event.target.value)}
                          />
                          <span className="report-field__count mono">
                            {activeProgress.report[field].trim().length} caracteres · mínimo 60
                          </span>
                        </div>
                      ))}
                    </section>
                  </div>

                  <aside className="report-aside">
                    <div className="aside-panel">
                      <h3 className="aside-panel__title">Rubrica</h3>
                      <ul className="rubric-list">
                        <li><span>Causa técnica provável</span><strong className="mono">25</strong></li>
                        <li><span>Correlação de evidências</span><strong className="mono">20</strong></li>
                        <li><span>Teste de hipóteses</span><strong className="mono">15</strong></li>
                        <li><span>Linha do tempo</span><strong className="mono">15</strong></li>
                        <li><span>Limite da conclusão</span><strong className="mono">5</strong></li>
                        <li><span>Relatório técnico</span><strong className="mono">20</strong></li>
                      </ul>
                      <p className="rubric-note">
                        Aprovação a partir de {CASE_PASS_SCORE}/100. O gabarito completo aparece
                        depois da submissão.
                      </p>
                    </div>
                    <div className="aside-panel aside-panel--muted">
                      <strong>Checklist antes de submeter</strong>
                      <ul className="plain-list">
                        <li>{activeProgress.evidenceOpened.length >= 4 ? '✓' : '○'} Pelo menos 4 evidências examinadas</li>
                        <li>{activeProgress.evidenceSelection.length > 0 ? '✓' : '○'} Par de evidências selecionado</li>
                        <li>{steps.find((step) => step.id === 'analysis')?.complete ? '✓' : '○'} Todas as hipóteses classificadas</li>
                        <li>{steps.find((step) => step.id === 'timeline')?.complete ? '✓' : '○'} Linha do tempo registrada</li>
                        <li>{activeProgress.conclusionId ? '✓' : '○'} Causa escolhida</li>
                        <li>{activeProgress.unsupportedClaimId ? '✓' : '○'} Limite da conclusão indicado</li>
                        <li>{activeProgress.confidence ? '✓' : '○'} Confiança declarada</li>
                      </ul>
                    </div>
                    <button type="button" className="button button--primary button--full" onClick={handleSubmit}>
                      <ClipboardCheck size={16} aria-hidden="true" /> Submeter relatório
                    </button>
                    {activeProgress.actions.length > 0 && (
                      <button
                        type="button"
                        className="button button--quiet button--full"
                        onClick={() => setShowReset(true)}
                      >
                        <RotateCcw size={14} aria-hidden="true" /> Reiniciar análise
                      </button>
                    )}
                    {showReset && (
                      <div className="reset-confirm">
                        <strong>Reiniciar apaga este rascunho?</strong>
                        <p>
                          Evidências examinadas, anotações, hipóteses, linha do tempo e relatório serão
                          removidos do armazenamento local ativo.
                        </p>
                        <div className="button-row">
                          <button type="button" className="button button--danger button--small" onClick={handleReset}>
                            Sim, reiniciar
                          </button>
                          <button
                            type="button"
                            className="button button--quiet button--small"
                            onClick={() => setShowReset(false)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </aside>
                </div>
              </>
            ) : (
              <div className="case-result">
                <section className={`result-hero ${submitted.passed ? 'result-hero--passed' : 'result-hero--review'}`}>
                  <div className="result-hero__score">
                    <strong>{submitted.score}</strong>
                    <span>/ 100</span>
                  </div>
                  <div className="result-hero__copy">
                    <h2>{submitted.passed ? 'A análise foi registrada.' : 'A análise precisa de revisão.'}</h2>
                    <p>
                      Submetido em {formatDateTime(submitted.at)}. O resultado abaixo é calculado por
                      rubrica a partir das suas seleções e do conteúdo do relatório.
                    </p>
                  </div>
                  <div className="result-hero__actions">
                    <button type="button" className="button button--outline button--small" onClick={downloadReport}>
                      <Download size={14} aria-hidden="true" /> Baixar relatório .md
                    </button>
                    <button
                      type="button"
                      className="button button--quiet button--small"
                      onClick={() => setShowReset(true)}
                    >
                      <RotateCcw size={14} aria-hidden="true" /> Refazer análise
                    </button>
                  </div>
                </section>

                {showReset && (
                  <div className="reset-confirm reset-confirm--wide">
                    <strong>Refazer a análise apaga o resultado atual?</strong>
                    <p>
                      O relatório submetido e o histórico deste caso serão removidos. O restante do
                      seu progresso permanece.
                    </p>
                    <div className="button-row">
                      <button type="button" className="button button--danger button--small" onClick={handleReset}>
                        Sim, refazer
                      </button>
                      <button
                        type="button"
                        className="button button--quiet button--small"
                        onClick={() => setShowReset(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                <div className="result-grid">
                  <section className="result-panel">
                    <h3 className="result-panel__title">Avaliação por critério</h3>
                    <div className="criteria-list">
                      {submitted.breakdown.map((criterion) => (
                        <CriterionRow key={criterion.id} criterion={criterion} />
                      ))}
                    </div>
                  </section>
                  <section className="result-panel">
                    <h3 className="result-panel__title">Registro</h3>
                    <dl className="result-summary">
                      <div>
                        <dt>Causa escolhida</dt>
                        <dd>
                          {activeCase.conclusionOptions.find((option) => option.id === activeProgress.conclusionId)?.label}
                        </dd>
                      </div>
                      <div>
                        <dt>Confiança</dt>
                        <dd>{activeProgress.confidence ? confidenceLabels[activeProgress.confidence] : '—'}</dd>
                      </div>
                      <div>
                        <dt>Evidências examinadas</dt>
                        <dd>{activeProgress.evidenceOpened.length} de {activeCase.evidence.length}</dd>
                      </div>
                      <div>
                        <dt>Ações registradas</dt>
                        <dd>{activeProgress.actions.length}</dd>
                      </div>
                    </dl>
                    <div className="result-integrity">
                      <Hash size={15} aria-hidden="true" />
                      <span>{activeCase.integrityNote}</span>
                    </div>
                  </section>
                </div>

                <section className="gabarito">
                  <div className="case-section-head">
                    <div>
                      <h2>Justificativas e limites</h2>
                      <p>
                        Compare sua análise com a leitura técnica de referência. Não há atribuição de
                        responsabilidade individual.
                      </p>
                    </div>
                    <Tag tone="dark">referência</Tag>
                  </div>

                  <div className="gabarito-grid">
                    <article className="gabarito-block">
                      <span className="mono">Causa</span>
                      <h3>
                        {activeCase.conclusionOptions.find((option) => option.id === activeCase.correctConclusionId)?.label}
                      </h3>
                      <p>
                        {activeCase.conclusionOptions.find((option) => option.id === activeCase.correctConclusionId)?.rationale}
                      </p>
                    </article>
                    <article className="gabarito-block">
                      <span className="mono">Evidências diretas</span>
                      <ul>
                        {activeCase.evidenceSelectionCorrectIds.map((id) => {
                          const evidence = activeCase.evidence.find((item) => item.id === id)
                          return (
                            <li key={id}>
                              <strong className="mono">{id}</strong> {evidence?.title} — {evidence?.fileName}
                            </li>
                          )
                        })}
                      </ul>
                      <p>
                        O par conecta a configuração entregue ao cliente (E-01) ao efeito observado na
                        consulta (E-05). Outras fontes corroboram ou excluem hipóteses, mas não formam
                        esse par mínimo.
                      </p>
                    </article>
                    <article className="gabarito-block">
                      <span className="mono">Hipóteses</span>
                      <ul className="gabarito-hypotheses">
                        {activeCase.hypotheses.map((hypothesis) => (
                          <li key={hypothesis.id}>
                            <div>
                              <strong>{hypothesis.id} · {verdictLabels[hypothesis.expected]}</strong>
                              <span>{hypothesis.label}</span>
                            </div>
                            <p>{hypothesis.justification}</p>
                          </li>
                        ))}
                      </ul>
                    </article>
                    <article className="gabarito-block">
                      <span className="mono">Afirmação não sustentada</span>
                      <h3>
                        {activeCase.unsupportedClaimOptions.find((option) => option.id === activeCase.unsupportedClaimId)?.label}
                      </h3>
                      <p>
                        {activeCase.unsupportedClaimOptions.find((option) => option.id === activeCase.unsupportedClaimId)?.rationale}
                      </p>
                    </article>
                  </div>

                  <section className="reference-report">
                    <div className="case-section-head">
                      <div>
                        <h3>Como uma conclusão pode ser redigida</h3>
                      </div>
                    </div>
                    {(
                      [
                        ['facts', 'Fatos observados'],
                        ['inference', 'Inferência técnica'],
                        ['limitations', 'Limitações'],
                        ['recommendations', 'Recomendações'],
                      ] as const
                    ).map(([field, label]) => (
                      <div className="reference-report__field" key={field}>
                        <strong>{label}</strong>
                        <p>{activeCase.referenceReport[field]}</p>
                      </div>
                    ))}
                  </section>
                </section>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="case-footer-nav">
        <Link to="/casos" className="text-link">
          <ArrowLeft size={14} aria-hidden="true" /> Todos os casos
        </Link>
        <Link to="/progresso" className="text-link">
          Ver progresso registrado <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}

function CriterionRow({ criterion }: { criterion: CaseCriterion }) {
  const percent = Math.round((criterion.earned / criterion.max) * 100)
  return (
    <div className={`criterion ${criterion.met ? 'is-met' : ''}`}>
      <div className="criterion__head">
        <span>
          {criterion.met ? <CheckCircle2 size={14} aria-hidden="true" /> : <Info size={14} aria-hidden="true" />}
          {criterion.label}
        </span>
        <strong className="mono">
          {criterion.earned}/{criterion.max}
        </strong>
      </div>
      <div className="criterion__bar">
        <span style={{ width: `${percent}%` }} />
      </div>
      <p>{criterion.feedback}</p>
    </div>
  )
}

function formatNormalized(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(date)
}
