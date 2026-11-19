# Plano de evolução do PeritSec

## 1. Visão

O PeritSec deve ser uma plataforma progressiva de formação em redes, cibersegurança e perícia digital. O aluno aprende fazendo: interpreta uma situação, mobiliza conhecimentos, registra evidências, recebe correção explícita e só avança quando demonstra a competência e cumpre os pré-requisitos.

A evolução não é “adicionar mais páginas”. É aumentar a profundidade do raciocínio sem perder três compromissos:

1. **método antes de ferramenta:** o aluno deve explicar o que sabe, o que infere e o que ainda não pode afirmar;
2. **evidência antes de opinião:** notas, relatórios e conclusões derivam de registros verificáveis;
3. **limite antes de certeza:** o produto ensina a reconhecer ausência de dados, hipóteses concorrentes e autoria indeterminada.

## 2. Princípios de evolução

- Preservar o que funciona: identidade “papel quente + teal”, navegação editorial, laboratórios escuros e linguagem brasileira.
- Não criar uma segunda arquitetura de contas, progresso ou casos. Toda evolução usa o motor existente.
- Não liberar conteúdo por clique, tempo de tela ou abertura de página. O acesso depende de nível efetivo, competências e pré-requisitos, com validação no servidor.
- Não simular resultados: hash, cálculo de sub-rede, criptografia e rubrica são determinísticos e testados.
- Não usar dados pessoais reais, malware funcional, credenciais reais ou capturas de terceiros.
- Não prometer validade jurídica. O produto é educacional e deve declarar isso em todos os casos.
- Cada incremento precisa de teste, build, verificação de acessibilidade e atualização dos documentos.

## 3. Estado de partida

| Área | Situação atual |
| --- | --- |
| Contas | cadastro, login, sessão, recuperação por código e progresso por usuário |
| Persistência | PostgreSQL, progresso em JSONB, backups com hash e restauração |
| Trilhas | 5 trilhas, 12 lições, 3 laboratórios e 2 casos completos |
| Atividades | múltipla escolha, curta, sub-rede, ordenação, múltipla seleção, classificação e correspondência |
| Casos | caso do portal (6 etapas) e caso criminal (8 fases, custódia e quesitos) |
| Avaliação | rubricas explícitas, feedback, solução de referência e critérios observáveis |
| Interface | papel quente, teal, IBM Plex, laboratórios escuros; responsiva em 375/768/1280 |
| Documentação | auditoria, plano, mapa pedagógico, caso e design system em `docs/` |

## 4. Fases

### Fase 0 — Auditoria e linha de base (concluída)

**Objetivo:** conhecer o produto antes de alterá-lo.

**Entregas:**
- navegação ao vivo nas rotas principais;
- classificação de problemas por severidade;
- conferência de fontes legais;
- testes existentes e build;
- registro de limites e riscos.

**Critério de saída:** nenhum código de produto alterado antes do relatório de auditoria.

### Fase 1 — Fundação de contas e progresso (concluída)

**Objetivo:** garantir que a conta seja a unidade de identidade e que o progresso acompanhe o usuário.

**Entregas:**
- PostgreSQL com migrações versionadas;
- sessão com expiração, recuperação de acesso e código de uso único;
- progresso por conta, sem cópia automática em `localStorage`;
- backup e restauração com verificação de hash;
- administração de contas e papéis;
- remoção da narrativa de “conta local” e “instalação local” da interface.

**Critério de saída:** login, progresso e backup funcionam por conta; a interface fala em conta e serviço.

### Fase 2 — Motor pedagógico e casos (concluída)

**Objetivo:** tornar a progressão verificável e ampliar os formatos de prática.

**Entregas:**
- `shared/progression.mjs` como fonte única de níveis, competências e pré-requisitos;
- validação de acesso no cliente e no servidor;
- formatos `classify` e `match`;
- metadados pedagógicos: conhecimentos, apoio, desafio, etapas, evidência, critérios e resposta de referência;
- motor de casos generalizado com rubrica, fases, custódia e quesitos;
- caso criminal `autoria-e-o-ip` com oito fases;
- três novas lições de perícia: vestígio, IP e laudo.

**Critério de saída:** os dois casos avaliam de forma independente; atividades novas têm correção e feedback; testes do motor passam.

### Fase 3 — Consolidação da experiência (concluída)

**Objetivo:** fazer o produto parecer e funcionar como uma plataforma única, não como uma coleção de telas.

**Entregas:**
- textos de conta, sessão, progresso e metodologia alinhados ao serviço centralizado;
- catálogo de casos sem índice fixo;
- visão geral com casos acessíveis, iniciados e concluídos;
- documentação em `docs/`;
- validação visual dos dois casos e das três novas lições em 375, 768 e 1280;
- revisão de foco, teclado, contraste e nomes acessíveis.

**Critério de saída:** nenhuma tela promete o que o produto não faz; os fluxos principais são navegáveis por teclado e não têm overflow nas três larguras; a documentação corresponde ao código.

### Fase 4 — Hardening e prontidão operacional (próxima)

**Objetivo:** reduzir risco antes de qualquer ambiente público.

