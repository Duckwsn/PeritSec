# PeritSec — formação prática em redes, segurança e perícia digital

Aplicativo local, em português do Brasil, para treinar **metodologia de investigação** em redes, segurança, criptografia e perícia digital. Cada unidade combina entender, observar, experimentar, interpretar e concluir, com correção automática e progresso persistido no computador.

> Todos os dados são sintéticos. Personagens, extratos, pacotes, hashes e empresas são fictícios. Nenhuma captura real, credencial ou dado pessoal é usada. O simulador **não executa comandos no sistema operacional** nem envia dados para serviços externos.

## Stack e arquitetura

- **Vite + React 19 + TypeScript** como SPA, com **React Router**, ícones Lucide e IBM Plex Sans/Mono.
- Motores puros em TypeScript (sem dependência de UI): `subnet.ts`, `crypto.ts`, `exercises.ts`, `network.ts`, `progress.ts`, `caseEngine.ts`, `trafficView.ts`.
- **Backend local sem dependências externas**: `node:http` + `node:sqlite` (`DatabaseSync`), escutando apenas em `127.0.0.1:4317`.
- **SQLite com migrações versionadas** (esquema v1): tabelas `progress`, `backups` e `schema_migrations`; WAL e `busy_timeout`.
- **Diretório de dados persistente**, resolvido nesta ordem:
  1. `PERITSEC_DATA_DIR`, quando definido;
  2. `%APPDATA%\PeritSec` no Windows;
  3. `~/.local/share/peritsec` em outros sistemas.
- **Backups JSON com SHA-256** em `backups/`. A restauração confere o hash e cria uma cópia de segurança do estado atual antes de substituí-lo.
- **Fallback deliberado**: se a API local não responder, a interface continua em modo somente navegador, usando `localStorage` (`peritsec:progress:v1`). O modo ativo é exibido em `/progresso`.
- **Conflito de estado**: quando a API está disponível, o registro do servidor é a fonte principal. Se o registro local tiver alteração mais recente (por exemplo, uma ação feita com o servidor fora do ar), o estado local é reenviado. Se o banco ainda não tiver registro, o estado local é migrado automaticamente.
- `npm start` compila e serve `dist/` pelo mesmo servidor local em `http://127.0.0.1:4173`, com CSP e fallback de SPA.
- O servidor de desenvolvimento Vite usa proxy de `/api` para `http://127.0.0.1:4317`.

### API local

| Rota | Método | Função |
| --- | --- | --- |
| `/api/health` | GET | Estado do servidor, esquema e diretório de dados |
| `/api/progress` | GET / PUT | Ler e gravar o progresso completo |
| `/api/backups` | GET / POST | Listar e criar backups |
| `/api/backups/:id/restore` | POST | Validar hash e restaurar uma cópia |

Salvaguardas implementadas: vínculo exclusivo ao loopback, verificação de `Host`, escrita apenas em JSON, limite de 2 MB por corpo e 1,5 MB para o estado, validação estrutural, limite de 5.000 eventos, CORS restrito às origens de desenvolvimento e nenhuma rota capaz de executar comandos do sistema operacional.

## Como executar

Requisitos: **Node.js 24+** (necessário para `node:sqlite`) e npm.

```bash
npm install
npm run dev        # API local + interface em http://localhost:5173
npm run dev:web    # apenas Vite; a interface cai no modo localStorage
npm run server     # apenas a API local em 127.0.0.1:4317
npm start          # build + serve dist/ e API em http://127.0.0.1:4173
npm test           # testes de interface e motores (Vitest)
npm run test:server# testes do SQLite e da API (node:test)
npm run lint       # oxlint
npm run build      # typecheck (tsc -b) + build de produção
```

O modo SQLite grava em `%APPDATA%\PeritSec\peritsec.db` no Windows. Faça um backup pela página **Meu progresso** antes de remover esse diretório. Backups e exportações podem conter anotações digitadas por você: trate-os como material de trabalho.

## Funcionalidades implementadas

