import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Database,
  FileText,
  KeyRound,
  Scale,
  ShieldCheck,
  Terminal,
  TriangleAlert,
} from 'lucide-react'
import { Callout, PageHeader, SectionHeading, Tag } from '../components/ui'

const references = [
  {
    title: 'NIST SP 800-86 — Guide to Integrating Forensic Techniques into Incident Response',
    author: 'KENT, Karen et al. · National Institute of Standards and Technology',
    year: '2006',
    note: 'Guia de referência para coleta, exame, análise e relato de evidências digitais em resposta a incidentes. Publicação de 2006; deve ser lida como orientação, não como norma jurídica brasileira.',
    href: 'https://csrc.nist.gov/pubs/sp/800/86/final',
    label: 'csrc.nist.gov',
  },
  {
    title: 'Código de Processo Penal — Decreto-Lei nº 3.689/1941, arts. 158-A a 158-F',
    author: 'BRASIL · Presidência da República',
    year: '1941, com alterações',
    note: 'Os arts. 158-A a 158-F tratam da cadeia de custódia e foram incluídos pela Lei nº 13.964/2019. O texto compilado deve ser consultado na fonte oficial.',
    href: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689compilado.htm',
    label: 'planalto.gov.br',
  },
  {
    title: 'Lei Geral de Proteção de Dados Pessoais — Lei nº 13.709/2018',
    author: 'BRASIL · Presidência da República',
    year: '2018, com alterações',
    note: 'Dispõe sobre o tratamento de dados pessoais, finalidades, bases legais, direitos e segurança. Aplicável a contextos reais; este MVP usa apenas dados sintéticos.',
    href: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm',
    label: 'planalto.gov.br',
  },
]

