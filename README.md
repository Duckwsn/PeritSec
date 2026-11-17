# PeritSec — formação prática em redes, segurança e perícia digital

Aplicativo local, em português do Brasil, para treinar **metodologia de investigação** em redes, segurança, criptografia e perícia digital. Cada unidade combina entender, observar, experimentar, interpretar e concluir, com correção automática e progresso persistido no computador.

> Todos os dados são sintéticos. Personagens, extratos, pacotes, hashes e empresas são fictícios. Nenhuma captura real, credencial ou dado pessoal é usada. O simulador **não executa comandos no sistema operacional** nem envia dados para serviços externos.

## Stack e arquitetura

- **Vite + React 19 + TypeScript** como SPA, com **React Router**, ícones Lucide e IBM Plex Sans/Mono.
- Motores puros em TypeScript (sem dependência de UI): `subnet.ts`, `crypto.ts`, `exercises.ts`, `network.ts`, `progress.ts`, `caseEngine.ts`, `trafficView.ts`.
- **Backend Node.js**: `node:http` com PostgreSQL via `pg`/Pool, escutando apenas em `127.0.0.1:4317`.
- **PostgreSQL local via Docker Compose**, migrations versionadas e oito tabelas: `accounts`, `sessions`, `progress`, `account_progress`, `backups`, `account_backups`, `app_meta` e `schema_migrations`.
- **Dados relacionais no PostgreSQL**: progresso em `JSONB`, datas em `TIMESTAMPTZ`, chaves estrangeiras com cascata e índice único case-insensitive para username.
- **Arquivos de backup JSON com SHA-256** no diretório local `backups/`; os metadados ficam no PostgreSQL. Restaurar confere o hash e cria uma cópia de segurança do estado atual.
- **Sem fallback de persistência para contas**: se o backend/PostgreSQL não responder, o progresso fica indisponível ou a gravação é indicada como pendente; não é copiado silenciosamente para outra conta nem persistido em `localStorage`.
- **Senha e recuperação locais**: hashes scrypt no PostgreSQL; username, nome de exibição e senha bastam. Não há e-mail, OAuth, nuvem ou serviço externo. A primeira conta só recebe papel admin automaticamente em desenvolvimento local; não há conta ou credencial predefinida.
- `PERITSEC_DATA_DIR` configura apenas os arquivos JSON de backup. Os arquivos do banco ficam no volume Docker `peritsec-postgres-data`.
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

Requisitos: **Node.js 24+**, npm e Docker Desktop com Docker Compose.

1. Copie `.env.example` para `.env` e atualize `POSTGRES_PASSWORD` e `DATABASE_URL` com a mesma senha.
2. Inicie o banco local:

   ```bash
   docker compose up -d --wait
   ```

3. Instale dependências, aplique as migrations e inicie o app:

   ```bash
   npm install
   npm run db:migrate
   npm run dev
   ```

O frontend abre em `http://localhost:5173`; a API local usa `http://127.0.0.1:4317`. O servidor também aplica migrations pendentes ao iniciar e espera o PostgreSQL por um período limitado. O comando `npm run server` inicia só a API; `npm start` compila e serve `dist/`.

Comandos de manutenção:

```bash
docker compose stop       # para o PostgreSQL sem remover o volume
docker compose start      # inicia novamente com os mesmos dados
docker compose down       # remove o container, mas preserva o volume
npm run db:migrate        # aplica migrations pendentes
npm test                  # testes de interface e motores (Vitest)
npm run test:server       # testes PostgreSQL/API em schema isolado
npm run lint              # oxlint
npm run build             # typecheck e build
```

**Não use `docker compose down -v` se quiser manter os dados.** Isso apaga o volume do PostgreSQL. Os JSONs de backup ficam em `%APPDATA%\PeritSec\backups` no Windows (ou no diretório indicado por `PERITSEC_DATA_DIR`); eles são arquivos separados do volume. Senhas e códigos de recuperação não são exibidos nem registrados em logs.

### Importar uma instalação SQLite existente

Se houver uma instalação anterior com `peritsec.db`, inicie o PostgreSQL e execute a importação explicitamente após criar `.env`:

