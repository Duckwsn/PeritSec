# PeritSec — formação prática em redes, segurança e perícia digital

Plataforma em português do Brasil para treinar **metodologia de investigação** em redes, segurança, criptografia e perícia digital. Cada unidade combina entender, observar, experimentar, interpretar e concluir, com correção automática, rubricas explícitas e progresso associado à conta do usuário.

> Todos os dados são sintéticos. Personagens, organizações, extratos, pacotes, hashes e endereços são fictícios. Nenhuma captura real, credencial real ou dado pessoal de terceiros é usada. O simulador **não executa comandos no sistema operacional** e não envia dados para serviços externos.

## Stack e arquitetura

- **Vite + React 19 + TypeScript** como SPA, com **React Router**, ícones Lucide e IBM Plex Sans/Mono.
- Motores puros em TypeScript (sem dependência de UI): `subnet.ts`, `crypto.ts`, `exercises.ts`, `network.ts`, `progress.ts`, `caseEngine.ts`, `trafficView.ts`.
- Regras educacionais compartilhadas entre cliente e servidor em `shared/progression.mjs`: níveis, competências, pré-requisitos e recomendação.
- **Backend Node.js** (`node:http`) com PostgreSQL via `pg`/Pool. Em desenvolvimento, a API escuta em `127.0.0.1:4317`; o bind pode ser configurado por `HOST` e o modo publicado usa as variáveis de ambiente previstas no servidor.
- **PostgreSQL via Docker Compose**, migrações versionadas e tabelas para contas, sessões, progresso, backups e metadados de migração.
- **Dados relacionais no PostgreSQL**: progresso em `JSONB`, datas em `TIMESTAMPTZ`, chaves estrangeiras com cascata e índice único case-insensitive para username.
- **Arquivos de backup JSON com SHA-256** no diretório de dados do serviço; os metadados ficam no PostgreSQL. Restaurar confere o hash e cria uma cópia de segurança do estado atual.
- **Sem fallback de persistência para contas**: se o serviço/PostgreSQL não responder, o progresso fica indisponível ou a gravação é indicada como pendente. Nada é copiado silenciosamente para outra conta nem persistido em `localStorage`.
- **Contas sem e-mail**: hashes scrypt no PostgreSQL; username, nome de exibição e senha bastam. A recuperação usa um código de uso único exibido uma vez. Não há OAuth, e-mail transacional, nuvem ou serviço externo.
- A primeira conta só recebe papel administrativo automaticamente em ambiente de desenvolvimento; não há conta ou credencial predefinida.
- `PERITSEC_DATA_DIR` configura os arquivos JSON de backup. Os arquivos do banco ficam no volume Docker `peritsec-postgres-data`.
- `npm start` compila e serve `dist/` pelo mesmo servidor em `http://127.0.0.1:4173`, com CSP e fallback de SPA.
- O servidor de desenvolvimento Vite usa proxy de `/api` para `http://127.0.0.1:4317`.

### API

| Rota | Método | Função |
| --- | --- | --- |
| `/api/health` | GET | Estado do serviço, esquema e diretório de dados |
| `/api/setup` | GET / POST | Estado inicial e criação da primeira conta |
| `/api/auth/*` | POST | Login, logout, sessão, recuperação e troca de senha |
| `/api/account` | GET / PATCH | Conta, perfil e importação de progresso anterior |
| `/api/progress` | GET / PUT | Ler e gravar o progresso completo da conta |
| `/api/backups` | GET / POST | Listar e criar backups |
| `/api/backups/:id/restore` | POST | Validar hash e restaurar uma cópia |
| `/api/admin/*` | GET / POST / PATCH | Visão administrativa, papéis e catálogo de conteúdo |

Salvaguardas implementadas: verificação de `Host`, CORS restrito às origens de desenvolvimento, exigência de sessão nas rotas de conta, proteção CSRF local, escrita apenas em JSON, limite de 2 MB por corpo e 1,5 MB para o estado, validação estrutural, limite de 5.000 eventos e nenhuma rota capaz de executar comandos do sistema operacional. O bloqueio de nível e pré-requisitos é revalidado no servidor em `PUT /api/progress`.

