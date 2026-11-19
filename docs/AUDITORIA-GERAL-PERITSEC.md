# Auditoria geral do PeritSec

**Data da auditoria:** 17 e 18 de novembro de 2026  
**Escopo:** interface, conteúdo pedagógico, autenticação, progressão, casos periciais, acessibilidade, responsividade, persistência e documentação.  
**Base:** aplicação em execução local, código-fonte, PostgreSQL, testes automatizados e inspeção no navegador.  
**Limite:** não houve teste de carga, pentest externo, auditoria de infraestrutura de produção nem revisão jurídica. O produto não foi implantado.

## 1. Método

1. Leitura do código e dos dados de conteúdo antes de qualquer alteração.
2. Navegação ao vivo com o Chrome DevTools MCP nas rotas `/entrar`, `/comecar`, `/`, `/trilhas`, `/trilhas/redes`, `/laboratorios`, `/casos`, `/casos/portal-fora-do-ar`, `/metodologia`, `/progresso`, `/conta` e `/admin`.
3. Medição de largura em 375 px, 768 px e 1280 px, com verificação de overflow horizontal.
4. Login com conta de auditoria, promoção administrativa controlada no PostgreSQL e testes de fluxo.
5. Verificação de acessibilidade com axe-core e Lighthouse na tela de login e no caso do portal.
6. Conferência de fontes legais no Planalto.
7. Execução de `npx tsc -b`, `npm test`, `npm run test:server`, `npm run lint` e `npm run build`.

A conta de auditoria foi criada apenas para inspeção e não faz parte do produto. Nenhum dado pessoal real, credencial real ou captura real foi usado.

## 2. Sumário executivo

A base do PeritSec é funcional e tem pontos fortes verificáveis: autenticação com sessão persistida, progresso por conta, bloqueios de conteúdo aplicados também no servidor, dois casos completos, exercícios variados, testes automatizados e uma direção visual própria. A auditoria não encontrou conteúdo de malware, execução de comandos no sistema operacional, coleta de dados reais ou promessa de perícia oficial.

Os problemas mais relevantes estavam em três grupos:

- **confiança e coerência do produto:** a interface afirmava que a conta e a instalação eram locais, sem sincronização, quando o modelo correto é conta centralizada com progresso associado ao usuário;
- **cobertura de conteúdo:** apenas um caso estava completo e três páginas fixavam o primeiro caso, escondendo ou encaminhando incorretamente o restante do catálogo;
- **segurança administrativa:** qualquer conta autenticada podia se promover a administradora por uma rota da API, o que é incompatível com uma implantação real.

Os itens de conteúdo, navegação, textos e acessibilidade foram corrigidos nesta rodada. A elevação administrativa permanece aberta e é bloqueadora para qualquer ambiente público.

## 3. Achados

### A-01 — Qualquer conta autenticada pode se tornar administradora

**Severidade:** Crítico  
**Área:** autenticação e autorização  
**Status:** aberto — bloqueia implantação pública

**Evidência:** `server/index.mjs`, rota `POST /api/admin/elevate` (linhas 711–727), chama `setAccountRole(auth.account.id, 'admin')` sem exigir que a conta já seja administradora. A interface `/admin` apresenta a ação “Tornar-me administrador” para qualquer conta.

**Impacto:** uma conta comum pode ampliar os próprios privilégios, alterar papéis de outras contas e abrir conteúdo sem pré-requisitos. Em um serviço centralizado, isso invalida o controle de acesso administrativo.

**Solução recomendada:** remover a autoatribuição. O primeiro administrador deve ser provisionado por processo operacional protegido; novos administradores devem ser promovidos apenas por um administrador existente, com registro de auditoria. O endpoint de elevação deve exigir `requireAdmin` e a interface não deve oferecer autopromoção. Adicionar teste negativo para conta comum.

**Aceite:** conta `member` recebe 403 em `POST /api/admin/elevate`; nenhuma tela oferece autopromoção; promoção por administrador gera registro auditável.

### A-02 — Textos de “conta local”, “instalação local” e ausência de sincronização

**Severidade:** Alto  
**Área:** produto, autenticação e confiança  
**Status:** corrigido nesta rodada

**Evidência:** antes das alterações, `AccountPage`, `AdminPage`, `AppShell`, `RegisterPage`, `RecoverPage`, `WelcomePage`, `MethodologyPage`, `ProgressPage` e `TracksPage` afirmavam que a conta pertencia a uma instalação ou computador, que não havia sincronização e, em alguns pontos, que o progresso dependia do PostgreSQL local. O README também descrevia o produto como aplicativo de instalação local.

**Impacto:** o usuário não sabia se o progresso acompanharia a conta em outro navegador; a arquitetura anunciada contradizia o modelo de contas centralizadas.