**Entregas:**
1. remover a autoelevação administrativa e exigir administrador existente;
2. registrar auditoria de mudanças de papel;
3. adicionar testes E2E dos fluxos de login, lição, caso, custódia, quesitos e laudo;
4. dividir o bundle por rota;
5. revisar rate limit, mensagens de erro e expiração de sessão;
6. manter README e documentação operacional sincronizados a cada mudança de catálogo;
7. definir política de retenção e descarte de progresso e backups;
8. revisar acessibilidade com axe em todas as rotas, não apenas nas duas medidas.

**Critério de saída:** conta comum não consegue elevar privilégio; fluxos críticos têm teste automatizado; build inicial não ultrapassa o limite definido ou tem justificativa; documentação operacional está atualizada.

### Fase 5 — Expansão pedagógica (futura)

**Objetivo:** ampliar profundidade sem inflar o catálogo.

**Candidatos:**
- concluir os casos “Integridade de um arquivo apreendido” e “Tráfego que não deveria sair”;
- adicionar análise de múltiplos fluxos e construção de linha do tempo a partir do tráfego;
- ampliar revisão espaçada com registro de revisões concluídas;
- modo instrutor com gabaritos separados e visão de turma;
- exportação de relatório em PDF com hash e carimbo de tempo educativo;
- laboratórios avançados com isolamento explícito e encerramento documentado.

Cada candidato só entra se tiver: objetivo observável, evidência, rubrica, feedback, limites e testes.

## 5. Backlog priorizado

| ID | Item | Prioridade | Aceite |
| --- | --- | --- | --- |
| H-01 | Remover `POST /api/admin/elevate` aberto | P0 | conta comum recebe 403; interface não oferece autopromoção |
| H-02 | Auditoria de mudança de papel | P1 | registro com ator, alvo, antes/depois e horário |
| H-03 | Testes E2E dos dois casos | P1 | fluxo completo por navegador, incluindo falha e retomada |
| H-04 | Code splitting por rota | P2 | chunk inicial menor; build sem aviso ou com limite justificado |
| H-05 | Revisão axe de todas as rotas | P1 | zero violações críticas/sérias |
| H-06 | README alinhado | P2 | contagens, arquitetura e limites iguais aos docs |
| H-07 | Caso de integridade de arquivo | P3 | rubrica, custódia e feedback completos |
| H-08 | Caso de possível exfiltração | P3 | conclusão diferencia backup de exfiltração com evidências |
| H-09 | Exportação de laudo | P3 | PDF/JSON com hash e aviso de limite educativo |
| H-10 | Modo instrutor | P4 | turmas, visão agregada e gabarito separado |

## 6. Métricas de sucesso

Não usar números fictícios. Medir apenas o que o produto registra:

- **progressão:** percentual de alunos que concluem a primeira lição e retornam para a segunda;
- **domínio:** acertos por competência, tentativas por exercício e uso de pistas;
- **casos:** distribuição de notas por critério da rubrica, taxa de conclusão e principais lacunas;
- **qualidade:** número de violações de acessibilidade, overflow por largura e falhas de build;
- **confiança:** percentual de relatórios que separam fato, inferência e limitação;
- **desempenho:** tamanho do chunk inicial, tempo de carregamento e erros de API.

Metas iniciais devem ser definidas depois de uma coleta real. Até lá, o critério é qualitativo: o aluno consegue explicar o raciocínio e reconhecer o que não sabe.

## 7. Riscos e mitigação

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Autoelevação administrativa | crítico | remover endpoint aberto; provisionamento protegido |
| Conteúdo parecer laudo oficial | alto | aviso em todas as telas, linguagem condicional e limites |
| Caso ensinar atribuição por IP | alto | hipóteses refutadas, rubrica e laudo de referência |
| Progresso divergir entre cliente e servidor | alto | validação no `PUT /api/progress` e testes |
| Interface prometer sincronização inexistente | alto | textos centralizados e revisão lexical |
| Bundle crescer sem controle | médio | code splitting e orçamento de tamanho |
| Dados de aluno em anotações livres | médio | aviso LGPD e minimização; não incentivar dados reais |
| Dependência de um único caso | médio | dois casos completos e catálogo com prévios explícitos |

## 8. Fora de escopo

- implantação, domínio, TLS de produção e configuração de provedor;
- uso real em investigação, laudo oficial ou processo judicial;
- malware funcional, exploração de sistemas reais ou coleta de dados de terceiros;
- integração com Wireshark, Nmap, GNS3, Packet Tracer ou suítes forenses;
- garantia de anonimato ou isolamento contra administrador do dispositivo;
- autenticação OAuth, e-mail transacional ou SSO.

## 9. Definição de pronto

Um incremento só é considerado pronto quando:

1. o conteúdo tem objetivo, contexto, evidência, feedback e critério;
2. a progressão é validada no cliente e no servidor;
3. os dados são sintéticos e os limites estão declarados;
4. `npx tsc -b`, `npm test`, `npm run test:server`, `npm run lint` e `npm run build` passam;
5. a interface foi verificada em 375, 768 e 1280 px;
6. teclado, foco, contraste e nome acessível foram conferidos;
7. a documentação correspondente foi atualizada;
8. nenhuma afirmação de segurança ou resultado foi inventada.