## Como executar

Requisitos: **Node.js 24+**, npm e Docker Desktop com Docker Compose.

1. Copie `.env.example` para `.env` e atualize `POSTGRES_PASSWORD` e `DATABASE_URL` com a mesma senha.
2. Inicie o banco:

   ```bash
   docker compose up -d --wait
   ```

3. Instale dependências, aplique as migrações e inicie o app:

   ```bash
   npm install
   npm run db:migrate
   npm run dev
   ```

O frontend abre em `http://localhost:5173`; a API usa `http://127.0.0.1:4317`. O servidor aplica migrações pendentes ao iniciar e espera o PostgreSQL por um período limitado. Para evitar que um processo derrube o outro durante sessões longas, também é possível iniciar separadamente:

```bash
npm run server   # apenas a API
npm run dev:web  # apenas o Vite
```

Comandos de manutenção:

```bash
docker compose stop       # para o PostgreSQL sem remover o volume
docker compose start      # inicia novamente com os mesmos dados
docker compose down       # remove o container, mas preserva o volume
npm run db:migrate        # aplica migrações pendentes
npm test                  # testes de interface e motores (Vitest)
npm run test:server       # testes PostgreSQL/API em schema isolado
npm run lint              # oxlint
npm run build             # typecheck e build; npm start serve dist/
```

**Não use `docker compose down -v` se quiser manter os dados.** Isso apaga o volume do PostgreSQL. Os JSONs de backup ficam em `%APPDATA%\PeritSec\backups` no Windows (ou no diretório indicado por `PERITSEC_DATA_DIR`); eles são arquivos separados do volume. Senhas e códigos de recuperação não são exibidos nem registrados em logs.

### Importar uma instalação SQLite existente

Se houver uma base anterior com `peritsec.db`, inicie o PostgreSQL e execute a importação explicitamente após criar `.env`:

```powershell
npm run db:import-sqlite -- --source "$env:APPDATA\PeritSec\peritsec.db"
```

O importador aceita também `--backup-dir <diretório>` quando os arquivos JSON não estiverem em `backups/` ao lado do banco. Ele abre o SQLite somente para leitura, valida schema v3, integridade, hashes e arquivos de backup, exige uma base PostgreSQL sem dados de aplicação e informa as contagens importadas. A operação é idempotente para a mesma origem; a origem SQLite não é removida nem alterada. O PostgreSQL novo não importa dados automaticamente no startup.

## Funcionalidades implementadas

### Trilhas, níveis e lições

- **5 trilhas progressivas**: fundamentos de redes, administração e diagnóstico, segurança, perícia digital e criptografia/criptoanálise.
- **12 lições** com objetivos, pré-requisitos reais, explicação, exemplos técnicos, atividades, verificação de compreensão, síntese e próximo passo.
- **4 níveis** — Iniciante, Curioso, Intermediário e Avançado — com distinção entre nível inicial, demonstrado e efetivo.
- Acesso a lições, laboratórios e casos depende de **nível e pré-requisitos**, não de tempo de tela ou de abrir a página. O conteúdo concluído permanece disponível para revisão.
- **7 formatos de exercício**: múltipla escolha, resposta curta, sub-rede, ordenação, múltipla seleção, classificação e correspondência.
- Cada atividade pode declarar contexto, objetivo, conhecimentos mobilizados, apoio, desafio, etapas, evidência esperada, critérios observáveis e resposta de referência.

### Laboratórios

- **Rede simulada** (`/laboratorio/redes`): topologia interativa com PC, switch, roteador e servidor; configuração de IP/máscara/gateway; VLANs; interpretação de eventos; terminal simulado.
- **Captura sintética** (`/laboratorio/trafego`): 19 pacotes (`PKT-001`–`PKT-019`), filtros por protocolo/classificação, presets, busca em campos observados, detalhe de campos e questões de análise.
- **Criptografia** (`/laboratorio/cripto`): ferramentas que calculam de fato César, Vigenère, Base64 e SHA-256; desafio em camadas (Base64 + César 11) e comparação de integridade.
- Comandos do terminal simulado (interpretador próprio em TypeScript, nunca encaminhado ao SO): `ping`, `tracert`/`traceroute`, `ipconfig`/`ip addr`, `ip route`, `nslookup`/`dig`, `arp`, `netstat`/`ss`.
- A simulação é determinística para a mesma topologia e as mesmas entradas.