**Solução aplicada:** textos passaram a falar em conta, serviço PeritSec, progresso associado ao usuário e sessão. Foram removidas instruções de `npm run dev` da página de progresso, menções a loopback na interface e a promessa de “sem sincronização”. Permanecem menções técnicas legítimas a PostgreSQL, `localStorage` como ausência de cópia automática e cálculo local no navegador.

**Aceite:** nenhuma tela de produto afirma que a conta é local ou que o progresso não acompanha o usuário. Revisão lexical em `src/**/*.tsx` não encontra esses usos fora de contextos técnicos justificados.

### A-03 — Apenas um caso completo e páginas fixadas no primeiro caso

**Severidade:** Alto  
**Área:** catálogo, casos e navegação  
**Status:** corrigido nesta rodada

**Evidência:** `CasesPage`, `LabsPage` e `DashboardPage` usavam `investigationCases[0]`; o catálogo tinha apenas `portal-fora-do-ar` completo e dois casos “em preparação”. O caso criminal `autoria-e-o-ip` não existia.

**Impacto:** o segundo caso não aparecia, o CTA de laboratórios podia encaminhar sempre para o mesmo dossiê e a visão geral não representava o catálogo. A plataforma não cumpria a progressão de perícia anunciada.

**Solução aplicada:** `CasesPage` lista todos os casos e calcula a rubrica de cada um; `LabsPage` encaminha para o catálogo; `DashboardPage` calcula casos acessíveis, iniciados e concluídos. O caso criminal de oito fases foi implementado com evidências, custódia, quesitos, rubrica e laudo de referência.

**Aceite:** os dois casos aparecem, abrem e avaliam de forma independente; nenhuma página de produto usa índice fixo do catálogo.

### A-04 — Nome acessível do link de conta não continha o texto visível

**Severidade:** Alto  
**Área:** acessibilidade  
**Status:** corrigido nesta rodada

**Evidência:** Lighthouse no caso do portal apontou `label-content-name-mismatch` no link da conta. O `aria-label` dizia “Conta local de …”, enquanto o texto visível incluía o nome de exibição e o nível.

**Impacto:** tecnologias assistivas anunciavam um nome diferente do texto visível, dificultando reconhecer o link e violando o critério de rótulo no nome.

**Solução aplicada:** o `aria-label` redundante foi removido; o nome acessível agora é composto pelo texto visível. O rótulo “Conta local” também foi substituído por “Conta”.

**Aceite:** o link da conta não apresenta `label-content-name-mismatch`; o nome acessível contém nome e nível exibidos.

### A-05 — Documentação e metodologia desatualizadas em relação ao produto

**Severidade:** Médio  
**Área:** documentação e transparência  
**Status:** corrigido nesta rodada

**Evidência:** o README afirmava 9 lições, um caso completo e persistência “no computador”; a página de metodologia repetia PostgreSQL local, loopback e ausência de sincronização. O código já tinha 12 lições e dois casos completos.

**Impacto:** quem avaliava o projeto recebia números e limites incorretos; a documentação não servia como fonte de verdade.

**Solução aplicada:** metodologia, conta, progresso, trilhas e casos foram atualizados. Os cinco documentos de `docs/` consolidam a versão atual, e o README foi reescrito com as contagens, a arquitetura PostgreSQL e o modelo de conta centralizada.

**Aceite:** README, metodologia e `docs/` citam a mesma contagem de trilhas, lições, laboratórios e casos.

### A-06 — Bundle JavaScript acima de 500 kB

**Severidade:** Médio  
**Área:** desempenho  
**Status:** aberto — não bloqueia o uso local

**Evidência:** `npm run build` gerou `dist/assets/index-*.js` com cerca de 797 kB minificados e aviso de chunk acima de 500 kB.

**Impacto:** primeiro carregamento mais lento, especialmente em rede móvel. Não há erro funcional.

**Solução recomendada:** divisão por rota com `React.lazy`/`Suspense`, separando laboratórios, casos e páginas administrativas. Medir o impacto com o mesmo build e registrar tamanho antes/depois.

**Aceite:** nenhum chunk inicial acima de 500 kB ou justificativa documentada para o limite.

### A-07 — Grade de evidências comprimida em 375 px

**Severidade:** Médio  
**Área:** responsividade  
**Status:** corrigido e validado em 375, 768 e 1280 px

**Evidência:** na medição de 375 px, a grade de evidências do caso do portal comprimia colunas e metadados. O conteúdo não gerava overflow horizontal, mas a leitura ficava apertada.

**Impacto:** em telas pequenas, a comparação entre metadados e conteúdo exigia mais rolagem e atenção.