```powershell
npm run db:import-sqlite -- --source "$env:APPDATA\PeritSec\peritsec.db"
```

O importador aceita também `--backup-dir <diretório>` quando os arquivos JSON não estiverem em `backups/` ao lado do banco. Ele abre o SQLite somente para leitura, valida schema v3, integridade, hashes e arquivos de backup, exige uma base PostgreSQL sem dados de aplicação e informa as contagens importadas. A operação é idempotente para a mesma origem; a origem SQLite não é removida nem alterada. O PostgreSQL novo não importa dados automaticamente no startup.

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
- **Persistência verificável**: PostgreSQL local, última gravação, criação/restauração de backups com hash e aviso quando o backend ou o banco estiver indisponível.
- **Revisão recomendada**: até três exercícios, priorizando (1) resposta incorreta, (2) acerto com pista, (3) acerto após mais de uma tentativa e (4) acerto com mais de sete dias. A fila sugere prática e não altera pontos nem bloqueia avanço.
- A pontuação do caso completo credita apenas a competência de perícia.

## Interface e sistema visual

Direção própria: **dossiê pericial / painel de instrumento** — papel quente, tinta grafite, acentos verde-petróleo e âmbar, cantos secos e decoração contida; laboratórios escuros para simulação. Sem estética “neon hacker” ou gradientes genéricos.

- Cabeçalho superior compacto com navegação rotulada: Início, Aprender, Laboratórios, Casos periciais, Meu progresso e Metodologia. Em telas menores, gaveta acessível com foco no botão de fechar, `Esc` e retorno de foco.
- Trilhas em uma coluna editorial, com objetivos, pré-requisitos, exemplos, atividades, verificação e síntese.
- Laboratórios com introdução antes do início, bancada orientada à tarefa e conclusão com resultado, evidências, erros/limites e próximo exercício.
- Contraste AA, corpo em 16 px, foco visível, alvos de toque de pelo menos 44 px e hierarquia de cabeçalhos.
- Auditoria por captura nas larguras **375, 768 e 1280 px**, sem overflow horizontal nas páginas verificadas.

## Testes e verificações

| Comando | Resultado |
| --- | --- |
| `npx tsc -b --pretty false` | aprovado |
| `npm run lint` | aprovado com 4 avisos existentes de Fast Refresh/setState |
| `npm test` | **9 arquivos / 68 testes aprovados** |
| `npm run test:server` | **21 testes PostgreSQL/API aprovados**, schema isolado |
| `npm run build` | aprovado; aviso não bloqueante de chunk JavaScript acima de 500 kB |

O cadastro foi validado na interface contra o PostgreSQL; sessão e progresso carregaram, e um backup apareceu na página. A conta temporária de verificação foi removida ao final.

## Limitações conhecidas

- Aplicativo de instalação local, com múltiplas contas no mesmo computador. Não há sincronização com outros dispositivos ou painel de turma. PostgreSQL e arquivos de backup precisam ser preservados separadamente.
- Se o PostgreSQL/API estiver indisponível, o progresso de conta não é persistido no navegador; alterações ainda não enviadas podem ser perdidas ao fechar ou recarregar a página.
- Hashes SHA-256 demonstram **integridade da cópia** exibida; não comprovam origem, autoria ou veracidade histórica.
- O laboratório de tráfego é um recorte de cabeçalhos sintéticos e não demonstra comprometimento, exfiltração, autoria ou intenção.
- A criptoanálise cobre cifras clássicas e codificação; não há quebra de criptografia moderna nem promessa disso.
- Ferramentas externas (Wireshark, TShark, GNS3, suítes forenses) **não** são executadas nem anunciadas como integrações. Docker Compose é usado apenas para o PostgreSQL local. Não há execução arbitrária de comandos; o isolamento dos laboratórios é lógico.
- Apenas um caso completo; os demais estão marcados como “em preparação”.
- O volume PostgreSQL e o diretório de backup são armazenamentos distintos. Remover um não remove o outro.

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

## Produção

Deploy, Render, Vercel e configurações de produção estão fora do escopo desta migração local e não foram alterados nem validados. A implantação em produção exige uma revisão e configuração próprias de PostgreSQL e segurança.
