import type { ContentBlock } from '../data/courses'
import { Callout, InlineText } from './ui'

function EncapsulationFigure() {
  return (
    <div
      className="encap-figure"
      role="img"
      aria-label="Diagrama de encapsulamento: dados da aplicação recebem cabeçalhos TCP, IP e Ethernet até virarem bits no meio físico."
    >
      <div className="encap-row">
        <span className="encap-row__layer">Aplicação</span>
        <div className="encap-packet">
          <span className="encap-chunk encap-chunk--app">DADOS · HTTP</span>
        </div>
      </div>
      <div className="encap-row">
        <span className="encap-row__layer">Transporte</span>
        <div className="encap-packet">
          <span className="encap-chunk encap-chunk--tcp">TCP</span>
          <span className="encap-chunk encap-chunk--app">DADOS</span>
        </div>
      </div>
      <div className="encap-row">
        <span className="encap-row__layer">Rede</span>
        <div className="encap-packet">
          <span className="encap-chunk encap-chunk--ip">IP</span>
          <span className="encap-chunk encap-chunk--tcp">TCP</span>
          <span className="encap-chunk encap-chunk--app">DADOS</span>
        </div>
      </div>
      <div className="encap-row">
        <span className="encap-row__layer">Enlace</span>
        <div className="encap-packet">
          <span className="encap-chunk encap-chunk--eth">ETH</span>
          <span className="encap-chunk encap-chunk--ip">IP</span>
          <span className="encap-chunk encap-chunk--tcp">TCP</span>
          <span className="encap-chunk encap-chunk--app">DADOS</span>
        </div>
      </div>
      <div className="encap-row">
        <span className="encap-row__layer">Física</span>
        <div className="encap-bits mono">01001010 11010001 01101001 …</div>
      </div>
      <div className="encap-legend">
        <span><i className="swatch swatch--eth" /> Enlace</span>
        <span><i className="swatch swatch--ip" /> Rede</span>
        <span><i className="swatch swatch--tcp" /> Transporte</span>
        <span><i className="swatch swatch--app" /> Aplicação</span>
      </div>
    </div>
  )
}

function HandshakeFigure() {
  return (
    <svg
      className="diagram-svg"
      viewBox="0 0 640 270"
      role="img"
      aria-label="Handshake TCP de três vias: SYN do cliente, SYN-ACK do servidor e ACK do cliente, seguido da requisição HTTPS."
    >
      <defs>
        <marker id="arrow-teal" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L7,3 z" fill="var(--teal)" />
        </marker>
        <marker id="arrow-ink" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L7,3 z" fill="var(--ink-soft)" />
        </marker>
      </defs>
      <rect x="1" y="1" width="638" height="268" fill="var(--paper-raised)" stroke="var(--line)" />
      <line x1="120" y1="46" x2="120" y2="245" stroke="var(--line-strong)" strokeDasharray="4 4" />
      <line x1="520" y1="46" x2="520" y2="245" stroke="var(--line-strong)" strokeDasharray="4 4" />
      <text x="120" y="32" textAnchor="middle" className="diagram-label-strong">CLIENTE</text>
      <text x="520" y="32" textAnchor="middle" className="diagram-label-strong">SERVIDOR</text>
      <line x1="120" y1="78" x2="512" y2="78" stroke="var(--teal)" strokeWidth="1.5" markerEnd="url(#arrow-teal)" />
      <text x="320" y="69" textAnchor="middle" className="diagram-label">SYN · “quero abrir uma conexão”</text>
      <line x1="520" y1="122" x2="128" y2="122" stroke="var(--teal)" strokeWidth="1.5" markerEnd="url(#arrow-teal)" />
      <text x="320" y="113" textAnchor="middle" className="diagram-label">SYN, ACK · “recebi; estou disponível”</text>
      <line x1="120" y1="166" x2="512" y2="166" stroke="var(--teal)" strokeWidth="1.5" markerEnd="url(#arrow-teal)" />
      <text x="320" y="157" textAnchor="middle" className="diagram-label">ACK · conexão estabelecida</text>
      <line x1="120" y1="212" x2="512" y2="212" stroke="var(--ink-soft)" strokeWidth="1.2" markerEnd="url(#arrow-ink)" />
      <text x="320" y="203" textAnchor="middle" className="diagram-label">TLS ClientHello / HTTP request</text>
      <text x="568" y="170" textAnchor="middle" className="diagram-note">porta 443</text>
      <text x="568" y="184" textAnchor="middle" className="diagram-note">TCP</text>
    </svg>
  )
}