### Casos periciais

- **CASO-2026-014 · O portal que sumiu para um laboratório** (`/casos/portal-fora-do-ar`): indisponibilidade seletiva do portal acadêmico, com seis etapas — dossiê, evidências, registro, hipóteses, linha do tempo e conclusão/relatório. Rubrica de 100 pontos (causa 25, correlação 20, hipóteses 15, linha do tempo 15, limite da conclusão 5, relatório 20; aprovação a partir de 70).
- **CASO-2026-042 · O IP não é uma pessoa** (`/casos/autoria-e-o-ip`): caso criminal fictício de acesso indevido a prontuário, com CGNAT compartilhado, credencial coletiva, custódia incompleta e oito fases. Inclui linha do tempo normalizada, hipóteses refutadas/insuficientes, seis itens de custódia, quatro quesitos e laudo de referência. Rubrica de 100 pontos (conclusão 15, limite 5, correlação 10, hipóteses 10, cronologia 10, custódia 10, quesitos 20, laudo 20; aprovação a partir de 70).
- Ambos os casos usam evidências sintéticas com metadados, verificação de integridade por SHA-256, anotações por fonte, seleção de evidências, classificação de hipóteses e relatório com separação entre fato, inferência, lacuna e recomendação.
- Dois casos adicionais aparecem como **“em preparação”**, sem links ativos: integridade de arquivo apreendido e possível exfiltração de tráfego.
- O material completo do caso criminal está em `docs/CASO-PERICIAL.md`.

### Progresso e conta

- Página `/progresso` com mapa de competências, trilhas, casos, histórico (limite de 80 entradas), exportação JSON e limpeza do progresso.
- **Persistência verificável por conta**: PostgreSQL, última gravação, criação/restauração de backups com hash e aviso quando o serviço estiver indisponível.
- **Revisão recomendada**: até três exercícios, priorizando (1) resposta incorreta, (2) acerto com pista, (3) acerto após mais de uma tentativa e (4) acerto com mais de sete dias. A fila sugere prática e não altera pontos nem bloqueia avanço.
- A pontuação dos casos credita apenas a competência de perícia.
- A conta acompanha o usuário em qualquer navegador; o progresso não fica preso ao computador.

## Documentação

| Documento | Conteúdo |
| --- | --- |
| `docs/AUDITORIA-GERAL-PERITSEC.md` | auditoria com achados por severidade, evidências, riscos e prioridades |
| `docs/PLANO-EVOLUCAO-PERITSEC.md` | fases, backlog, métricas, riscos e definição de pronto |
| `docs/MAPA-PEDAGOGICO.md` | níveis, competências, trilhas, pré-requisitos e formatos de atividade |
| `docs/CASO-PERICIAL.md` | dossiê do caso criminal, linha do tempo, custódia, quesitos, rubrica e base legal |
| `docs/DESIGN-SYSTEM.md` | tokens, componentes, acessibilidade, responsividade e governança visual |

## Interface e sistema visual

Direção própria: **dossiê pericial / painel de instrumento** — papel quente, tinta grafite, acentos verde-petróleo e âmbar, cantos secos e decoração contida; laboratórios escuros para simulação. Sem estética “neon hacker”, dashboard genérico ou gradientes decorativos.

