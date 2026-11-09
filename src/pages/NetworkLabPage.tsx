import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Cpu,
  Network,
  Play,
  Router,
  RotateCcw,
  Server,
  Terminal,
  TriangleAlert,
  Waypoints,
  XCircle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useProgress } from '../context/ProgressContext'
import { accessForContent, nextActivity } from '../lib/progression'
import { useEnterContent } from '../hooks/useEnterContent'
import { ContentGate } from '../components/ContentGate'
import { Callout, Tag } from '../components/ui'
import {
  LAB_SCENARIOS,
  PORTAL_NAME,
  assessReach,
  createLabState,
  findDuplicatesOf,
  getDevice,
  getPcs,
  getScenario,
  getSwitch,
  resolveName,
  runTerminalCommand,
  updatePcConfig,
  updateSwitchPortVlan,
  validatePcConfig,
  type CommandResult,
  type LabDevice,
  type LabState,
  type LabScenario,
  type PacketEvent,
  type PcConfig,
  type SwitchPort,
} from '../lib/network'
import { formatDateTime } from '../lib/progress'

interface TerminalLine {
  id: number
  kind: 'system' | 'input' | 'output' | 'error'
  text: string
  host?: string
  at?: string
}

interface Intervention {
  id: number
  at: string
  label: string
}

const difficultyLabel: Record<LabScenario['difficulty'], string> = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
}

function initialLines(scenario: LabScenario): TerminalLine[] {
  return [
    {
      id: 1,
      kind: 'system',
      text: `Terminal didático · ${scenario.code} — ${scenario.title}`,
    },
    {
      id: 2,
      kind: 'system',
      text: 'Digite "help" para ver os comandos. Nenhuma instrução é enviada ao sistema operacional ou à rede real.',
    },
  ]
}

function deviceIcon(kind: LabDevice['kind']) {
  if (kind === 'pc') return Cpu
  if (kind === 'switch') return Network
  if (kind === 'router') return Router
  return Server
}

function deviceSummary(device: LabDevice): string {
  if (device.kind === 'pc' || device.kind === 'server') return device.config.ip || 'sem endereço'
  if (device.kind === 'router') return `${device.interfaces.length} interfaces`
  return `${device.ports.length} portas`
}