function DnsFlowFigure() {
  return (
    <div className="dns-figure">
      <div className="dns-path dns-path--ok">
        <div className="dns-node">
          <span className="dns-node__tag mono">CLIENTE</span>
          <strong>10.30.4.23</strong>
          <span>DNS configurado: 10.30.0.10</span>
        </div>
        <span className="dns-arrow" aria-hidden="true">→</span>
        <div className="dns-node">
          <span className="dns-node__tag mono">RESOLVEDOR INTERNO</span>
          <strong>10.30.0.10</strong>
          <span>Conhece a zona universidade.local</span>
        </div>
        <span className="dns-arrow" aria-hidden="true">→</span>
        <div className="dns-node dns-node--answer">
          <span className="dns-node__tag mono">RESPOSTA</span>
          <strong>10.10.50.20</strong>
          <span>portal.universidade.local · NOERROR</span>
        </div>
      </div>
      <div className="dns-path dns-path--fail">
        <div className="dns-node">
          <span className="dns-node__tag mono">CLIENTE</span>
          <strong>mesmo host</strong>
          <span>DNS configurado: 8.8.8.8</span>
        </div>
        <span className="dns-arrow" aria-hidden="true">→</span>
        <div className="dns-node">
          <span className="dns-node__tag mono">RESOLVEDOR EXTERNO</span>
          <strong>8.8.8.8</strong>
          <span>Não tem a zona interna</span>
        </div>
        <span className="dns-arrow" aria-hidden="true">→</span>
        <div className="dns-node dns-node--fail">
          <span className="dns-node__tag mono">RESPOSTA</span>
          <strong>NXDOMAIN</strong>
          <span>Nome não encontrado para este resolvedor</span>
        </div>
      </div>
      <p className="figure-note">
        O mesmo nome pode existir em uma zona e não existir em outra. O DNS configurado no cliente
        define qual visão de mundo ele consulta.
      </p>
    </div>
  )
}

function TriageFigure() {
  const steps = [
    ['01', 'Delimitar', 'escopo e sintoma'],
    ['02', 'Testar', 'hipóteses discriminantes'],
    ['03', 'Alterar', 'um parâmetro por vez'],
    ['04', 'Verificar', 'o teste original'],
    ['05', 'Registrar', 'evidência e decisão'],
  ]
  return (
    <div
      className="triage-figure"
      role="img"
      aria-label="Ciclo de diagnóstico: delimitar, testar, alterar, verificar e registrar."
    >
      {steps.map(([number, title, subtitle], index) => (
        <div className="triage-step" key={number}>
          <span className="triage-step__number mono">{number}</span>
          <strong>{title}</strong>
          <span>{subtitle}</span>
          {index < steps.length - 1 && <span className="triage-step__arrow" aria-hidden="true">→</span>}
        </div>
      ))}
    </div>
  )
}

function Figure({ block }: { block: Extract<ContentBlock, { kind: 'figure' }> }) {
  return (
    <figure className="content-figure">
      {block.figure === 'encapsulation' && <EncapsulationFigure />}
      {block.figure === 'handshake' && <HandshakeFigure />}
      {block.figure === 'dns-flow' && <DnsFlowFigure />}
      {block.figure === 'triage' && <TriageFigure />}
      <figcaption>{block.caption}</figcaption>
    </figure>
  )
}

export function LessonContent({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="prose">
      {blocks.map((block, index) => {
        switch (block.kind) {
          case 'paragraph':
            return (
              <p key={index}>
                <InlineText text={block.text} />
              </p>
            )
          case 'heading':
            return <h2 key={index}>{block.text}</h2>
          case 'list':
            return block.ordered ? (
              <ol key={index} className="prose-list">
                {block.items.map((item) => (
                  <li key={item}>
                    <InlineText text={item} />
                  </li>
                ))}
              </ol>
            ) : (
              <ul key={index} className="prose-list">
                {block.items.map((item) => (
                  <li key={item}>
                    <InlineText text={item} />
                  </li>
                ))}
              </ul>
            )
          case 'code':
            return (
              <div className="code-block" key={index}>
                {block.label && <span className="code-block__label">{block.label}</span>}
                <pre>
                  <code>{block.code}</code>
                </pre>
              </div>
            )
          case 'callout':
            return (
              <Callout key={index} tone={block.tone} title={block.title}>
                <p>
                  <InlineText text={block.text} />
                </p>
              </Callout>
            )
          case 'table':
            return (
              <div className="table-wrap" key={index}>
                <table className="data-table">
                  {block.caption && <caption>{block.caption}</caption>}
                  <thead>
                    <tr>
                      {block.headers.map((header) => (
                        <th key={header} scope="col">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex}>
                            <InlineText text={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          case 'steps':
            return (
              <div className="step-list" key={index}>
                {block.title && <h3>{block.title}</h3>}
                <ol>
                  {block.steps.map((step, stepIndex) => (
                    <li key={step.title}>
                      <span className="step-list__number mono">
                        {String(stepIndex + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <strong>{step.title}</strong>
                        <p>{step.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )
          case 'figure':
            return <Figure key={index} block={block} />
        }
      })}
    </div>
  )
}
