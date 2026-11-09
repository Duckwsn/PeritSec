import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  Hash,
  KeyRound,
  Lock,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useProgress } from '../context/ProgressContext'
import { accessForContent, nextActivity } from '../lib/progression'
import { useEnterContent } from '../hooks/useEnterContent'
import { ContentGate } from '../components/ContentGate'
import { Callout, PageHeader, Tag } from '../components/ui'
import {
  base64Decode,
  base64Encode,
  caesarCandidates,
  caesarShift,
  letterFrequency,
  sha256Hex,
  utf8Bytes,
  vigenereTransform,
} from '../lib/crypto'
import { formatDateTime } from '../lib/progress'

type ToolId = 'cesar' | 'vigenere' | 'base64' | 'hash'

const CHALLENGE_PLAINTEXT = 'A integridade sustenta a conclusão'
const CHALLENGE_SHIFT = 11
const CHALLENGE_INNER = caesarShift(CHALLENGE_PLAINTEXT, CHALLENGE_SHIFT)
const CHALLENGE_CIPHERTEXT = base64Encode(CHALLENGE_INNER)
const INTEGRITY_ORIGINAL =
  'Extrato E-99 — 14/09/2026 08:05:58 — origem 10.30.4.23 — resolvedor 8.8.8.8'
const INTEGRITY_ALTERED =
  'Extrato E-99 — 14/09/2026 08:05:58 — origem 10.30.4.23 — resolvedor 10.30.0.10'
const INTEGRITY_HASH = sha256Hex(INTEGRITY_ORIGINAL)

const tools: Array<{ id: ToolId; label: string; note: string; icon: typeof KeyRound }> = [
  { id: 'cesar', label: 'César', note: 'deslocamento simples', icon: KeyRound },
  { id: 'vigenere', label: 'Vigenère', note: 'chave repetida', icon: Lock },
  { id: 'base64', label: 'Base64', note: 'codificação, não cifra', icon: ArrowRight },
  { id: 'hash', label: 'SHA-256', note: 'integridade', icon: Hash },
]