**Solução aplicada:** a grade passou a usar coluna única em larguras pequenas, com rótulos e valores empilhados; as abas do caso usam `auto-fit`/`minmax` e quebram em até três colunas no mobile.

**Aceite:** em 375 px, a grade não corta texto, não cria rolagem horizontal e mantém alvos de toque utilizáveis.

### A-08 — Contagens e estados “em preparação” desatualizados

**Severidade:** Baixo  
**Área:** conteúdo  
**Status:** corrigido

**Evidência:** o catálogo e o README misturavam “9 lições”, “um caso completo” e “dois casos em preparação” com a implementação posterior.

**Impacto:** expectativa incorreta sobre a cobertura do produto.

**Solução aplicada:** a trilha de perícia foi reorganizada em dois módulos disponíveis; o catálogo lista dois casos completos e mantém dois prévios claramente marcados como “em preparação”. Os documentos usam a contagem atual.

### A-09 — Processos de desenvolvimento instáveis durante a auditoria

**Severidade:** Baixo  
**Área:** ambiente de desenvolvimento  
**Status:** contornado

**Evidência:** a API e o Vite encerraram com códigos `3221226505` e `1073807364` durante a navegação. Não foi possível atribuir o encerramento a uma rota ou alteração específica. O mesmo código apareceu uma vez no teste de reinício do backend; a execução seguinte passou com 21/21 testes.

**Impacto:** interrupção da inspeção ao vivo e necessidade de reiniciar os processos separadamente.

**Solução aplicada:** API e Vite passaram a ser iniciados em processos separados; o roteiro de auditoria registra a necessidade de reinício. Não é defeito funcional do produto, mas deve ser investigado antes de automação de CI.

## 4. O que foi verificado e passou

| Verificação | Resultado |
| --- | --- |
| `npx tsc -b --pretty false` | aprovado, sem erros |
| `npm test` | 9 arquivos, 73 testes aprovados |
| `npm run test:server` | 21 testes de API/PostgreSQL aprovados em schema isolado |
| `npm run lint` | aprovado com 4 avisos de Fast Refresh/setState já existentes |
| `npm run build` | aprovado; aviso de chunk de cerca de 797 kB |
| Login com axe-core | nenhuma violação crítica ou séria na tela de login |
| Lighthouse do caso do portal | acessibilidade 100 após correção do link da conta |
| Responsividade | homepage e caso sem overflow em 375, 768 e 1280 px; grade de evidências ajustada no mobile |
| Progressão | nível e pré-requisitos avaliados no cliente e revalidados no servidor em `PUT /api/progress` |
| Caso criminal | rubrica 100, oito fases, custódia, quesitos e laudo de referência com testes do motor |
| Dados sintéticos | endereços TEST-NET, CGNAT documental, personagens e organização fictícios |

## 5. Riscos residuais

1. **Autoelevação administrativa (crítico):** impede considerar o produto pronto para ambiente público. É o primeiro item de hardening.
2. **Sem testes E2E de navegador:** os fluxos foram inspecionados manualmente; regressões de navegação podem passar. Recomenda-se Playwright ou equivalente para login, progressão, caso e submissão.
3. **Sem teste de carga ou concorrência:** o comportamento de várias sessões gravando o mesmo progresso não foi medido.
4. **Documentação operacional:** README e `docs/` foram alinhados nesta rodada; a sincronização precisa ser mantida a cada mudança de catálogo.
5. **Chunk inicial grande:** impacta desempenho, não a correção funcional.
6. **Casos futuros:** os dois prévios continuam indisponíveis e não devem ser apresentados como concluídos.

## 6. Prioridade de correção

| Ordem | Item | Severidade | Esforço |
| --- | --- | --- | --- |
| 1 | Remover autoelevação e exigir administrador existente | Crítico | Médio |
| 2 | Code splitting por rota | Médio | Médio |
| 3 | Testes E2E dos dois casos e das três novas lições | Alto | Médio |
| 4 | Revisar logs e rate limit de autenticação | Médio | Médio |

## 7. Conclusão

O PeritSec deixou de ser um conjunto de páginas com textos e questionários e passou a ter uma base coerente de plataforma: contas centralizadas, progressão verificável, atividades em sete formatos, dois casos completos e um caso criminal que ensina, de forma tecnicamente correta, por que um IP não identifica uma pessoa. A auditoria encontrou um problema crítico de autorização que precisa ser resolvido antes de qualquer implantação pública. Fora dele, os riscos restantes são de desempenho, cobertura de testes e manutenção documental, não de integridade do conteúdo pedagógico.

A auditoria não encontrou evidência de que o produto execute comandos no sistema operacional, use dados reais, colete credenciais ou produza laudo com validade oficial. Esses limites devem continuar explícitos em todas as telas e materiais.