export function MethodologyPage() {
  return (
    <div className="methodology-page">
      <PageHeader
        title="Método de avaliação, escopo e limites do ambiente."
        lede="PeritSec é um ambiente educacional de prática deliberada. Ele não substitui formação formal, supervisão profissional, exame pericial oficial ou aconselhamento jurídico. Esta página descreve o modelo de avaliação, as decisões técnicas e os limites conhecidos."
        meta={
          <>
            <span className="meta-item">
              <ShieldCheck size={14} aria-hidden="true" /> dados sintéticos
            </span>
            <span className="meta-item">
              <Terminal size={14} aria-hidden="true" /> simulação isolada
            </span>
            <span className="meta-item">
              <Scale size={14} aria-hidden="true" /> não é aconselhamento jurídico
            </span>
          </>
        }
        actions={
          <Link className="button button--outline" to="/progresso">
            Ver meu progresso <ArrowRight size={15} aria-hidden="true" />
          </Link>
        }
      />

      <div className="method-contract">
        <article>
          <h2>Ambiente de prática</h2>
          <p>
            Lições curtas, exercícios corrigidos, laboratórios determinísticos e um caso com rubrica.
            O objetivo é tornar o raciocínio técnico observável, não apenas apresentar conteúdo.
          </p>
        </article>
        <article>
          <h2>Simulação declarada</h2>
          <p>
            O terminal interpreta comandos em TypeScript a partir de um estado de rede. Nenhum
            comando é executado no sistema operacional, na rede local ou em serviços externos.
          </p>
        </article>
        <article>
          <h2>Dados fictícios</h2>
          <p>
            Pessoas, empresas, endereços e capturas são sintéticos. Não há PCAP real, credenciais,
            dados pessoais de terceiros ou material obtido de ambientes alheios.
          </p>
        </article>
      </div>

      <section aria-label="Como a avaliação funciona">
        <SectionHeading
          title="Como a progressão é calculada"
          description="O sistema não mede tempo de permanência, páginas abertas ou cliques. Cada ponto deriva de uma evidência registrada localmente."
        />
        <div className="method-grid method-grid--scoring">
          <div className="method-copy">
            <h3>Pontos por competência</h3>
            <ul className="method-list">
              <li>
                <strong>Exercício correto:</strong> +6 pontos, uma vez por exercício, mesmo que haja
                novas tentativas.
              </li>
              <li>
                <strong>Lição concluída:</strong> +10 pontos, quando todos os exercícios da unidade
                foram resolvidos.
              </li>
              <li>
                <strong>Laboratório ou cenário verificado:</strong> +20 pontos para a competência
                associada.
              </li>
              <li>
                <strong>Relatório de caso submetido:</strong> até +30 pontos, proporcionais à nota da
                rubrica, creditados em método pericial.
              </li>
            </ul>
            <p>
              A pontuação é limitada a 100 por competência. Exercícios podem ser refeitos; a melhor
              pontuação e o registro de conclusão são preservados. A barra representa evidências
              acumuladas, não uma nota escolar.
            </p>
            <p>
              A <strong>revisão recomendada</strong> sugere até três exercícios, priorizando resposta
              incorreta, acerto com pista, múltiplas tentativas e acertos com mais de sete dias. A
              fila é uma sugestão de prática: não altera pontos nem bloqueia o avanço.
            </p>
            <div className="level-scale" aria-label="Faixas de competência">
              <div>
                <span className="mono">0</span>
                <strong>Não iniciado</strong>
              </div>
              <div>
                <span className="mono">1–34</span>
                <strong>Em desenvolvimento</strong>
              </div>
              <div>
                <span className="mono">35–64</span>
                <strong>Consolidando</strong>
              </div>
              <div>
                <span className="mono">65–100</span>
                <strong>Demonstrado</strong>
              </div>
            </div>
          </div>
          <aside className="method-side-note">
            <h3>O que não conta</h3>
            <ul className="method-list method-list--plain">
              <li>Permanecer na página.</li>
              <li>Abrir uma lição sem resolver os exercícios.</li>
              <li>Assistir a uma simulação sem alterar configuração ou responder questões.</li>
              <li>Submeter um relatório vazio; a validação impede a submissão.</li>
            </ul>
            <p>
              A conclusão de laboratório depende de uma condição técnica verificada pelo motor — por
              exemplo, conectividade e resolução DNS funcionando após a correção.
            </p>
          </aside>
        </div>
      </section>

      <section aria-label="Avaliação de exercícios e casos">
        <SectionHeading
          title="Correção explícita, sem adivinhação semântica"
          description="As respostas são avaliadas por regras determinísticas: alternativas, campos normalizados, cálculos de sub-rede, seleção, ordenação e rubrica."
        />
        <div className="method-grid">
          <div className="method-panel">
            <div className="method-panel__head">
              <KeyRound size={18} aria-hidden="true" />
              <h3>Motor de exercícios</h3>
            </div>
            <p>
              Cada exercício declara tipo, objetivo, dificuldade, pré-requisitos, rubrica, pistas e
              explicação. A correção aceita variações controladas de caixa, acentuação e espaços
              quando o campo é textual. Cálculos de sub-rede são verificados a partir dos valores
              numéricos, não por comparação de texto.
            </p>
            <div className="method-tags">
              <Tag tone="neutral">MCQ</Tag>
              <Tag tone="neutral">resposta curta</Tag>
              <Tag tone="neutral">sub-redes</Tag>
              <Tag tone="neutral">ordenação</Tag>
              <Tag tone="neutral">seleção múltipla</Tag>
              <Tag tone="neutral">leitura de comando</Tag>
            </div>
          </div>
          <div className="method-panel">
            <div className="method-panel__head">
              <FileText size={18} aria-hidden="true" />
              <h3>Caso pericial</h3>
            </div>
            <p>
              O caso exige selecionar evidência direta, posicionar hipóteses, ordenar eventos e
              apontar uma conclusão não sustentada. O relatório é pontuado por rubrica; a aprovação
              exige <strong>70/100</strong>.
            </p>
            <dl className="rubric-list">
              <div>
                <dt>Causa provável</dt>
                <dd className="mono">25</dd>
              </div>
              <div>
                <dt>Seleção de evidências</dt>
                <dd className="mono">20</dd>
              </div>
              <div>
                <dt>Hipóteses</dt>
                <dd className="mono">15</dd>
              </div>
              <div>
                <dt>Linha do tempo</dt>
                <dd className="mono">15</dd>
              </div>
              <div>
                <dt>Conclusão não sustentada</dt>
                <dd className="mono">05</dd>
              </div>
              <div>
                <dt>Relatório</dt>
                <dd className="mono">20</dd>
              </div>
            </dl>
            <p className="method-small">
              A rubrica é exibida após a submissão. O gabarito técnico explica o que era possível
              concluir e o que permanecia indeterminado.
            </p>
          </div>
        </div>
      </section>

      <section aria-label="Princípios periciais">
        <SectionHeading
          title="Princípios que o ambiente procura ensinar"
          description="A interface usa termos técnicos em português e mantém termos consagrados em inglês quando necessários, sempre com explicação no contexto."
        />
        <div className="principle-list">
          <article>
            <div>
              <h3>Preservação e cadeia de custódia</h3>
              <p>
                Em um caso real, a evidência deve ser identificada, coletada, acondicionada,
                transportada e devolvida com registro contínuo de quem a manuseou, quando, onde e por
                quê. O material didático não simula coleta física; ele demonstra por que o registro
                importa e como falhas de documentação comprometem a revisão.
              </p>
            </div>
          </article>
          <article>
            <div>
              <h3>Integridade e verificação</h3>
              <p>
                Os itens de evidência sintética têm SHA-256 calculado sobre o texto exibido. A
                comparação detecta alteração do conteúdo em relação ao digest de referência. Ela não
                prova autoria, origem ou autenticidade: o próprio digest precisa ter procedência
                documentada. Em perícia real, hashing é apenas parte do procedimento de aquisição e
                preservação.
              </p>
            </div>
          </article>
          <article>
            <div>
              <h3>Correlação e limites</h3>
              <p>
                Horários em fontes diferentes podem usar fusos distintos; eventos próximos não são
                necessariamente causais. O caso do portal combina logs em UTC e BRT para exercitar
                normalização temporal e leitura de escopo. Uma hipótese compatível com parte dos dados
                pode continuar como <strong>insuficiente</strong>.
              </p>
            </div>
          </article>
          <article>
            <div>
              <h3>Documentação e comunicação</h3>
              <p>
                O relatório separa fatos observados, inferências, limitações e recomendações. Uma
                conclusão responsável indica o que a evidência sustenta e o que permanece
                indeterminado, inclusive quando isso contraria uma expectativa de culpabilidade.
              </p>
            </div>
          </article>
        </div>
      </section>

      <Callout tone="limite" title="Limite educacional explícito">
        <p>
          Nenhum procedimento deste ambiente constitui perícia oficial, laudo, parecer técnico ou
          prova judicial. Não há coleta de evidência real, cadeia de custódia formal, assinatura
          digital, carimbo do tempo, preservação de imagem forense ou participação de autoridade
          competente. O uso profissional exige formação, autorização, procedimentos organizacionais e
          observância da legislação aplicável.
        </p>
      </Callout>

      <section aria-label="Segurança dos dados e privacidade">
        <SectionHeading
          title="Dados, privacidade e segurança operacional"
          description="O aplicativo grava em SQLite, por conta local, quando o servidor está ativo. Não há envio para serviços externos nem cópia automática no navegador."
        />
        <div className="method-grid">
          <div className="method-panel">
            <div className="method-panel__head">
              <Database size={18} aria-hidden="true" />
              <h3>O que é armazenado</h3>
            </div>
            <p>
              Identificadores de lições, exercícios, laboratórios e casos; pontuações; horários;
              notas e relatórios que você digitar; e um histórico resumido de atividade. O estado
              fica em SQLite, no diretório de dados do aplicativo
              (<code>%APPDATA%\PeritSec</code> no Windows), em um registro separado para cada conta
              local. Não existe cópia automática em <code>localStorage</code>.
            </p>
            <p>
              A API escuta apenas em <code>127.0.0.1</code>, aceita um conjunto fixo de rotas e não
              executa comandos do sistema operacional. As contas são locais e não há envio automático
              para servidor remoto, analytics de terceiros, OAuth, e-mail ou sincronização entre
              dispositivos.
            </p>
            <p>
              Backups são arquivos JSON no subdiretório <code>backups</code>, com hash SHA-256
              registrado. Restaurar confere o hash e cria uma cópia de segurança do estado atual
              antes de substituí-lo. A exportação JSON é gerada pelo navegador.
            </p>
          </div>
          <div className="method-panel">
            <div className="method-panel__head">
              <ShieldCheck size={18} aria-hidden="true" />
              <h3>LGPD e dados sintéticos</h3>
            </div>
            <p>
              O ambiente foi desenhado para evitar dados pessoais reais. Ainda assim, você pode
              digitar informações livres nos campos de anotação. Não insira nomes, documentos,
              endereços, credenciais ou dados de terceiros. Em um cenário real, coleta e tratamento de
              dados pessoais exigiriam finalidade, base legal, minimização, segurança e registro
              adequados.
            </p>
            <p>
              Se o servidor local estiver indisponível, o progresso usa apenas o armazenamento do
              navegador. Use a exportação ou um backup antes de limpar os dados do navegador ou
              remover o diretório de dados.
            </p>
          </div>
        </div>
      </section>

      <section aria-label="Limites técnicos">
        <SectionHeading
          title="Limites técnicos conhecidos"
          description="Estas são as fronteiras do MVP. Não há integrações externas anunciadas ou botões que simulem resultados inexistentes."
        />
        <div className="limits-grid">
          <article>
            <TriangleAlert size={17} aria-hidden="true" />
            <div>
              <h3>Contas e backend locais</h3>
              <p>
                O progresso fica em SQLite neste computador e não acompanha você entre navegadores ou
                dispositivos. A senha pode ser redefinida apenas com o código de recuperação local.
                Não há painel de turma nem sincronização remota. A API aceita apenas conexões de
                loopback.
              </p>
            </div>
          </article>
          <article>
            <TriangleAlert size={17} aria-hidden="true" />
            <div>
              <h3>Sem captura real</h3>
              <p>
                O laboratório de tráfego usa 19 pacotes embutidos. Não importa PCAP, não executa
                Wireshark, tcpdump, Nmap ou comandos do sistema operacional.
              </p>
            </div>
          </article>
          <article>
            <TriangleAlert size={17} aria-hidden="true" />
            <div>
              <h3>Sem integração com simuladores</h3>
              <p>
                Packet Tracer, GNS3, EVE-NG e ferramentas forenses não estão conectados. A topologia e
                o terminal são modelos próprios e determinísticos.
              </p>
            </div>
          </article>
          <article>
            <TriangleAlert size={17} aria-hidden="true" />
            <div>
              <h3>Sem promessa de quebra criptográfica</h3>
              <p>
                O laboratório cobre César, Vigenère, Base64 e SHA-256. Não há ataque a criptografia
                moderna, recuperação de senhas reais, certificados ou análise de malware.
              </p>
            </div>
          </article>
          <article>
            <TriangleAlert size={17} aria-hidden="true" />
            <div>
              <h3>Um caso completo</h3>
              <p>
                Apenas <em>O portal fora do ar</em> está completo. Os demais itens do catálogo são
                marcados como “em preparação” e não possuem link ativo.
              </p>
            </div>
          </article>
          <article>
            <TriangleAlert size={17} aria-hidden="true" />
            <div>
              <h3>Sem certificação</h3>
              <p>
                Níveis de competência são indicadores internos de prática. Não equivalem a
                certificação profissional, diploma ou habilitação legal.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section aria-label="Acessibilidade e operação">
        <SectionHeading
          title="Acessibilidade, operação e transparência"
          description="Decisões de interface e de engenharia que afetam o uso e a leitura dos resultados."
        />
        <div className="method-grid">
          <div className="method-panel">
            <h3>Interface</h3>
            <ul className="method-list method-list--plain">
              <li>Navegação por teclado, foco visível e links de salto.</li>
              <li>Estados de carregamento, vazio, erro e sucesso quando aplicáveis.</li>
              <li>Layout responsivo para desktop, tablet e celular.</li>
              <li>Contraste definido por tokens e respeito a <code>prefers-reduced-motion</code>.</li>
              <li>Tabelas e campos com rótulos; listas de pacotes operáveis por botão.</li>
            </ul>
          </div>
          <div className="method-panel">
            <h3>Engenharia</h3>
            <ul className="method-list method-list--plain">
              <li>React, TypeScript e Vite; motores puros para rede, sub-redes, criptografia e rubrica.</li>
              <li>SHA-256 implementado em TypeScript e conferido por testes automatizados.</li>
              <li>
                Persistência em SQLite com migrações versionadas, validação de esquema, backup e
                restauração com hash.
              </li>
              <li>
                API local restrita a loopback, com rotas fixas e validação de corpo; nenhum comando do
                sistema operacional é executado.
              </li>
              <li>Resultados determinísticos para o mesmo estado e comando.</li>
              <li>Sem dependência de APIs pagas ou serviços de IA para corrigir respostas.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="references-section" aria-labelledby="references-title">
        <SectionHeading
          title="Referências consultadas"
          description="Links oficiais verificados em 19/10/2026. A citação não implica endosso ao PeritSec."
        />
        <div className="reference-list" id="references-title">
          {references.map((reference) => (
            <article key={reference.href}>
              <span className="reference-list__year mono">{reference.year}</span>
              <div>
                <h3>{reference.title}</h3>
                <p className="reference-list__author">{reference.author}</p>
                <p>{reference.note}</p>
                <a
                  className="text-link"
                  href={reference.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {reference.label} <ArrowRight size={14} aria-hidden="true" />
                </a>
              </div>
            </article>
          ))}
        </div>
        <p className="references-note">
          A leitura do CPP e da LGPD neste ambiente é introdutória e não substitui consulta jurídica.
          A aplicação de dispositivos legais depende de competência, autorização, contexto e
          procedimento. Para detalhes, consulte o texto oficial e orientação profissional.
        </p>
      </section>

      <div className="inline-actions">
        <Link className="text-link" to="/progresso">
          Ver como o progresso está registrado <ArrowRight size={14} aria-hidden="true" />
        </Link>
        <Link className="text-link" to="/laboratorios">
          Voltar aos laboratórios <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