### Trilhas e lições
- 5 trilhas progressivas: fundamentos de redes, administração e diagnóstico, segurança, perícia digital e criptografia/criptoanálise.
- 9 lições com objetivos, pré-requisitos reais, explicação, exemplo técnico, atividade, verificação de compreensão, síntese e próximo passo.
- Exercícios variados: múltipla escolha, resposta curta, sub-redes, interpretação de log/comando, cronologia, campos de pacote, diagnóstico de topologia, seleção de evidências, comparação de hipóteses, detecção de conclusão não sustentada e relatório.
- Cada exercício tem rubrica, dicas, explicações e feedback; a progressão reflete competências demonstradas, não tempo de tela.

### Laboratórios
- **Rede simulada** (`/laboratorio/redes`): topologia interativa com PC, switch, roteador e servidor; configuração de IP/máscara/gateway; VLANs; interpretação de eventos; terminal simulado.
- **Captura sintética** (`/laboratorio/trafego`): 19 pacotes (`PKT-001`–`PKT-019`), filtros por protocolo/classificação, presets, busca em campos observados, detalhe de campos e três questões de análise.
- **Criptografia** (`/laboratorio/cripto`): ferramentas que calculam de fato César, Vigenère, Base64 e SHA-256; desafio em camadas (Base64 + César 11) e comparação de integridade.
- Comandos do terminal simulado (interpretador próprio em TypeScript, nunca encaminhado ao SO):
  `ping`, `tracert`/`traceroute`, `ipconfig`/`ip addr`, `ip route`, `nslookup`/`dig`, `arp`, `netstat`/`ss`.
- A simulação é determinística para a mesma topologia e as mesmas entradas.

### Caso de investigação completo
- **CASO-2026-014 · O portal que sumiu para um laboratório** (`/casos/portal-fora-do-ar`): fluxo em seis etapas — dossiê, evidências, registro, hipóteses, linha do tempo e conclusão/relatório.
- 8 evidências sintéticas com metadados e cadeia de custódia, verificação de integridade por SHA-256, anotações por fonte (fatos e hipóteses separados), registro de ações, seleção do par de evidências, classificação de hipóteses, linha do tempo normalizada e relatório técnico.
- Avaliação por rubrica explícita (causa 25, correlação 20, hipóteses 15, linha do tempo 15, limite da conclusão 5, relatório 20; aprovação a partir de 70/100) com gabarito e justificativas após a submissão.
- O caso distingue **ausência de evidência** de **evidência de ausência**, aceita conclusão indeterminada quando os dados não sustentam nexo e alerta contra atribuição de culpa individual sem base probatória.
- Dois casos adicionais aparecem como “em preparação”, sem links ativos.

### Progresso
- Página `/progresso` com mapa de competências, trilhas, casos, histórico (limite de 80 entradas), exportação JSON e limpeza do progresso.
- **Persistência verificável**: modo SQLite, caminho do diretório de dados, última gravação, criação/restauração de backups com hash e fallback explícito para o navegador.
- **Revisão recomendada**: até três exercícios, priorizando (1) resposta incorreta, (2) acerto com pista, (3) acerto após mais de uma tentativa e (4) acerto com mais de sete dias. A fila sugere prática e não altera pontos nem bloqueia avanço.
- A pontuação do caso completo credita apenas a competência de perícia.

## Interface e sistema visual

Direção própria: **dossiê pericial / painel de instrumento** — papel quente, tinta grafite, acentos verde-petróleo e âmbar, cantos secos e decoração contida; laboratórios escuros para simulação. Sem estética “neon hacker” ou gradientes genéricos.

- Cabeçalho superior compacto com navegação rotulada: Início, Aprender, Laboratórios, Casos periciais, Meu progresso e Metodologia. Em telas menores, gaveta acessível com foco no botão de fechar, `Esc` e retorno de foco.
- Trilhas em uma coluna editorial, com objetivos, pré-requisitos, exemplos, atividades, verificação e síntese.
- Laboratórios com introdução antes do início, bancada orientada à tarefa e conclusão com resultado, evidências, erros/limites e próximo exercício.
- Contraste AA, corpo em 16 px, foco visível, alvos de toque de pelo menos 44 px e hierarquia de cabeçalhos.
- Auditoria por captura nas larguras **375, 768 e 1280 px**, sem overflow horizontal nas páginas verificadas.

