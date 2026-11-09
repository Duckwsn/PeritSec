import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Filter,
  Info,
  RotateCcw,
  TriangleAlert,
  XCircle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useProgress } from '../context/ProgressContext'
import { accessForContent, nextActivity } from '../lib/progression'
import { useEnterContent } from '../hooks/useEnterContent'
import { ContentGate } from '../components/ContentGate'
import {
  TRAFFIC_SCENARIO,
  trafficChallenges,
  trafficPackets,
  type TrafficStatus,
} from '../data/traffic'
import { Callout, Tag } from '../components/ui'
import { formatDateTime } from '../lib/progress'
import { filterTrafficPackets, type TrafficPreset } from '../lib/trafficView'

const statusOrder: TrafficStatus[] = ['normal', 'atencao', 'anomalia']

const statusLabel: Record<TrafficStatus, string> = {
  normal: 'normal',
  atencao: 'atenção',
  anomalia: 'anomalia',
}

const presetItems: Array<{ id: TrafficPreset; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'dns', label: 'DNS' },
  { id: 'tcp-tls', label: 'TCP/TLS' },
  { id: 'anomalias', label: 'Anomalias' },
  { id: 'portal', label: 'Portal' },
]

const hintByChallenge: Record<string, string> = {
  'host-externo':
    'Filtre por DNS e observe a coluna de destino. Compare o resolvedor usado pelas consultas do laboratório com o das consultas externas.',
  'codigo-resposta':
    'Abra os detalhes de uma resposta DNS. O campo de código de resposta aparece nos campos observados.',
  exfiltracao:
    'Separe o que foi observado do que foi inferido. Procure fluxos TCP/443 com origem no host citado antes de concluir.',
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function statusTone(status: TrafficStatus): 'green' | 'amber' | 'rust' {
  if (status === 'normal') return 'green'
  if (status === 'atencao') return 'amber'
  return 'rust'
}

export function TrafficLabPage() {
  const { account, isAdmin } = useAuth()
  const { progress } = useProgress()
  const access = account
    ? accessForContent('lab-trafego', account.expertise, progress, { admin: isAdmin })
    : null
  const recommendation = account
    ? nextActivity(account.expertise, progress, { admin: isAdmin })
    : null
  useEnterContent(Boolean(access?.accessible))
  if (!account || !access) return null
  if (!access.accessible) {
    return (
      <ContentGate
        access={access}
        recommendation={recommendation}
        backTo="/laboratorios"
        backLabel="Voltar aos laboratórios"
      />
    )
  }
  return <TrafficLabExperience />
}

function TrafficLabExperience() {
  const { progress, completeLab } = useProgress()
  const [protocol, setProtocol] = useState('todos')
  const [status, setStatus] = useState('todos')
  const [search, setSearch] = useState('')
  const [preset, setPreset] = useState<TrafficPreset>('todos')
  const [selectedId, setSelectedId] = useState(trafficPackets[0]?.id ?? '')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState(false)
  const [results, setResults] = useState<Record<string, boolean>>({})
  const [openHints, setOpenHints] = useState<Record<string, boolean>>({})

  const completedRecord = progress.labs['lab-trafego']

  const protocols = useMemo(
    () => Array.from(new Set(trafficPackets.map((packet) => packet.protocol))).sort(),
    [],
  )

  const filtered = useMemo(
    () => filterTrafficPackets(trafficPackets, { protocol, status, preset, search }),
    [protocol, status, preset, search],
  )

  const selectedPacket = trafficPackets.find((packet) => packet.id === selectedId) ?? null
  const correctCount = trafficChallenges.filter((challenge) => results[challenge.id]).length
  const allCorrect =
    checked && trafficChallenges.every((challenge) => results[challenge.id] === true)
  const filtersActive =
    preset !== 'todos' || protocol !== 'todos' || status !== 'todos' || search.trim() !== ''

  useEffect(() => {
    if (!allCorrect || completedRecord) return
    completeLab({
      labId: 'lab-trafego',
      competency: 'seguranca',
      score: 100,
      label: 'Laboratório de tráfego · consulta externa',
    })
  }, [allCorrect, completedRecord, completeLab])

  function applyPreset(next: TrafficPreset) {
    setPreset(next)
    setProtocol('todos')
    setStatus('todos')
    setSearch('')
  }

  function clearFilters() {
    setPreset('todos')
    setProtocol('todos')
    setStatus('todos')
    setSearch('')
  }

  function verifyAnswers() {
    const nextResults: Record<string, boolean> = {}
    for (const challenge of trafficChallenges) {
      const answer = answers[challenge.id] ?? ''
      nextResults[challenge.id] =
        challenge.kind === 'short'
          ? normalize(answer) === normalize(challenge.answer)
          : answer === challenge.answer
    }
    setResults(nextResults)
    setChecked(true)
  }

  function resetChallenge() {
    setAnswers({})
    setChecked(false)
    setResults({})
    setOpenHints({})
  }

  return (
    <div className="traffic-lab">
      <section className="lab-intro" aria-labelledby="traffic-title">
        <h1 id="traffic-title" className="text-balance">
          Uma consulta que não deveria sair.
        </h1>
        <p className="lab-intro__lede">
          Neste laboratório você examina um recorte de tráfego do uplink do Laboratório 2 durante a
          indisponibilidade do portal. A tarefa é aplicar filtros, interpretar os cabeçalhos e
          responder a três perguntas — decidindo também o que o recorte <em>não</em> permite afirmar.
        </p>

        <dl className="lab-intro__facts">
          <div>
            <dt>Fonte</dt>
            <dd>{TRAFFIC_SCENARIO.source}</dd>
          </div>
          <div>
            <dt>Material</dt>
            <dd>{trafficPackets.length} pacotes sintéticos · apenas cabeçalhos, sem payload</dd>
          </div>
          <div>
            <dt>Entrega</dt>
            <dd>Três respostas verificadas e uma conclusão dentro dos limites da captura</dd>
          </div>
        </dl>

        <ol className="lab-intro__steps">
          <li>
            <strong>Observe</strong> a captura: horários, endereços, protocolos e a classificação de
            cada pacote.
          </li>
          <li>
            <strong>Filtre</strong> pelo que procura — DNS, anomalias, portal ou uma busca por campo.
          </li>
          <li>
            <strong>Examine</strong> os campos observados do pacote selecionado.
          </li>
          <li>
            <strong>Conclua</strong> respondendo às três perguntas com base no que foi visto.
          </li>
        </ol>

        <div className="lab-intro__actions">
          <a className="button button--primary" href="#captura">
            Começar pela captura
            <ArrowRight size={16} aria-hidden="true" />
          </a>
          <Link className="button button--outline" to="/casos">
            Ver o caso completo
          </Link>
        </div>

        <p className="lab-intro__note">
          <TriangleAlert size={15} aria-hidden="true" />
          {TRAFFIC_SCENARIO.warning}
        </p>
      </section>

      <section className="capture-section" id="captura" aria-labelledby="capture-title">
        <div className="capture-head">
          <div>
            <h2 id="capture-title">Pacotes do recorte</h2>
            <p>
              Exibindo <strong>{filtered.length}</strong> de {trafficPackets.length} pacotes.
              Horários em BRT (UTC-3). Fonte: {TRAFFIC_SCENARIO.title}.
            </p>
          </div>
          <Tag tone="dark">dados sintéticos</Tag>
        </div>

        <div className="capture-controls">
          <div className="preset-row" role="group" aria-label="Filtros rápidos">
            {presetItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`filter-chip ${preset === item.id ? 'is-active' : ''}`}
                aria-pressed={preset === item.id}
                onClick={() => applyPreset(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <details className="filter-more">
            <summary>Filtros detalhados</summary>
            <div className="filter-bar">
              <div className="field field--compact">
                <label htmlFor="filter-protocol">Protocolo</label>
                <select
                  id="filter-protocol"
                  value={protocol}
                  onChange={(event) => {
                    setProtocol(event.target.value)
                    setPreset('todos')
                  }}
                >
                  <option value="todos">Todos</option>
                  {protocols.map((item) => (
                    <option value={item} key={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field field--compact">
                <label htmlFor="filter-status">Classificação</label>
                <select
                  id="filter-status"
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value)
                    setPreset('todos')
                  }}
                >
                  <option value="todos">Todas</option>
                  {statusOrder.map((item) => (
                    <option value={item} key={item}>
                      {statusLabel[item]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field field--search">
                <label htmlFor="filter-search">Buscar em campos observados</label>
                <input
                  id="filter-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="IP, nome, porta, NXDOMAIN…"
                  spellCheck={false}
                />
              </div>
            </div>
          </details>
          {filtersActive && (
            <button type="button" className="button button--quiet button--small" onClick={clearFilters}>
              <RotateCcw size={14} aria-hidden="true" /> Limpar filtros
            </button>
          )}
        </div>

        <div className="capture-workspace">
          <div className="packet-table">
            <div className="packet-table__head" aria-hidden="true">
              <span>Nº / tempo</span>
              <span>Origem → destino</span>
              <span>Proto.</span>
              <span>Tam.</span>
              <span>Informação</span>
              <span>Estado</span>
            </div>
            {filtered.length === 0 ? (
              <div className="packet-empty">
                <Filter size={24} aria-hidden="true" />
                <h3>Nenhum pacote corresponde aos filtros.</h3>
                <p>
                  Remova um critério ou limpe a busca. A captura inteira permanece disponível.
                </p>
                <button type="button" className="button button--outline button--small" onClick={clearFilters}>
                  Mostrar os {trafficPackets.length} pacotes
                </button>
              </div>
            ) : (
              <ul className="packet-table__rows" aria-label="Lista de pacotes da captura">
                {filtered.map((packet) => (
                  <li key={packet.id}>
                    <button
                      type="button"
                      className={`packet-table__row ${selectedId === packet.id ? 'is-selected' : ''}`}
                      aria-pressed={selectedId === packet.id}
                      onClick={() => setSelectedId(packet.id)}
                    >
                      <span className="packet-time">
                        <span className="mono">{packet.id}</span>
                        <span className="mono">{packet.time}</span>
                      </span>
                      <span className="packet-flow mono">
                        {packet.src}
                        <ArrowRight size={11} aria-hidden="true" />
                        {packet.dst}
                      </span>
                      <span>
                        <span className={`protocol-badge protocol-badge--${packet.protocol.toLowerCase()}`}>
                          {packet.protocol}
                        </span>
                      </span>
                      <span className="mono packet-length">{packet.length} B</span>
                      <span className="packet-info">{packet.info}</span>
                      <span className={`packet-status packet-status--${packet.status}`}>
                        {packet.status === 'normal' ? (
                          <CheckCircle2 size={13} aria-hidden="true" />
                        ) : packet.status === 'atencao' ? (
                          <TriangleAlert size={13} aria-hidden="true" />
                        ) : (
                          <XCircle size={13} aria-hidden="true" />
                        )}
                        {statusLabel[packet.status]}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <aside className="packet-detail" aria-labelledby="packet-detail-title">
            {selectedPacket ? (
              <>
                <div className="packet-detail__head">
                  <div>
                    <span className="mono packet-detail__id">{selectedPacket.id}</span>
                    <h3 id="packet-detail-title">
                      {selectedPacket.protocol} · {selectedPacket.length} bytes
                    </h3>
                    <p className="packet-detail__info">{selectedPacket.info}</p>
                  </div>
                  <Tag tone={statusTone(selectedPacket.status)}>
                    {statusLabel[selectedPacket.status]}
                  </Tag>
                </div>
                <div className="packet-detail__grid">
                  <dl className="packet-facts">
                    <div>
                      <dt>Tempo</dt>
                      <dd className="mono">{selectedPacket.time}</dd>
                    </div>
                    <div>
                      <dt>Origem</dt>
                      <dd className="mono">{selectedPacket.src}</dd>
                    </div>
                    <div>
                      <dt>Destino</dt>
                      <dd className="mono">{selectedPacket.dst}</dd>
                    </div>
                    <div>
                      <dt>Portas</dt>
                      <dd className="mono">
                        {selectedPacket.srcPort ?? '—'} → {selectedPacket.dstPort ?? '—'}
                      </dd>
                    </div>
                  </dl>
                  <div className="packet-fields">
                    <span className="label">Campos observados</span>
                    <dl>
                      {selectedPacket.fields.map((field) => (
                        <div key={field.label}>
                          <dt>{field.label}</dt>
                          <dd className="mono">{field.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
                <div className="packet-reading-note">
                  <Info size={15} aria-hidden="true" />
                  <p>
                    Leia o campo antes de interpretar o evento. Um cabeçalho isolado mostra o que foi
                    registrado, não a intenção de quem gerou o tráfego.
                  </p>
                </div>
              </>
            ) : (
              <div className="packet-empty">
                <Info size={24} aria-hidden="true" />
                <h3>Selecione um pacote.</h3>
                <p>Os campos observados aparecerão aqui.</p>
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="challenge-section" aria-labelledby="traffic-challenge-title">
        <div className="challenge-head">
          <div>
            <h2 id="traffic-challenge-title">Três perguntas antes da conclusão</h2>
            <p>
              Responda com base no recorte. Não há penalidade por rever um pacote; há limite para o
              que a captura sustenta.
            </p>
          </div>
          <div className="challenge-score" aria-live="polite">
            <strong className="mono">{correctCount}</strong>
            <span>/ {trafficChallenges.length} corretas</span>
          </div>
        </div>

        {completedRecord && (
          <div className="completion-banner completion-banner--lab" role="status">
            <CheckCircle2 size={20} aria-hidden="true" />
            <div>
              <strong>Laboratório concluído</strong>
              <p>
                Registro local em {formatDateTime(completedRecord.completedAt)}. Você pode refazer as
                questões; a conclusão permanece no histórico.
              </p>
            </div>
          </div>
        )}

        <div className="challenge-list">
          {trafficChallenges.map((challenge, index) => {
            const result = results[challenge.id]
            const isCorrect = result === true
            const isIncorrect = checked && result === false
            return (
              <article
                className={`challenge-card ${isCorrect ? 'is-correct' : ''} ${
                  isIncorrect ? 'is-incorrect' : ''
                }`}
                key={challenge.id}
              >
                <div className="challenge-card__head">
                  <span className="challenge-card__index mono">
                    {isCorrect ? <CheckCircle2 size={16} aria-label="correta" /> : `Q${index + 1}`}
                  </span>
                  <div>
                    <p>{challenge.prompt}</p>
                    <button
                      type="button"
                      className="hint-toggle"
                      aria-expanded={Boolean(openHints[challenge.id])}
                      onClick={() =>
                        setOpenHints((current) => ({
                          ...current,
                          [challenge.id]: !current[challenge.id],
                        }))
                      }
                    >
                      {openHints[challenge.id] ? 'Ocultar pista' : 'Ver pista'}
                    </button>
                    {openHints[challenge.id] && (
                      <p className="challenge-hint">{hintByChallenge[challenge.id]}</p>
                    )}
                  </div>
                </div>

                <div className="challenge-card__body">
                  {challenge.kind === 'short' ? (
                    <div className="field field--compact">
                      <label htmlFor={`answer-${challenge.id}`}>Resposta curta</label>
                      <input
                        id={`answer-${challenge.id}`}
                        value={answers[challenge.id] ?? ''}
                        onChange={(event) =>
                          setAnswers((current) => ({ ...current, [challenge.id]: event.target.value }))
                        }
                        placeholder="Digite o IPv4"
                        spellCheck={false}
                        inputMode="decimal"
                      />
                    </div>
                  ) : (
                    <fieldset className="choice-list">
                      <legend className="sr-only">{challenge.prompt}</legend>
                      {challenge.choices?.map((choice) => (
                        <label
                          key={choice.id}
                          className={`choice-row ${
                            answers[challenge.id] === choice.id ? 'is-selected' : ''
                          }`}
                        >
                          <input
                            type="radio"
                            name={`choice-${challenge.id}`}
                            value={choice.id}
                            checked={answers[challenge.id] === choice.id}
                            onChange={() =>
                              setAnswers((current) => ({
                                ...current,
                                [challenge.id]: choice.id,
                              }))
                            }
                          />
                          <span>{choice.label}</span>
                        </label>
                      ))}
                    </fieldset>
                  )}

                  {checked && (
                    <div
                      className={`challenge-feedback ${
                        isCorrect ? 'challenge-feedback--ok' : 'challenge-feedback--no'
                      }`}
                      role="status"
                    >
                      <strong>{isCorrect ? 'Resposta correta.' : 'Ainda não.'}</strong>
                      <p>{challenge.explanation}</p>
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>

        <div className="challenge-actions">
          <button type="button" className="button button--primary" onClick={verifyAnswers}>
            Verificar respostas <ChevronRight size={15} aria-hidden="true" />
          </button>
          <button type="button" className="button button--quiet button--small" onClick={resetChallenge}>
            <RotateCcw size={14} aria-hidden="true" /> Refazer questões
          </button>
          {checked && !allCorrect && (
            <p className="inline-feedback inline-feedback--warn" role="status">
              <TriangleAlert size={14} aria-hidden="true" /> Ajuste as respostas e verifique novamente.
            </p>
          )}
          {allCorrect && (
            <p className="inline-feedback inline-feedback--ok" role="status">
              <CheckCircle2 size={14} aria-hidden="true" /> As três respostas estão corretas.
            </p>
          )}
        </div>
      </section>

      <Callout tone="limite" title="O que não se pode concluir">
        <p>
          Os pacotes são sintéticos e representam apenas um recorte de cabeçalhos. O laboratório não
          demonstra comprometimento, exfiltração, autoria ou intenção. Em uma perícia real, seriam
          necessários procedimentos de preservação, fontes correlatas, registro de custódia e análise
          do escopo autorizado.
        </p>
      </Callout>

      <div className="inline-actions">
        <Link className="text-link" to="/laboratorio/cripto">
          Verificar integridade com SHA-256 <ArrowRight size={14} aria-hidden="true" />
        </Link>
        <Link className="text-link" to="/casos">
          Investigar o caso completo <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