function normalizeAnswer(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function copyStatusLabel(status: 'idle' | 'ok' | 'error'): string {
  if (status === 'ok') return 'Hash copiado.'
  if (status === 'error') return 'Não foi possível copiar. Selecione o hash manualmente.'
  return ''
}

export function CryptoLabPage() {
  const { account, isAdmin } = useAuth()
  const { progress } = useProgress()
  const access = account
    ? accessForContent('lab-cripto', account.expertise, progress, { admin: isAdmin })
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
  return <CryptoLabExperience />
}

function CryptoLabExperience() {
  const { progress, completeLab } = useProgress()
  const [activeTool, setActiveTool] = useState<ToolId>('cesar')

  const [cesarInput, setCesarInput] = useState('PHQVDJHP')
  const [cesarShiftValue, setCesarShiftValue] = useState('3')
  const [cesarDirection, setCesarDirection] = useState<'decode' | 'encode'>('decode')

  const [vigenereInput, setVigenereInput] = useState('MENSAGEM DE TESTE')
  const [vigenereKey, setVigenereKey] = useState('CHAVE')
  const [vigenereDirection, setVigenereDirection] = useState<1 | -1>(1)

  const [base64Input, setBase64Input] = useState('Evidência sintética: integridade verificável.')
  const [base64Mode, setBase64Mode] = useState<'encode' | 'decode'>('encode')

  const hashDefault = 'Extrato sintético — caso 2026-014.'
  const [hashInput, setHashInput] = useState(hashDefault)
  const [referenceHash, setReferenceHash] = useState(sha256Hex(hashDefault))
  const [copyStatus, setCopyStatus] = useState<'idle' | 'ok' | 'error'>('idle')

  const [challengeAnswers, setChallengeAnswers] = useState({
    outer: '',
    shift: '',
    plaintext: '',
    integrity: '',
  })
  const [challengeChecked, setChallengeChecked] = useState(false)
  const [challengeResults, setChallengeResults] = useState<Record<string, boolean>>({})
  const [challengeNotice, setChallengeNotice] = useState('')
  const [hintOpen, setHintOpen] = useState(false)

  const completedRecord = progress.labs['lab-cripto']

  const cesarShiftNumber = Math.max(0, Math.min(25, Number(cesarShiftValue) || 0))
  const cesarOutput = useMemo(
    () => caesarShift(cesarInput, cesarDirection === 'decode' ? -cesarShiftNumber : cesarShiftNumber),
    [cesarInput, cesarDirection, cesarShiftNumber],
  )
  const candidates = useMemo(() => caesarCandidates(cesarInput), [cesarInput])
  const frequencies = useMemo(() => letterFrequency(cesarInput).slice(0, 6), [cesarInput])

  const vigenere = useMemo(() => {
    try {
      return {
        output: vigenereTransform(vigenereInput, vigenereKey, vigenereDirection),
        error: '',
      }
    } catch (error) {
      return {
        output: '',
        error: error instanceof Error ? error.message : 'Não foi possível aplicar a cifra.',
      }
    }
  }, [vigenereInput, vigenereKey, vigenereDirection])

  const base64 = useMemo(() => {
    try {
      return {
        output:
          base64Mode === 'encode' ? base64Encode(base64Input) : base64Decode(base64Input),
        error: '',
      }
    } catch (error) {
      return {
        output: '',
        error: error instanceof Error ? error.message : 'Entrada inválida.',
      }
    }
  }, [base64Input, base64Mode])

  const hashValue = useMemo(() => sha256Hex(hashInput), [hashInput])
  const hashBytes = useMemo(() => utf8Bytes(hashInput).length, [hashInput])
  const normalizedReference = referenceHash.trim().toLowerCase()
  const referenceValid = /^[a-f0-9]{64}$/.test(normalizedReference)
  const hashStatus: 'empty' | 'invalid' | 'match' | 'mismatch' = !normalizedReference
    ? 'empty'
    : !referenceValid
      ? 'invalid'
      : normalizedReference === hashValue
        ? 'match'
        : 'mismatch'

  const correctChallengeCount = Object.values(challengeResults).filter(Boolean).length
  const challengePassed =
    challengeChecked &&
    ['outer', 'shift', 'plaintext', 'integrity'].every(
      (key) => challengeResults[key] === true,
    )

  useEffect(() => {
    if (!challengePassed || completedRecord) return
    completeLab({
      labId: 'lab-cripto',
      competency: 'cripto',
      score: 100,
      label: 'Laboratório de criptografia · mensagem em camadas',
    })
  }, [challengePassed, completedRecord, completeLab])

  function useChallengeInDecoder() {
    setActiveTool('base64')
    setBase64Mode('decode')
    setBase64Input(CHALLENGE_CIPHERTEXT)
    setCopyStatus('idle')
  }

  function sendBase64OutputToCaesar() {
    if (!base64.output) return
    setCesarInput(base64.output)
    setCesarDirection('decode')
    setCesarShiftValue('0')
    setActiveTool('cesar')
  }

  function updateChallengeAnswer(key: keyof typeof challengeAnswers, value: string) {
    setChallengeAnswers((current) => ({ ...current, [key]: value }))
    setChallengeChecked(false)
    setChallengeResults({})
    setChallengeNotice('')
  }

  function verifyChallenge() {
    const missing = [
      !challengeAnswers.outer,
      !challengeAnswers.shift.trim(),
      !challengeAnswers.plaintext.trim(),
      !challengeAnswers.integrity,
    ].filter(Boolean).length
    if (missing > 0) {
      setChallengeNotice(
        `Responda ${missing === 1 ? 'à questão pendente' : `às ${missing} questões pendentes`} antes de verificar.`,
      )
      return
    }
    const nextResults = {
      outer: challengeAnswers.outer === 'base64',
      shift: Number(challengeAnswers.shift.trim()) === CHALLENGE_SHIFT,
      plaintext: normalizeAnswer(challengeAnswers.plaintext) === normalizeAnswer(CHALLENGE_PLAINTEXT),
      integrity: challengeAnswers.integrity === 'original',
    }
    setChallengeResults(nextResults)
    setChallengeChecked(true)
    setChallengeNotice('')
  }

  function resetChallenge() {
    setChallengeAnswers({ outer: '', shift: '', plaintext: '', integrity: '' })
    setChallengeChecked(false)
    setChallengeResults({})
    setChallengeNotice('')
    setHintOpen(false)
  }

  async function copyHash() {
    try {
      await navigator.clipboard.writeText(hashValue)
      setCopyStatus('ok')
    } catch {
      setCopyStatus('error')
    }
  }

  return (
    <div className="crypto-lab">
      <PageHeader
        title="Codificação, cifra e verificação de integridade."
        lede="Use ferramentas que calculam de fato César, Vigenère, Base64 e SHA-256. Depois, recupere uma mensagem em camadas e verifique a integridade de um extrato. Nenhum resultado é encenado."
        meta={
          <>
            <span className="meta-item">
              <ShieldCheck size={14} aria-hidden="true" /> SHA-256 verificável
            </span>
            <span className="meta-item">
              <Hash size={14} aria-hidden="true" /> cálculo local no navegador
            </span>
            <span className="meta-item">
              <Lock size={14} aria-hidden="true" /> sem quebra de criptografia moderna
            </span>
          </>
        }
        actions={
          <Link className="button button--outline" to="/casos">
            Ver integridade no caso <ArrowRight size={14} aria-hidden="true" />
          </Link>
        }
      />

      <div className="simulation-banner simulation-banner--crypto" role="note">
        <Lock size={18} aria-hidden="true" />
        <p>
          <strong>Ferramentas reais, escopo didático.</strong> As transformações são calculadas no seu
          navegador. Uma codificação reversível ou uma cifra clássica não representam a segurança de
          algoritmos modernos.
        </p>
        <Tag tone="dark">determinístico</Tag>
      </div>

      <section className="crypto-tools" aria-labelledby="tools-title">
        <div className="crypto-tools__head">
          <div>
            <h2 id="tools-title">Ferramentas de cálculo</h2>
            <p>Escolha uma ferramenta. As saídas reagem imediatamente à entrada.</p>
          </div>
          <Tag tone="neutral">entrada → operação → saída</Tag>
        </div>

        <div className="tool-tabs" role="group" aria-label="Ferramentas de criptografia">
          {tools.map((tool) => {
            const Icon = tool.icon
            return (
              <button
                key={tool.id}
                type="button"
                aria-pressed={activeTool === tool.id}
                className={`tool-tab ${activeTool === tool.id ? 'is-active' : ''}`}
                onClick={() => setActiveTool(tool.id)}
              >
                <Icon size={16} aria-hidden="true" />
                <span>
                  <strong>{tool.label}</strong>
                  <small>{tool.note}</small>
                </span>
              </button>
            )
          })}
        </div>

        <div className="tool-panel" aria-label={`Ferramenta ${activeTool}`}>
          {activeTool === 'cesar' && (
            <div className="tool-grid">
              <div className="tool-inputs">
                <div className="field">
                  <label htmlFor="cesar-input">Texto de entrada</label>
                  <textarea
                    id="cesar-input"
                    value={cesarInput}
                    onChange={(event) => setCesarInput(event.target.value)}
                    rows={4}
                    spellCheck={false}
                  />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="cesar-shift">Deslocamento (0–25)</label>
                    <input
                      id="cesar-shift"
                      type="number"
                      min={0}
                      max={25}
                      value={cesarShiftValue}
                      onChange={(event) => setCesarShiftValue(event.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="cesar-direction">Operação</label>
                    <select
                      id="cesar-direction"
                      value={cesarDirection}
                      onChange={(event) =>
                        setCesarDirection(event.target.value as 'decode' | 'encode')
                      }
                    >
                      <option value="decode">Decifrar (deslocar para trás)</option>
                      <option value="encode">Cifrar (deslocar para frente)</option>
                    </select>
                  </div>
                </div>
                <div className="tool-note">
                  <KeyRound size={14} aria-hidden="true" />
                  <p>
                    César preserva o formato e tem apenas 26 chaves. A lista abaixo mostra todas as
                    leituras possíveis — por isso nunca deve ser tratada como segurança.
                  </p>
                </div>
              </div>
              <div className="tool-output">
                <span className="label">Saída</span>
                <output className="output-box mono">{cesarOutput || '—'}</output>
                <div className="frequency-panel">
                  <span className="label">Frequência das letras na entrada</span>
                  {frequencies.length === 0 ? (
                    <p className="muted">Sem letras A–Z na entrada.</p>
                  ) : (
                    <ul className="frequency-list">
                      {frequencies.map((item) => (
                        <li key={item.letter}>
                          <span className="mono">{item.letter}</span>
                          <span className="frequency-bar">
                            <i style={{ width: `${Math.min(100, item.percent)}%` }} />
                          </span>
                          <span className="mono">
                            {item.count} · {item.percent.toFixed(1)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="candidates-block">
                <span className="label">Todas as leituras para deslocamentos de 0 a 25</span>
                <ol className="candidate-list">
                  {candidates.map((candidate) => (
                    <li key={candidate.shift}>
                      <span className="mono">-{candidate.shift}</span>
                      <span className="mono">{candidate.text || '—'}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {activeTool === 'vigenere' && (
            <div className="tool-grid">
              <div className="tool-inputs">
                <div className="field">
                  <label htmlFor="vigenere-input">Texto de entrada</label>
                  <textarea
                    id="vigenere-input"
                    value={vigenereInput}
                    onChange={(event) => setVigenereInput(event.target.value)}
                    rows={4}
                    spellCheck={false}
                  />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="vigenere-key">Chave alfabética</label>
                    <input
                      id="vigenere-key"
                      value={vigenereKey}
                      onChange={(event) => setVigenereKey(event.target.value)}
                      spellCheck={false}
                      autoComplete="off"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="vigenere-direction">Operação</label>
                    <select
                      id="vigenere-direction"
                      value={String(vigenereDirection)}
                      onChange={(event) =>
                        setVigenereDirection(event.target.value === '-1' ? -1 : 1)
                      }
                    >
                      <option value="1">Cifrar</option>
                      <option value="-1">Decifrar</option>
                    </select>
                  </div>
                </div>
                <div className="tool-note">
                  <Lock size={14} aria-hidden="true" />
                  <p>
                    A chave é repetida sobre as letras. Ataques de análise de frequência e de
                    repetição de chave tornam essa cifra inadequada para proteção real.
                  </p>
                </div>
              </div>
              <div className="tool-output">
                <span className="label">Saída</span>
                {vigenere.error ? (
                  <div className="tool-error" role="alert">
                    <TriangleAlert size={15} aria-hidden="true" /> {vigenere.error}
                  </div>
                ) : (
                  <output className="output-box mono">{vigenere.output || '—'}</output>
                )}
                <div className="tool-note tool-note--quiet">
                  <p>
                    Apenas letras A–Z participam da transformação; espaços, números e pontuação são
                    preservados.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTool === 'base64' && (
            <div className="tool-grid">
              <div className="tool-inputs">
                <div className="field">
                  <label htmlFor="base64-mode">Operação</label>
                  <select
                    id="base64-mode"
                    value={base64Mode}
                    onChange={(event) =>
                      setBase64Mode(event.target.value as 'encode' | 'decode')
                    }
                  >
                    <option value="encode">Codificar texto em Base64</option>
                    <option value="decode">Decodificar Base64 em texto</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="base64-input">Entrada</label>
                  <textarea
                    id="base64-input"
                    value={base64Input}
                    onChange={(event) => setBase64Input(event.target.value)}
                    rows={6}
                    spellCheck={false}
                  />
                </div>
                <div className="tool-note">
                  <ArrowRight size={14} aria-hidden="true" />
                  <p>
                    Base64 é uma representação de bytes. Decodificar não exige chave e não revela uma
                    mensagem protegida por criptografia. Se a saída não for UTF-8 válido, a ferramenta
                    informa o erro.
                  </p>
                </div>
              </div>
              <div className="tool-output">
                <span className="label">Saída</span>
                {base64.error ? (
                  <div className="tool-error" role="alert">
                    <TriangleAlert size={15} aria-hidden="true" /> {base64.error}
                  </div>
                ) : (
                  <output className="output-box output-box--tall mono">{base64.output || '—'}</output>
                )}
                {base64Mode === 'decode' && base64.output && (
                  <button
                    type="button"
                    className="button button--outline button--small"
                    onClick={sendBase64OutputToCaesar}
                  >
                    Testar a saída com César <ArrowRight size={14} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTool === 'hash' && (
            <div className="tool-grid">
              <div className="tool-inputs">
                <div className="field">
                  <label htmlFor="hash-input">Conteúdo para calcular</label>
                  <textarea
                    id="hash-input"
                    value={hashInput}
                    onChange={(event) => {
                      setHashInput(event.target.value)
                      setCopyStatus('idle')
                    }}
                    rows={6}
                    spellCheck={false}
                  />
                </div>
                <div className="field">
                  <label htmlFor="hash-reference">Hash SHA-256 de referência</label>
                  <input
                    id="hash-reference"
                    value={referenceHash}
                    onChange={(event) => setReferenceHash(event.target.value)}
                    spellCheck={false}
                    autoComplete="off"
                    className="mono"
                  />
                </div>
                <div className={`hash-status hash-status--${hashStatus}`} role="status">
                  {hashStatus === 'empty' && (
                    <>
                      <Hash size={15} aria-hidden="true" /> Informe um hash de referência para
                      comparar.
                    </>
                  )}
                  {hashStatus === 'invalid' && (
                    <>
                      <TriangleAlert size={15} aria-hidden="true" /> O hash deve ter exatamente 64
                      caracteres hexadecimais.
                    </>
                  )}
                  {hashStatus === 'match' && (
                    <>
                      <CheckCircle2 size={15} aria-hidden="true" /> O conteúdo produz exatamente o
                      hash informado.
                    </>
                  )}
                  {hashStatus === 'mismatch' && (
                    <>
                      <TriangleAlert size={15} aria-hidden="true" /> O hash não corresponde ao
                      conteúdo atual.
                    </>
                  )}
                </div>
              </div>
              <div className="tool-output">
                <span className="label">SHA-256 calculado</span>
                <output className="output-box output-box--hash mono">{hashValue}</output>
                <dl className="hash-facts">
                  <div>
                    <dt>Bytes UTF-8</dt>
                    <dd className="mono">{hashBytes}</dd>
                  </div>
                  <div>
                    <dt>Tamanho do digest</dt>
                    <dd className="mono">256 bits</dd>
                  </div>
                  <div>
                    <dt>Saída</dt>
                    <dd className="mono">64 caracteres hex</dd>
                  </div>
                </dl>
                <button type="button" className="button button--quiet button--small" onClick={copyHash}>
                  <Copy size={14} aria-hidden="true" /> Copiar hash
                </button>
                {copyStatus !== 'idle' && (
                  <p
                    className={`inline-feedback ${
                      copyStatus === 'ok' ? 'inline-feedback--ok' : 'inline-feedback--warn'
                    }`}
                    role="status"
                  >
                    {copyStatusLabel(copyStatus)}
                  </p>
                )}
                <div className="tool-note tool-note--quiet">
                  <p>
                    O SHA-256 produz um resumo de 256 bits. Ele detecta alteração no conteúdo, mas não
                    prova autoria, origem ou autenticidade. Um hash fornecido junto com o arquivo pode
                    ter sido alterado em conjunto.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="challenge-section challenge-section--crypto" aria-labelledby="crypto-challenge-title">
        <div className="challenge-head">
          <div>
            <h2 id="crypto-challenge-title">A mensagem em camadas</h2>
            <p>
              Um extrato de treinamento chegou em duas camadas e um hash de referência acompanha uma
              cópia. Use as ferramentas acima e registre o que conseguiu demonstrar.
            </p>
          </div>
          <div className="challenge-score" aria-live="polite">
            <strong className="mono">{correctChallengeCount}</strong>
            <span>/ 4 evidências de compreensão</span>
          </div>
        </div>

        {completedRecord && (
          <div className="completion-banner completion-banner--lab" role="status">
            <CheckCircle2 size={20} aria-hidden="true" />
            <div>
              <strong>Laboratório concluído</strong>
              <p>
                Registro local em {formatDateTime(completedRecord.completedAt)}. Refazer o desafio não
                apaga esta conclusão.
              </p>
            </div>
          </div>
        )}

        <div className="crypto-challenge-layout">
          <div className="crypto-brief">
            <span className="label">Mensagem recebida</span>
            <code className="challenge-cipher">{CHALLENGE_CIPHERTEXT}</code>
            <div className="button-row">
              <button type="button" className="button button--outline button--small" onClick={useChallengeInDecoder}>
                Abrir no decodificador Base64 <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              className="hint-toggle"
              aria-expanded={hintOpen}
              onClick={() => setHintOpen((current) => !current)}
            >
              {hintOpen ? 'Ocultar orientação' : 'Ver orientação de método'}
            </button>
            {hintOpen && (
              <p className="challenge-hint">
                Decodifique a camada externa, envie a saída para a ferramenta César e procure uma
                leitura coerente entre as 26 possibilidades. Para a etapa de integridade, calcule o
                SHA-256 dos dois extratos e compare com a referência. Não presuma que o hash exibido é
                autêntico sem verificar sua origem.
              </p>
            )}
            <div className="challenge-integrity">
              <span className="label">Hash de referência do extrato íntegro</span>
              <code className="mono">{INTEGRITY_HASH}</code>
              <p>
                O hash acompanha o extrato, mas sua origem também precisa ser documentada. Integridade
                não é o mesmo que autenticidade.
              </p>
            </div>
          </div>

          <div className="crypto-questions">
            <article className={`challenge-card ${challengeResults.outer ? 'is-correct' : ''}`}>
              <div className="challenge-card__head">
                <span className="challenge-card__index mono">1</span>
                <p>Qual transformação produziu a camada externa da mensagem?</p>
              </div>
              <fieldset className="choice-list">
                <legend className="sr-only">Camada externa</legend>
                {[
                  { id: 'base64', label: 'Base64 — codificação reversível' },
                  { id: 'cesar', label: 'Cifra de César' },
                  { id: 'vigenere', label: 'Cifra de Vigenère' },
                  { id: 'hash', label: 'SHA-256' },
                ].map((choice) => (
                  <label
                    key={choice.id}
                    className={`choice-row ${
                      challengeAnswers.outer === choice.id ? 'is-selected' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="challenge-outer"
                      value={choice.id}
                      checked={challengeAnswers.outer === choice.id}
                      onChange={() => updateChallengeAnswer('outer', choice.id)}
                    />
                    <span>{choice.label}</span>
                  </label>
                ))}
              </fieldset>
            </article>

            <article className={`challenge-card ${challengeResults.shift ? 'is-correct' : ''}`}>
              <div className="challenge-card__head">
                <span className="challenge-card__index mono">2</span>
                <p>Qual deslocamento de César foi usado na camada interna?</p>
              </div>
              <div className="field field--compact">
                <label htmlFor="challenge-shift">Deslocamento numérico</label>
                <input
                  id="challenge-shift"
                  type="number"
                  min={0}
                  max={25}
                  value={challengeAnswers.shift}
                  onChange={(event) => updateChallengeAnswer('shift', event.target.value)}
                  placeholder="0–25"
                />
              </div>
            </article>

            <article className={`challenge-card ${challengeResults.plaintext ? 'is-correct' : ''}`}>
              <div className="challenge-card__head">
                <span className="challenge-card__index mono">3</span>
                <p>Qual é o texto original depois de reverter as duas camadas?</p>
              </div>
              <div className="field field--compact">
                <label htmlFor="challenge-plaintext">Texto recuperado</label>
                <input
                  id="challenge-plaintext"
                  value={challengeAnswers.plaintext}
                  onChange={(event) => updateChallengeAnswer('plaintext', event.target.value)}
                  placeholder="Digite a frase completa"
                  spellCheck={false}
                />
              </div>
            </article>

            <article className={`challenge-card ${challengeResults.integrity ? 'is-correct' : ''}`}>
              <div className="challenge-card__head">
                <span className="challenge-card__index mono">4</span>
                <p>Qual extrato corresponde ao hash de referência?</p>
              </div>
              <fieldset className="choice-list">
                <legend className="sr-only">Extrato íntegro</legend>
                <label
                  className={`choice-row choice-row--stacked ${
                    challengeAnswers.integrity === 'original' ? 'is-selected' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="challenge-integrity"
                    value="original"
                    checked={challengeAnswers.integrity === 'original'}
                    onChange={() => updateChallengeAnswer('integrity', 'original')}
                  />
                  <span className="mono">{INTEGRITY_ORIGINAL}</span>
                </label>
                <label
                  className={`choice-row choice-row--stacked ${
                    challengeAnswers.integrity === 'altered' ? 'is-selected' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="challenge-integrity"
                    value="altered"
                    checked={challengeAnswers.integrity === 'altered'}
                    onChange={() => updateChallengeAnswer('integrity', 'altered')}
                  />
                  <span className="mono">{INTEGRITY_ALTERED}</span>
                </label>
              </fieldset>
              <p className="challenge-microcopy">
                Dica de método: use a ferramenta SHA-256 com cada extrato. O hash de referência está
                no painel ao lado.
              </p>
            </article>
          </div>
        </div>

        {challengeChecked && (
          <div className="challenge-results" aria-live="polite">
            {challengePassed ? (
              <div className="challenge-feedback challenge-feedback--ok">
                <strong>As quatro etapas estão corretas.</strong>
                <p>
                  A mensagem original é “{CHALLENGE_PLAINTEXT}”. A camada externa era Base64, a interna
                  usava César com deslocamento {CHALLENGE_SHIFT}, e o extrato íntegro é o que usa o
                  resolvedor 8.8.8.8. A verificação de hash só demonstra que o conteúdo não mudou em
                  relação ao digest comparado.
                </p>
              </div>
            ) : (
              <div className="challenge-feedback challenge-feedback--no">
                <strong>Há etapas para revisar.</strong>
                <p>
                  Use as ferramentas e confira a saída de cada camada. O hash de referência não
                  “descriptografa” nada: ele apenas permite comparar integridade.
                </p>
              </div>
            )}
          </div>
        )}

        {challengeNotice && (
          <p className="inline-feedback inline-feedback--warn" role="status">
            <TriangleAlert size={14} aria-hidden="true" /> {challengeNotice}
          </p>
        )}

        <div className="challenge-actions">
          <button type="button" className="button button--primary" onClick={verifyChallenge}>
            Verificar as quatro etapas <ArrowRight size={15} aria-hidden="true" />
          </button>
          <button type="button" className="button button--quiet button--small" onClick={resetChallenge}>
            <RotateCcw size={14} aria-hidden="true" /> Refazer desafio
          </button>
          {challengePassed && (
            <p className="inline-feedback inline-feedback--ok" role="status">
              <CheckCircle2 size={14} aria-hidden="true" /> Objetivo do laboratório verificado.
            </p>
          )}
        </div>
      </section>

      <Callout tone="limite" title="Limite do laboratório">
        <p>
          César, Vigenère e Base64 são usados para ensinar transformações e diagnóstico de camadas.
          Não há quebra de criptografia moderna, recuperação de senhas reais ou promessa de anonimato.
          SHA-256 verifica integridade quando o digest de referência é confiável; ele não autentica
          sozinho a origem de um arquivo.
        </p>
      </Callout>

      <div className="inline-actions">
        <Link className="text-link" to="/laboratorio/trafego">
          Voltar à análise de tráfego <ArrowLeft size={14} aria-hidden="true" />
        </Link>
        <Link className="text-link" to="/casos">
          Aplicar hashing no caso pericial <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