## Testes e verificações (executados)

| Comando | Resultado |
| --- | --- |
| `npx tsc -b --pretty false` | passa, sem erros |
| `npm run lint` (oxlint) | passa com 3 avisos não bloqueantes (`only-export-components` e `set-state-in-effect` em contextos conhecidos) |
| `npm test` (Vitest) | **7 arquivos / 48 testes passando** (sub-redes, criptografia, exercícios, motor de rede, motor de caso, progresso e filtros de tráfego) |
| `npm run test:server` (node:test) | **11 testes passando** (migração/persistência, validação, backup/restauração, hash adulterado, API, CORS) |
| `npm run build` | passa; aviso de chunk > 500 kB (**633,71 kB / 185,73 kB gzip**) |

Verificações de navegador realizadas nesta etapa:

- modo **SQLite** ativo com caminho real, criação de backup, restauração com cópia de segurança prévia (`-pre-restauracao`) e persistência após reiniciar API e interface;
- laboratório de rede com correção de gateway `10.30.4.1` e conclusão verificada; captura de tráfego com 19 pacotes, filtro DNS, limpeza de filtros e **3/3** respostas; laboratório criptográfico com **4/4** etapas;
- caso com verificação SHA-256 de `E-01`, anotação registrada e progresso persistido;
- gaveta móvel em 375 px: foco em “Fechar menu”, `Esc`, retorno a “Abrir menu” e ausência de overflow em 375/768/1280 px;
- build de produção servido por `--serve` em `127.0.0.1:4174`, sem erros de console e com API de mesma origem;
- Lighthouse (desktop): acessibilidade, boas práticas e SEO em **100**, após ajuste do nome acessível da marca.

## Limitações conhecidas

- Aplicativo **local e monousuário**. Não há autenticação, sincronização entre dispositivos, painel de turma ou hospedagem. O banco SQLite pode ser apagado ou corrompido pelo ambiente; backups são locais.
- Se a API estiver indisponível, o progresso fica apenas no navegador e pode ser perdido ao limpar dados ou trocar de navegador.
- Hashes SHA-256 demonstram **integridade da cópia** exibida; não comprovam origem, autoria ou veracidade histórica.
- O laboratório de tráfego é um recorte de cabeçalhos sintéticos e não demonstra comprometimento, exfiltração, autoria ou intenção.
- A criptoanálise cobre cifras clássicas e codificação; não há quebra de criptografia moderna nem promessa disso.
- Ferramentas externas (Wireshark, TShark, GNS3, Docker, suítes forenses) **não** são executadas nem anunciadas como integrações. Não há execução arbitrária de comandos; o isolamento dos laboratórios é lógico, não por contêiner.
- Apenas um caso completo; os demais estão marcados como “em preparação”.
- O caminho de dados tem prioridade para Windows (`%APPDATA%`); Linux/macOS usam o fallback documentado.

## Referências normativas

- NIST **SP 800-86** — *Guide to Integrating Forensic Techniques into Incident Response*.
- **Código de Processo Penal, art. 158-A e seguintes** — cadeia de custódia.
- **LGPD (Lei 13.709/2018)** — tratamento de dados pessoais.

## Próximo incremento recomendado

1. Completar os dois casos “em preparação”, incluindo um caso com evidências contraditórias e conclusão explicitamente indeterminada.
2. Adicionar exportação de relatório em PDF com hash registrado e um modo instrutor com gabaritos separados.
3. Evoluir a captura sintética para múltiplos arquivos de fluxo, filtros por host e construção de linha do tempo a partir do próprio tráfego.
4. Ampliar a revisão espaçada com registro de revisões concluídas e critérios de retenção por competência.
5. Se houver laboratórios avançados, isolá-los em ambiente com limites, encerramento explícito e documentação de ferramentas externas opcionais.