- Cabeçalho superior compacto com navegação rotulada: Início, Aprender, Laboratórios, Casos periciais, Meu progresso e Metodologia. Em telas menores, gaveta acessível com foco no botão de fechar, `Esc` e retorno de foco.
- Trilhas em uma coluna editorial, com objetivos, pré-requisitos, exemplos, atividades, verificação e síntese.
- Casos com dossiê, abas, fases, evidências, custódia, quesitos e laudo.
- Laboratórios com introdução antes do início, bancada orientada à tarefa e conclusão com resultado, evidências, erros/limites e próximo exercício.
- Contraste AA, corpo em 16 px, foco visível, alvos de toque de pelo menos 44 px e hierarquia de cabeçalhos.
- Verificação nas larguras **375, 768 e 1280 px**, sem overflow horizontal nas páginas medidas.

## Testes e verificações

| Comando | Resultado |
| --- | --- |
| `npx tsc -b --pretty false` | aprovado |
| `npm run lint` | aprovado com 4 avisos existentes de Fast Refresh/setState |
| `npm test` | **9 arquivos / 73 testes aprovados** |
| `npm run test:server` | **21 testes PostgreSQL/API aprovados**, schema isolado |
| `npm run build` | aprovado; aviso não bloqueante de chunk JavaScript acima de 500 kB |

O cadastro, o login, o progresso por conta e a restauração de backup foram validados contra o PostgreSQL. A conta temporária de verificação foi removida ao final.

## Limitações conhecidas

- **Autoelevação administrativa:** qualquer conta autenticada pode se promover a administradora por uma rota existente. É o único achado crítico da auditoria e **bloqueia qualquer implantação pública** até ser corrigido. O detalhamento está em `docs/AUDITORIA-GERAL-PERITSEC.md` (A-01).
- Se o serviço/PostgreSQL estiver indisponível, o progresso de conta não é copiado para o navegador; alterações ainda não enviadas podem ser perdidas ao fechar ou recarregar a página.
- Hashes SHA-256 demonstram **integridade da cópia** exibida; não comprovam origem, autoria ou veracidade histórica.
- O laboratório de tráfego é um recorte de cabeçalhos sintéticos e não demonstra comprometimento, exfiltração, autoria ou intenção.
- A criptoanálise cobre cifras clássicas e codificação; não há quebra de criptografia moderna nem promessa disso.
- Ferramentas externas (Wireshark, TShark, GNS3, suítes forenses) **não** são executadas nem anunciadas como integrações. Docker Compose é usado apenas para o PostgreSQL. Não há execução arbitrária de comandos; o isolamento dos laboratórios é lógico.
- Dois casos estão marcados como “em preparação” e não devem ser apresentados como concluídos.
- O volume PostgreSQL e o diretório de backup são armazenamentos distintos. Remover um não remove o outro.
- Não há teste de carga, pentest externo, revisão jurídica nem testes E2E automatizados de navegador nesta versão.

## Referências normativas

- NIST **SP 800-86** — *Guide to Integrating Forensic Techniques into Incident Response*.
- **Código de Processo Penal, arts. 158-A a 158-F** — cadeia de custódia; **art. 159, caput e § 3º** — perito oficial e faculdade de formulação de quesitos e indicação de assistente técnico.
- **Lei 12.965/2014 (Marco Civil da Internet)** — guarda e disponibilização de registros de conexão e de acesso a aplicações.
- **Lei 13.709/2018 (LGPD)** — tratamento de dados pessoais.
- **Lei 14.155/2021** — alterações penais no contexto de crimes informáticos.

## Próximo incremento recomendado

1. Remover a autoelevação administrativa, exigir administrador existente e registrar mudanças de papel.
2. Adicionar testes E2E de login, progressão, dois casos, custódia, quesitos e laudo.
3. Dividir o bundle por rota e medir o impacto no carregamento inicial.
4. Revisar acessibilidade com axe em todas as rotas, não apenas nas duas medidas.
5. Concluir os dois casos “em preparação”, com rubrica, custódia e feedback completos.
6. Ampliar a revisão espaçada com registro de revisões concluídas e critérios de retenção por competência.

## Produção

Deploy, domínio, TLS de produção e configuração de provedor estão fora do escopo desta versão e não foram alterados nem validados. Qualquer implantação pública exige, no mínimo, a correção do achado A-01, revisão de autenticação e autorização, configuração própria de PostgreSQL, política de retenção e testes de segurança.