function nowTime(): string {
  return new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function statusLabel(status: PacketEvent['status']): string {
  if (status === 'ok') return 'entregue'
  if (status === 'warn') return 'atenção'
  return 'falha'
}

export function NetworkLabPage() {
  const { account, isAdmin } = useAuth()
  const { progress } = useProgress()
  const access = account
    ? accessForContent('lab-redes', account.expertise, progress, { admin: isAdmin })
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
  return <NetworkLabExperience />
}

function NetworkLabExperience() {
  const { progress, completeLab } = useProgress()
  const [scenarioId, setScenarioId] = useState(LAB_SCENARIOS[0].id)
  const scenario = getScenario(scenarioId)
  const [labState, setLabState] = useState<LabState>(() => createLabState(scenarioId))
  const [selectedDeviceId, setSelectedDeviceId] = useState('pc-lab')
  const [terminalHostId, setTerminalHostId] = useState('pc-lab')
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>(() => initialLines(scenario))
  const [command, setCommand] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyPosition, setHistoryPosition] = useState(-1)
  const [events, setEvents] = useState<PacketEvent[]>([])
  const [selectedEventIndex, setSelectedEventIndex] = useState(0)
  const [lastCommand, setLastCommand] = useState('')
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [resetArmed, setResetArmed] = useState(false)
  const [hintOpen, setHintOpen] = useState(false)
  const [configDraft, setConfigDraft] = useState<PcConfig>(() => {
    const pc = createLabState(scenarioId).devices.find((device) => device.id === 'pc-lab')
    return pc?.kind === 'pc' ? { ...pc.config } : { ip: '', mask: '', gateway: '', dns: '' }
  })
  const [configFeedback, setConfigFeedback] = useState<'idle' | 'saved' | 'blocked'>('idle')
  const terminalSeq = useRef(3)
  const interventionSeq = useRef(1)
  const terminalInputRef = useRef<HTMLInputElement>(null)
  const terminalEndRef = useRef<HTMLDivElement>(null)

  const selectedDevice = getDevice(labState, selectedDeviceId) ?? getDevice(labState, 'pc-lab')
  const terminalHost = getPcs(labState).find((host) => host.id === terminalHostId) ?? getPcs(labState)[0]
  const accessPorts = getSwitch(labState).ports.filter((port) => port.mode === 'access')
  const completionKey = `lab-redes:${scenario.id}`
  const completedRecord = progress.labs[completionKey]
  const scenarioDone = scenario.isComplete(labState)
  const completedScenarios = LAB_SCENARIOS.filter((item) => progress.labs[`lab-redes:${item.id}`]).length
  const selectedEvent = events[selectedEventIndex] ?? null

  const validation = useMemo(() => {
    if (!selectedDevice || selectedDevice.kind !== 'pc') return { errors: [], warnings: [] }
    return validatePcConfig(labState, selectedDevice.id, configDraft)
  }, [configDraft, labState, selectedDevice])

  const reachability = useMemo(
    () => ({
      portal: assessReach(labState, 'pc-lab', '10.10.50.20', 'icmp'),
      dns: resolveName(labState, 'pc-lab', PORTAL_NAME),
      duplicate: findDuplicatesOf(labState, getPcs(labState)[0]?.config.ip ?? '', 'pc-lab'),
    }),
    [labState],
  )

  useEffect(() => {
    if (!scenarioDone || completedRecord) return
    completeLab({
      labId: completionKey,
      competency: 'diagnostico',
      score: 100,
      label: `Simulador de rede · ${scenario.title}`,
    })
  }, [scenarioDone, completedRecord, completeLab, completionKey, scenario.title])

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ block: 'nearest' })
  }, [terminalLines])

  function syncSelection(state: LabState, preferredId: string) {
    const device = getDevice(state, preferredId)
    if (device && (device.kind === 'pc' || device.kind === 'switch')) {
      setSelectedDeviceId(device.id)
    } else {
      setSelectedDeviceId('pc-lab')
    }
    if (device?.kind === 'pc') {
      setConfigDraft({ ...device.config })
    } else {
      const pc = getDevice(state, 'pc-lab')
      if (pc?.kind === 'pc') setConfigDraft({ ...pc.config })
    }
  }

  function loadScenario(id: string) {
    const nextScenario = getScenario(id)
    const nextState = createLabState(id)
    setScenarioId(id)
    setLabState(nextState)
    setSelectedDeviceId('pc-lab')
    setTerminalHostId('pc-lab')
    setTerminalLines(initialLines(nextScenario))
    setCommand('')
    setHistory([])
    setHistoryPosition(-1)
    setEvents([])
    setSelectedEventIndex(0)
    setLastCommand('')
    setInterventions([])
    setResetArmed(false)
    setHintOpen(false)
    setConfigFeedback('idle')
    terminalSeq.current = 3
    interventionSeq.current = 1
    syncSelection(nextState, 'pc-lab')
  }

  function resetScenario() {
    if (!resetArmed) {
      setResetArmed(true)
      return
    }
    const nextState = createLabState(scenario.id)
    setLabState(nextState)
    setTerminalLines(initialLines(scenario))
    setCommand('')
    setEvents([])
    setSelectedEventIndex(0)
    setLastCommand('')
    setInterventions([])
    setConfigFeedback('idle')
    setResetArmed(false)
    terminalSeq.current = 3
    interventionSeq.current = 1
    syncSelection(nextState, selectedDeviceId)
  }

  function selectNode(deviceId: string) {
    setSelectedDeviceId(deviceId)
    const device = getDevice(labState, deviceId)
    if (device?.kind === 'pc') {
      setConfigDraft({ ...device.config })
      setTerminalHostId(device.id)
      setConfigFeedback('idle')
    }
  }

  function logIntervention(label: string) {
    setInterventions((current) => [
      ...current,
      { id: interventionSeq.current++, at: nowTime(), label },
    ])
  }

  function appendTerminal(kind: TerminalLine['kind'], text: string, host?: string) {
    setTerminalLines((current) => [
      ...current,
      { id: terminalSeq.current++, kind, text, host, at: nowTime() },
    ])
  }

  function applyPcConfig(event: FormEvent) {
    event.preventDefault()
    if (!selectedDevice || selectedDevice.kind !== 'pc') return
    const result = validatePcConfig(labState, selectedDevice.id, configDraft)
    if (result.errors.length > 0) {
      setConfigFeedback('blocked')
      return
    }
    const nextState = updatePcConfig(labState, selectedDevice.id, configDraft)
    setLabState(nextState)
    setConfigFeedback('saved')
    logIntervention(
      `Configuração de ${selectedDevice.name} aplicada · IP ${configDraft.ip} · GW ${configDraft.gateway || 'vazio'} · DNS ${configDraft.dns}`,
    )
    appendTerminal(
      'system',
      `Configuração aplicada em ${selectedDevice.name}. Execute um teste para verificar o efeito.`,
    )
  }

  function applyVlan(port: SwitchPort, vlan: number) {
    setLabState((current) => updateSwitchPortVlan(current, 'switch', port.id, vlan))
    logIntervention(`Porta ${port.name} reconfigurada para VLAN ${vlan}.`)
    appendTerminal('system', `Switch SW-ACESSO-01: ${port.name} passou para a VLAN ${vlan}.`)
  }

  function executeCommand(event?: FormEvent) {
    event?.preventDefault()
    const raw = command.trim()
    if (!raw || !terminalHost) return
    const result: CommandResult = runTerminalCommand(labState, terminalHost.id, raw)
    if (result.cleared) {
      setTerminalLines([])
      setCommand('')
      setHistory((current) => [...current, raw].slice(-40))
      setHistoryPosition(-1)
      return
    }
    const nextLines: TerminalLine[] = [
      {
        id: terminalSeq.current++,
        kind: 'input',
        text: raw,
        host: terminalHost.name,
        at: nowTime(),
      },
    ]
    if (result.output) {
      nextLines.push({
        id: terminalSeq.current++,
        kind: result.ok ? 'output' : 'error',
        text: result.output,
        at: nowTime(),
      })
    }
    setTerminalLines((current) => [...current, ...nextLines])
    setHistory((current) => [raw, ...current.filter((item) => item !== raw)].slice(0, 40))
    setHistoryPosition(-1)
    setCommand('')
    setEvents(result.events)
    setSelectedEventIndex(0)
    setLastCommand(raw)
    logIntervention(`Teste executado em ${terminalHost.name}: ${raw}`)
    terminalInputRef.current?.focus()
  }

  function handleTerminalKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (history.length === 0) return
      const next = Math.min(historyPosition + 1, history.length - 1)
      setHistoryPosition(next)
      setCommand(history[next] ?? '')
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (historyPosition <= 0) {
        setHistoryPosition(-1)
        setCommand('')
        return
      }
      const next = historyPosition - 1
      setHistoryPosition(next)
      setCommand(history[next] ?? '')
    }
  }

  function applyQuickCommand(value: string) {
    setCommand(value)
    terminalInputRef.current?.focus()
  }

  function activateTerminalHost(hostId: string) {
    const host = getPcs(labState).find((candidate) => candidate.id === hostId)
    if (!host) return
    setTerminalHostId(hostId)
    setSelectedDeviceId(hostId)
    setConfigDraft({ ...host.config })
    appendTerminal('system', `Terminal conectado a ${host.name}.`)
    terminalInputRef.current?.focus()
  }

  const terminalPcs = getPcs(labState)

  return (
    <div className="network-lab">
      <section className="lab-intro" aria-labelledby="network-lab-title">
        <h1 id="network-lab-title" className="text-balance">
          Simulador de rede · Filial Aurora
        </h1>
        <p className="lab-intro__lede">
          Diagnostique quatro falhas em uma rede com VLAN, gateway, DNS e portal. Você inspeciona a
          topologia, testa hipóteses no terminal, corrige a configuração e verifica o resultado no
          mesmo estado simulado.
        </p>
        <dl className="lab-intro__facts">
          <div>
            <dt>Cenários</dt>
            <dd>
              {LAB_SCENARIOS.length} falhas independentes · {completedScenarios} concluídas
            </dd>
          </div>
          <div>
            <dt>Entrega</dt>
            <dd>Diagnóstico justificado e configuração que satisfaça o objetivo do cenário</dd>
          </div>
          <div>
            <dt>Ferramentas</dt>
            <dd>Terminal didático, configuração da estação, VLANs e visualizador de pacotes</dd>
          </div>
        </dl>
        <ol className="lab-intro__steps">
          <li>
            <strong>Inspecione</strong> a topologia e os sinais do cenário.
          </li>
          <li>
            <strong>Teste</strong> no terminal: ping, nslookup, tracert, ipconfig, arp.
          </li>
          <li>
            <strong>Compare</strong> os eventos gerados com a configuração atual.
          </li>
          <li>
            <strong>Corrija</strong> e repita os testes até o objetivo ser verificado.
          </li>
        </ol>
        <div className="lab-intro__actions">
          <a className="button button--primary" href="#cenarios">
            Escolher um cenário
            <ArrowRight size={16} aria-hidden="true" />
          </a>
          <Link className="button button--outline" to="/laboratorios">
            Visão dos laboratórios
          </Link>
        </div>
        <p className="lab-intro__note">
          <TriangleAlert size={15} aria-hidden="true" />
          Nada é executado no seu computador: os comandos são interpretados por um modelo em
          TypeScript. O terminal não acessa rede, arquivos ou processos do sistema operacional.
        </p>
      </section>

      <section className="lab-scenarios" id="cenarios" aria-labelledby="scenarios-title">
        <h2 id="scenarios-title" className="lab-section-title">
          Cenários de diagnóstico
        </h2>
        <div className="scenario-rail">
        {LAB_SCENARIOS.map((item, index) => {
          const done = Boolean(progress.labs[`lab-redes:${item.id}`])
          return (
            <button
              key={item.id}
              type="button"
              className={`scenario-tab ${scenarioId === item.id ? 'is-active' : ''} ${
                done ? 'is-done' : ''
              }`}
              aria-pressed={scenarioId === item.id}
              onClick={() => loadScenario(item.id)}
            >
              <span className="scenario-tab__index mono">
                {done ? <CheckCircle2 size={14} aria-label="concluído" /> : String(index + 1).padStart(2, '0')}
              </span>
              <span className="scenario-tab__copy">
                <span className="scenario-tab__code mono">{item.code}</span>
                <strong>{item.title}</strong>
                <small>
                  {difficultyLabel[item.difficulty]} · {item.minutes} min
                </small>
              </span>
            </button>
          )
        })}
        </div>
      </section>

      <div className="lab-brief">
        <div className="lab-brief__main">
          <div className="lab-brief__top">
            <Tag tone={scenarioDone ? 'green' : 'amber'}>
              {scenarioDone ? (
                <>
                  <CheckCircle2 size={12} aria-hidden="true" /> objetivo verificado
                </>
              ) : (
                'em diagnóstico'
              )}
            </Tag>
          </div>
          <h2>{scenario.title}</h2>
          <p>{scenario.brief}</p>
          <div className="lab-brief__columns">
            <div>
              <span className="label">Sintoma observado</span>
              <p>{scenario.symptom}</p>
            </div>
            <div>
              <span className="label">Objetivo verificável</span>
              <p>{scenario.objective}</p>
            </div>
          </div>
        </div>
        <aside className="lab-brief__aside">
          <div>
            <span className="mono">ESTADO ATUAL</span>
            <ul className="lab-signal-list">
              <li className={reachability.portal.ok ? 'is-ok' : 'is-fail'}>
                {reachability.portal.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                ICMP até o portal
              </li>
              <li className={reachability.dns.ok ? 'is-ok' : 'is-fail'}>
                {reachability.dns.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                Resolução do nome interno
              </li>
              <li className={reachability.duplicate.length === 0 ? 'is-ok' : 'is-fail'}>
                {reachability.duplicate.length === 0 ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                Unicidade do endereço da estação
              </li>
            </ul>
            <p className="lab-signal-note">
              Indicadores derivados do estado. Eles não substituem a leitura da configuração e dos
              testes.
            </p>
          </div>
          <button
            type="button"
            className="button button--quiet button--small"
            aria-expanded={hintOpen}
            onClick={() => setHintOpen((current) => !current)}
          >
            <CircleHelp size={14} aria-hidden="true" />
            {hintOpen ? 'Ocultar pista' : 'Revelar pista'}
            <ChevronDown size={14} className={hintOpen ? 'is-rotated' : ''} aria-hidden="true" />
          </button>
          {hintOpen && <p className="lab-hint">{scenario.hint}</p>}
          {completedRecord && (
            <p className="lab-completed-note">
              Concluído em {formatDateTime(completedRecord.completedAt)}. Você pode refazer o cenário;
              o registro de conclusão permanece.
            </p>
          )}
        </aside>
      </div>

      {scenarioDone && (
        <div className="completion-banner completion-banner--lab" role="status">
          <CheckCircle2 size={20} aria-hidden="true" />
          <div>
            <strong>Objetivo técnico verificado</strong>
            <p>{scenario.successMessage}</p>
          </div>
        </div>
      )}

      <div className="topology-section">
        <div className="topology-toolbar">
          <div>
            <h2>Filial Aurora · segmento didático</h2>
          </div>
          <div className="topology-toolbar__actions">
            <span className="mono topology-legend">
              <span className="legend-swatch legend-swatch--v30" /> VLAN 30
              <span className="legend-swatch legend-swatch--v10" /> VLAN 10
              <span className="legend-swatch legend-swatch--dmz" /> DMZ
            </span>
            <button
              type="button"
              className={`button button--small ${resetArmed ? 'button--danger' : 'button--quiet'}`}
              onClick={resetScenario}
            >
              <RotateCcw size={14} aria-hidden="true" />
              {resetArmed ? 'Confirmar reinício do cenário' : 'Reiniciar estado'}
            </button>
          </div>
        </div>

        <div className="topology-frame">
          <div className="topology-canvas" role="group" aria-label="Topologia interativa da rede didática">
            <svg
              className="topology-links"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {[
                ['pc-lab', 'switch'],
                ['pc-rec', 'switch'],
                ['dns', 'switch'],
                ['switch', 'router'],
                ['router', 'web'],
              ].map(([from, to]) => {
                const source = getDevice(labState, from)
                const target = getDevice(labState, to)
                if (!source || !target) return null
                const highlighted =
                  selectedDeviceId === source.id || selectedDeviceId === target.id
                return (
                  <line
                    key={`${from}-${to}`}
                    x1={source.position.x}
                    y1={source.position.y}
                    x2={target.position.x}
                    y2={target.position.y}
                    className={highlighted ? 'topology-link is-highlighted' : 'topology-link'}
                    vectorEffect="non-scaling-stroke"
                  />
                )
              })}
            </svg>

            {labState.devices.map((device) => {
              const Icon = deviceIcon(device.kind)
              const selected = selectedDeviceId === device.id
              const isTerminal = device.kind === 'pc' && terminalHostId === device.id
              const duplicate =
                (device.kind === 'pc' || device.kind === 'server') &&
                findDuplicatesOf(labState, device.config.ip, device.id).length > 0
              return (
                <button
                  type="button"
                  key={device.id}
                  className={`topology-node topology-node--${device.kind} ${
                    selected ? 'is-selected' : ''
                  } ${duplicate ? 'has-conflict' : ''}`}
                  style={{ left: `${device.position.x}%`, top: `${device.position.y}%` }}
                  aria-pressed={selected}
                  onClick={() => selectNode(device.id)}
                >
                  <span className="topology-node__icon">
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <span className="topology-node__copy">
                    <strong>{device.name}</strong>
                    <small className="mono">{deviceSummary(device)}</small>
                  </span>
                  {isTerminal && (
                    <span className="topology-node__terminal" aria-hidden="true">
                      <Terminal size={11} />
                    </span>
                  )}
                  {duplicate && (
                    <span className="topology-node__alert" title="Conflito de endereço">
                      <TriangleAlert size={13} aria-hidden="true" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <div className="topology-footnote">
            <span>
              <Network size={13} aria-hidden="true" /> Clique em um dispositivo para editar ou inspecionar.
            </span>
            <span className="mono">5 enlaces · 6 dispositivos · dados sintéticos</span>
          </div>
        </div>
      </div>

      <div className="lab-workbench">
        <div className="lab-column">
          <section className="terminal-panel" aria-labelledby="terminal-title">
            <div className="terminal-panel__head">
              <div>
                <span className="terminal-panel__lights" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <div>
                  <strong id="terminal-title">Terminal didático</strong>
                  <span className="mono">passo 2 · testar · estado isolado</span>
                </div>
              </div>
              <div className="terminal-host-switch" role="group" aria-label="Estação conectada ao terminal">
                {terminalPcs.map((pc) => (
                  <button
                    key={pc.id}
                    type="button"
                    className={terminalHostId === pc.id ? 'is-active' : ''}
                    aria-pressed={terminalHostId === pc.id}
                    onClick={() => activateTerminalHost(pc.id)}
                  >
                    {pc.name}
                  </button>
                ))}
              </div>
            </div>

            <div
              className="terminal-body"
              role="log"
              aria-live="polite"
              aria-label="Saída do terminal simulado"
              onClick={() => terminalInputRef.current?.focus()}
            >
              {terminalLines.length === 0 && (
                <p className="terminal-empty">Tela limpa. Digite um comando.</p>
              )}
              {terminalLines.map((line) => (
                <div className={`terminal-line terminal-line--${line.kind}`} key={line.id}>
                  {line.kind === 'input' ? (
                    <>
                      <span className="terminal-prompt">{line.host} {'>'}</span>{' '}
                      <span>{line.text}</span>
                    </>
                  ) : (
                    <pre>{line.text}</pre>
                  )}
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>

            <form className="terminal-input" onSubmit={executeCommand}>
              <label htmlFor="terminal-command" className="sr-only">
                Comando para {terminalHost?.name}
              </label>
              <span className="terminal-prompt" aria-hidden="true">
                {terminalHost?.name} {'>'}
              </span>
              <input
                id="terminal-command"
                ref={terminalInputRef}
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                onKeyDown={handleTerminalKeyDown}
                placeholder="digite help, ping 10.10.50.20, ipconfig…"
                autoComplete="off"
                spellCheck={false}
              />
              <button type="submit" className="button button--primary button--small" disabled={!command.trim()}>
                Executar
              </button>
            </form>

            <div className="terminal-quick">
              <span className="mono">COMANDOS</span>
              {['help', 'ipconfig', 'ping 10.10.50.20', 'nslookup portal.universidade.local', 'tracert 10.10.50.20', 'arp -a', 'netstat -an', 'clear'].map(
                (quick) => (
                  <button
                    key={quick}
                    type="button"
                    className="terminal-chip"
                    onClick={() => applyQuickCommand(quick)}
                  >
                    {quick}
                  </button>
                ),
              )}
            </div>
            <p className="terminal-note">
              <Terminal size={13} aria-hidden="true" /> Histórico com ↑/↓. Comandos disponíveis:
              ping, tracert/traceroute, ipconfig, ip addr, ip route, nslookup/dig, arp, netstat/ss.
            </p>
          </section>

          <section className="work-panel" aria-labelledby="events-title">
            <div className="work-panel__head">
              <div>
                <h2 id="events-title">Eventos da última consulta</h2>
                <p>
                  {lastCommand
                    ? `Comando: ${lastCommand} · ${events.length} ${events.length === 1 ? 'evento' : 'eventos'}`
                    : 'Execute um comando no terminal para gerar eventos.'}
                </p>
              </div>
              <Tag tone="dark">simulado</Tag>
            </div>

            {events.length === 0 ? (
              <div className="events-empty">
                <Waypoints size={26} aria-hidden="true" />
                <p>
                  Nenhum evento para exibir. Um <code>ping</code>, uma consulta <code>nslookup</code>{' '}
                  ou um <code>tracert</code> produzirá pacotes coerentes com o estado atual.
                </p>
              </div>
            ) : (
              <div className="events-workspace">
                <ol className="event-list" aria-label="Eventos de rede gerados">
                  {events.map((event, index) => (
                    <li key={`${event.offsetMs}-${index}`}>
                      <button
                        type="button"
                        className={`event-row ${selectedEventIndex === index ? 'is-selected' : ''}`}
                        aria-pressed={selectedEventIndex === index}
                        onClick={() => setSelectedEventIndex(index)}
                      >
                        <span className="mono event-row__time">+{event.offsetMs} ms</span>
                        <span className={`protocol-badge protocol-badge--${event.protocol.toLowerCase()}`}>
                          {event.protocol}
                        </span>
                        <span className="event-row__flow mono">
                          {event.src} → {event.dst}
                        </span>
                        <span className="event-row__info">{event.info}</span>
                        <span className={`status-text status-text--${event.status}`}>
                          {statusLabel(event.status)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>

                {selectedEvent && (
                  <article className="event-detail">
                    <div className="event-detail__head">
                      <div>
                        <span className="mono">
                          {selectedEvent.protocol} · camada {selectedEvent.layer}
                        </span>
                        <h3>{selectedEvent.info}</h3>
                      </div>
                      <Tag tone={selectedEvent.status === 'ok' ? 'green' : 'rust'}>
                        {statusLabel(selectedEvent.status)}
                      </Tag>
                    </div>
                    <dl className="event-facts">
                      <div>
                        <dt>Origem</dt>
                        <dd className="mono">{selectedEvent.src}</dd>
                      </div>
                      <div>
                        <dt>Destino</dt>
                        <dd className="mono">{selectedEvent.dst}</dd>
                      </div>
                      <div>
                        <dt>Portas</dt>
                        <dd className="mono">
                          {selectedEvent.sourcePort ?? '—'} → {selectedEvent.destPort ?? '—'}
                        </dd>
                      </div>
                      <div>
                        <dt>Tamanho</dt>
                        <dd className="mono">{selectedEvent.length} bytes</dd>
                      </div>
                    </dl>
                    {selectedEvent.path.length > 0 && (
                      <div className="event-path">
                        <span className="label">Caminho modelado</span>
                        <div>
                          {selectedEvent.path.map((deviceId, index) => (
                            <span key={`${deviceId}-${index}`} className="event-path__hop">
                              <span className="mono">{getDevice(labState, deviceId)?.name ?? deviceId}</span>
                              {index < selectedEvent.path.length - 1 && (
                                <ArrowRight size={12} aria-hidden="true" />
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="event-fields">
                      <span className="label">Campos observados</span>
                      <dl>
                        {Object.entries(selectedEvent.fields).map(([label, value]) => (
                          <div key={label}>
                            <dt>{label}</dt>
                            <dd className="mono">{String(value)}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </article>
                )}
              </div>
            )}
          </section>
          <section className="work-panel" aria-labelledby="config-title">
            <div className="work-panel__head">
              <div>
                <h2 id="config-title">{selectedDevice?.name ?? 'Dispositivo'}</h2>
                <p>{selectedDevice?.role}</p>
              </div>
              {selectedDevice && <Tag tone="neutral">{selectedDevice.kind}</Tag>}
            </div>

            {selectedDevice?.kind === 'pc' && (
              <form className="config-form" onSubmit={applyPcConfig}>
                <div className="config-grid">
                  <div className="field">
                    <label htmlFor="pc-ip">Endereço IPv4</label>
                    <input
                      id="pc-ip"
                      value={configDraft.ip}
                      onChange={(event) => {
                        setConfigDraft((current) => ({ ...current, ip: event.target.value }))
                        setConfigFeedback('idle')
                      }}
                      inputMode="decimal"
                      spellCheck={false}
                      placeholder="10.30.4.23"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="pc-mask">Máscara de sub-rede</label>
                    <input
                      id="pc-mask"
                      value={configDraft.mask}
                      onChange={(event) => {
                        setConfigDraft((current) => ({ ...current, mask: event.target.value }))
                        setConfigFeedback('idle')
                      }}
                      inputMode="decimal"
                      spellCheck={false}
                      placeholder="255.255.255.0"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="pc-gateway">Gateway padrão</label>
                    <input
                      id="pc-gateway"
                      value={configDraft.gateway}
                      onChange={(event) => {
                        setConfigDraft((current) => ({ ...current, gateway: event.target.value }))
                        setConfigFeedback('idle')
                      }}
                      inputMode="decimal"
                      spellCheck={false}
                      placeholder="10.30.4.1"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="pc-dns">Servidor DNS</label>
                    <input
                      id="pc-dns"
                      value={configDraft.dns}
                      onChange={(event) => {
                        setConfigDraft((current) => ({ ...current, dns: event.target.value }))
                        setConfigFeedback('idle')
                      }}
                      inputMode="decimal"
                      spellCheck={false}
                      placeholder="10.30.0.10"
                    />
                  </div>
                </div>

                {validation.errors.length > 0 && (
                  <div className="field-feedback field-feedback--error" role="alert">
                    <TriangleAlert size={15} aria-hidden="true" />
                    <ul>
                      {validation.errors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {validation.warnings.length > 0 && (
                  <div className="field-feedback field-feedback--warn">
                    <CircleHelp size={15} aria-hidden="true" />
                    <ul>
                      {validation.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {configFeedback === 'blocked' && (
                  <p className="inline-feedback inline-feedback--warn" role="status">
                    <XCircle size={14} aria-hidden="true" /> Corrija os erros apontados antes de aplicar.
                  </p>
                )}
                {configFeedback === 'saved' && (
                  <p className="inline-feedback inline-feedback--ok" role="status">
                    <CheckCircle2 size={14} aria-hidden="true" /> Configuração aplicada. Teste o efeito no
                    terminal.
                  </p>
                )}

                <div className="config-form__actions">
                  <button type="submit" className="button button--primary">
                    <Play size={15} aria-hidden="true" /> Aplicar configuração
                  </button>
                  <button
                    type="button"
                    className="button button--quiet button--small"
                    onClick={() => {
                      setConfigDraft({ ...selectedDevice.config })
                      setConfigFeedback('idle')
                    }}
                  >
                    Restaurar valores atuais
                  </button>
                </div>
                <p className="config-note">
                  A alteração só entra no estado da topologia ao ser aplicada. O endereço é validado
                  contra máscara, gateway, faixa utilizável e duplicidade.
                </p>
              </form>
            )}

            {selectedDevice?.kind === 'switch' && (
              <div className="device-inspector">
                <p className="device-inspector__intro">
                  Portas de acesso encaminham apenas a VLAN marcada. O trunk carrega as VLANs
                  permitidas para o roteador.
                </p>
                <div className="vlan-table">
                  {accessPorts.map((port) => {
                    const connected = getDevice(labState, port.deviceId)
                    return (
                      <div className="vlan-row" key={port.id}>
                        <div>
                          <strong className="mono">{port.name}</strong>
                          <span>{connected?.name ?? 'sem conexão'}</span>
                        </div>
                        <label>
                          <span className="sr-only">VLAN da porta {port.name}</span>
                          <select
                            value={port.vlan}
                            onChange={(event) => applyVlan(port, Number(event.target.value))}
                          >
                            <option value={10}>VLAN 10 · serviços</option>
                            <option value={20}>VLAN 20 · manutenção</option>
                            <option value={30}>VLAN 30 · laboratórios</option>
                            <option value={50}>VLAN 50 · laboratório 1</option>
                          </select>
                        </label>
                      </div>
                    )
                  })}
                  {getSwitch(labState)
                    .ports.filter((port) => port.mode === 'trunk')
                    .map((port) => (
                      <div className="vlan-row vlan-row--trunk" key={port.id}>
                        <div>
                          <strong className="mono">{port.name}</strong>
                          <span>trunk · {getDevice(labState, port.deviceId)?.name}</span>
                        </div>
                        <span className="mono">VLANs {port.allowedVlans?.join(', ') || '—'}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {selectedDevice?.kind === 'router' && (
              <div className="device-inspector">
                <span className="label">Interfaces</span>
                <div className="table-wrap">
                  <table className="data-table data-table--compact">
                    <thead>
                      <tr>
                        <th scope="col">Interface</th>
                        <th scope="col">Endereço</th>
                        <th scope="col">VLAN</th>
                        <th scope="col">Descrição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDevice.interfaces.map((iface) => (
                        <tr key={iface.id}>
                          <td className="mono">{iface.name}</td>
                          <td className="mono">
                            {iface.ip}/{maskPrefix(iface.mask)}
                          </td>
                          <td>{iface.vlan ?? '—'}</td>
                          <td>{iface.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <span className="label">ACL de entrada — primeira regra compatível vence</span>
                <ol className="acl-list">
                  {[...selectedDevice.acl]
                    .sort((a, b) => a.sequence - b.sequence)
                    .map((rule) => (
                      <li key={rule.id}>
                        <span className="mono">{rule.sequence}</span>
                        <Tag tone={rule.action === 'permit' ? 'green' : 'rust'}>{rule.action}</Tag>
                        <span className="mono">
                          {rule.protocol} · {rule.destination}
                          {rule.port ? `:${rule.port}` : ''}
                        </span>
                        <span>{rule.description}</span>
                      </li>
                    ))}
                </ol>
              </div>
            )}

            {selectedDevice?.kind === 'server' && (
              <div className="device-inspector">
                <dl className="device-facts">
                  <div>
                    <dt>Endereço IPv4</dt>
                    <dd className="mono">
                      {selectedDevice.config.ip}/{maskPrefix(selectedDevice.config.mask)}
                    </dd>
                  </div>
                  <div>
                    <dt>Gateway</dt>
                    <dd className="mono">{selectedDevice.config.gateway}</dd>
                  </div>
                  <div>
                    <dt>Serviços</dt>
                    <dd>
                      {selectedDevice.config.services.dns ? 'DNS' : ''}
                      {selectedDevice.config.services.dns && selectedDevice.config.services.https ? ' · ' : ''}
                      {selectedDevice.config.services.https ? 'HTTPS' : ''}
                    </dd>
                  </div>
                  <div>
                    <dt>Endereço físico</dt>
                    <dd className="mono">{selectedDevice.mac}</dd>
                  </div>
                </dl>
                {selectedDevice.config.dnsRecords && (
                  <>
                    <span className="label">Zona DNS interna</span>
                    <ul className="dns-zone-list">
                      {selectedDevice.config.dnsRecords.map((record) => (
                        <li key={record.name}>
                          <span className="mono">{record.name}</span>
                          <span className="mono">{record.ip}</span>
                          <Tag tone="neutral">{record.type}</Tag>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="device-inspector__intro">
                  Esta visão é somente leitura. A configuração do servidor não é alterada pelos
                  cenários desta versão.
                </p>
              </div>
            )}
          </section>

        </div>

        <div className="lab-column">
          <section className="work-panel work-panel--log" aria-labelledby="log-title">
            <div className="work-panel__head">
              <div>
                <h2 id="log-title">Registro de intervenções</h2>
                <p>Alterações e testes desta sessão, em ordem cronológica.</p>
              </div>
              <span className="mono">{interventions.length}</span>
            </div>
            {interventions.length === 0 ? (
              <p className="intervention-empty">
                Nenhuma alteração registrada. Aplicar configuração, mudar VLAN ou executar um teste
                cria uma entrada com horário.
              </p>
            ) : (
              <ol className="intervention-list">
                {[...interventions].reverse().map((item) => (
                  <li key={item.id}>
                    <time className="mono">{item.at}</time>
                    <p>{item.label}</p>
                  </li>
                ))}
              </ol>
            )}
            <p className="intervention-note">
              O registro é local e pertence a esta sessão do laboratório. Ele não é um laudo nem
              substitui documentação de um ambiente real.
            </p>
          </section>

          <Callout tone="limite" title="O que este simulador não faz">
            <p>
              Não abre conexões, não captura tráfego real, não importa PCAP e não representa toda a
              complexidade de um sistema operacional. As ACLs, rotas e respostas DNS são regras
              didáticas explícitas no código.
            </p>
          </Callout>

          <div className="inline-actions">
            <Link className="text-link" to="/laboratorio/trafego">
              Analisar uma captura sintética <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <Link className="text-link" to="/casos">
              Aplicar em um caso pericial <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function maskPrefix(mask: string): string {
  const octets = mask.split('.').map(Number)
  if (octets.length !== 4 || octets.some((octet) => Number.isNaN(octet))) return '?'
  const bits = octets
    .map((octet) => octet.toString(2).padStart(8, '0'))
    .join('')
    .replace(/0+$/, '').length
  return String(bits)
}
