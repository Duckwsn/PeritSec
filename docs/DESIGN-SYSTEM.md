# Design system do PeritSec

## 1. Direção

**Dossiê pericial + painel de instrumento.**

O PeritSec não usa a estética de “hacker neon”, dashboard genérico ou landing page de startup. A interface se aproxima de um documento técnico de campo: papel quente, tinta grafite, acentos verde-petróleo e âmbar, cantos secos, tipografia editorial e decoração apenas quando comunica estado, hierarquia ou evidência.

A referência de composição é a **Visão Geral**: cabeçalho com título e metadados, uma coluna principal de leitura, painéis laterais com fatos e ações, e nenhuma grade de cartões sem função. Laboratórios usam uma superfície escura própria, como bancada de instrumento, sem contaminar o restante do produto.

### Princípios

1. **Papel, não vidro.** Superfícies claras, bordas finas e sombras discretas.
2. **Tinta, não ruído.** Hierarquia por tamanho, peso e espaço; não por excesso de cor.
3. **Teal é ação e método.** O verde-petróleo marca links, foco, progresso e confirmação.
4. **Âmbar é atenção.** Usado em avisos, estado intermediário e evidência que exige leitura.
5. **Vermelho é limite.** Erro, risco e custódia ausente; nunca decoração.
6. **Nada de número fictício.** Métricas só aparecem quando vêm do progresso real.
7. **Uma ação principal por bloco.** Botões secundários são contorno ou texto.
8. **Mobile não é desktop encolhido.** Colunas viram sequência; metadados empilham; alvos continuam grandes.

## 2. Tokens

Fonte: `src/styles/tokens.css`. Todos os componentes devem consumir variáveis; valores soltos são exceção justificada.

### 2.1 Cores de superfície e tinta

| Token | Valor | Uso |
| --- | --- | --- |
| `--paper` | `#f2f0e9` | fundo principal |
| `--paper-raised` | `#fbfaf5` | painéis, cartões, campos |
| `--paper-sunken` | `#e9e6db` | áreas rebaixadas, cabeçalhos de tabela |
| `--ink` | `#171c1a` | texto principal |
| `--ink-soft` | `#4c5853` | texto secundário |
| `--ink-faint` | `#5e6963` | metadados e legendas |
| `--line` | `#d6d2c4` | bordas padrão |
| `--line-strong` | `#aaa899` | divisores e contornos de ênfase |

### 2.2 Cores de estado

| Token | Valor | Uso |
| --- | --- | --- |
| `--teal` | `#0d655d` | ação, link, foco, progresso |
| `--teal-strong` | `#094e48` | hover/pressed |
| `--teal-soft` | `#e0ede9` | fundo de destaque |
| `--teal-wash` | `#eef5f2` | fundo muito sutil |
| `--amber` | `#8c5414` | aviso, atenção, estado parcial |
| `--amber-soft` | `#f4e8d4` | fundo de aviso |
| `--rust` | `#963d2d` | erro, risco, lacuna |
| `--rust-soft` | `#f3e3de` | fundo de erro |
| `--green` | `#2d6748` | sucesso |
| `--green-soft` | `#e3eee6` | fundo de sucesso |
| `--blue` | `#2f5b76` | informação neutra |
| `--blue-soft` | `#e4edf2` | fundo informativo |

### 2.3 Contraste verificado

Pares medidos com a ferramenta de contraste:

| Par | Razão | AA texto normal | AAA texto normal |
| --- | --- | --- | --- |
| `--ink` sobre `--paper` | 15,13:1 | sim | sim |
| `--ink-soft` sobre `--paper` | 6,51:1 | sim | não |
| `--ink-faint` sobre `--paper` | 5,01:1 | sim | não |
| `--teal` sobre `--paper` | 6,06:1 | sim | não |
| `--paper-raised` sobre `--teal` | 6,62:1 | sim | não |
| `--amber` sobre `--paper` | 5,43:1 | sim | não |
| `--rust` sobre `--paper` | 6,13:1 | sim | não |
| `--lab-text` sobre `--lab-bg` | 15,31:1 | sim | sim |
| `--lab-muted` sobre `--lab-bg` | 7,56:1 | sim | sim |
| `--lab-accent` sobre `--lab-bg` | 10,43:1 | sim | sim |

Regra: texto normal precisa de 4,5:1; texto grande, 3:1. Componentes não textuais (bordas de foco, ícones essenciais) precisam de 3:1 contra o fundo adjacente.

### 2.4 Laboratório

| Token | Valor | Uso |
| --- | --- | --- |
| `--lab-bg` | `#101714` | fundo da bancada |
| `--lab-raised` | `#17211d` | painéis |
| `--lab-sunken` | `#0b100e` | terminal e áreas profundas |
| `--lab-line` | `#2d3b35` | bordas |
| `--lab-text` | `#e7ede8` | texto |
| `--lab-muted` | `#9aaba3` | metadados |
| `--lab-accent` | `#6bd6c4` | foco, seleção, comando |
| `--lab-amber` | `#e5b570` | aviso |
| `--lab-red` | `#e28b7d` | erro |
| `--lab-green` | `#84c9a1` | sucesso |

Os laboratórios são escuros por contexto de bancada, não por “tema hacker”. Fora deles, o produto permanece claro.

### 2.5 Tipografia

| Token | Valor | Uso |
| --- | --- | --- |
| `--font-sans` | IBM Plex Sans, Segoe UI, system-ui | texto e títulos |
| `--font-mono` | IBM Plex Mono, Cascadia Mono, Consolas | dados, horários, hashes, endereços |
| `--text-xs` | 0.75rem | legendas curtas |
| `--text-label` | 0.8125rem | rótulos e tags |
| `--text-sm` | 0.875rem | metadados |
| `--text-base` | 1rem | corpo |
| `--text-md` | 1.0625rem | corpo de destaque |
| `--text-lg` | 1.1875rem | subtítulos |
| `--text-xl` | 1.5rem | títulos de seção |
| `--text-2xl` | clamp(1.5rem, 1.1rem + 1.2vw, 1.9rem) | h2 |
| `--text-3xl` | clamp(1.9rem, 1.2rem + 2.2vw, 2.75rem) | h1 de página |
| `--text-4xl` | clamp(2.3rem, 1.35rem + 3.4vw, 3.8rem) | hero |

**Regras:**
- corpo em 16 px, entrelinha 1,55;
- títulos com `letter-spacing: -0.015em`;
- dados técnicos sempre em mono, com `font-variant-numeric: tabular-nums` quando disponível;
- largura de leitura confortável: 60–75 caracteres por linha;
- não usar caixa alta em parágrafos; caixa alta é para rótulos curtos.

### 2.6 Espaçamento, raio e sombra

| Token | Valor |
| --- | --- |
| `--space-1` | 0.25rem |
| `--space-2` | 0.5rem |
| `--space-3` | 0.75rem |
| `--space-4` | 1rem |
| `--space-5` | 1.25rem |
| `--space-6` | 1.5rem |
| `--space-8` | 2rem |
| `--space-10` | 2.5rem |
| `--space-12` | 3rem |
| `--space-16` | 4rem |
| `--space-20` | 5rem |

| Token | Valor | Uso |
| --- | --- | --- |
| `--radius-xs` | 1px | detalhes |
| `--radius-sm` | 2px | botões, tags |
| `--radius-md` | 3px | campos |
| `--radius-lg` | 5px | painéis |

Cantos são secos de propósito. Não usar `border-radius: 999px` fora de pílulas de estado e avatares.

Sombras:
- `--shadow-panel`: `0 1px 0 rgba(23, 28, 26, 0.05)`;
- `--shadow-pop`: `0 10px 30px rgba(12, 22, 18, 0.16)`.

### 2.7 Movimento

| Token | Valor | Uso |
| --- | --- | --- |
| `--motion-fast` | 100ms | hover, foco, feedback |
| `--motion-base` | 170ms | abertura de painel, transição de estado |
| `--ease` | `cubic-bezier(0.2, 0, 0, 1)` | desaceleração curta |

Movimento é feedback, não espetáculo. Não animar conteúdo de leitura, números ou gráficos sem necessidade. Respeitar `prefers-reduced-motion` e `prefers-contrast`.

## 3. Layout

### 3.1 Estrutura

- Cabeçalho superior compacto (`--topbar-h: 3.75rem`), navegação rotulada e menu em gaveta no mobile.
- Conteúdo máximo de `92rem`, com margens generosas.
- Página editorial: cabeçalho, metadados, corpo em coluna, painéis laterais quando houver fatos e ações.
- Casos: dossiê com abas, fases, evidências e relatório.
- Laboratórios: introdução antes da bancada; a bancada pode ocupar a largura disponível.

### 3.2 Breakpoints

| Faixa | Comportamento |
| --- | --- |
| até 480 px | títulos reduzidos; botões de ação em largura total; abas em até 3 colunas; metadados empilhados; tabelas com rolagem controlada |
| 481–720 px | colunas de caso e laboratório empilham; navegação vira gaveta |
| 721–1024 px | grade de duas colunas quando o conteúdo permitir; painéis laterais descem |
| 1025–1599 px | layout editorial completo; coluna de leitura + lateral |
| 1600 px+ | margens maiores; topologia mais alta |

As larguras de validação são **375, 768 e 1280 px**. Não considerar uma tela “responsiva” sem medir overflow horizontal, quebra de palavras e alvo de toque.

### 3.3 Grades

- Evidências: `auto-fit` com mínimo de 16–18rem; em 375 px, uma coluna.
- Abas do caso: `repeat(auto-fit, minmax(7.5rem, 1fr))`; no mobile, até 3 colunas.
- Fatos/metadados: rótulo e valor em duas colunas; no mobile, empilhados.
- Formulários: duas colunas apenas quando há espaço; nunca lado a lado em 375 px.
- Tabelas: `overflow-x: auto` com foco visível; não esconder colunas essenciais.

## 4. Componentes

### 4.1 Cabeçalho de página

- `PageHeader` com título, lede, metadados e ações.
- Título em `--text-3xl`/`--text-4xl`; lede em `--ink-soft`; metadados em mono.
- Ações à direita no desktop; abaixo no mobile.
- Não repetir o título no corpo.

### 4.2 Seção

- `SectionHeading` com título, descrição curta e, opcionalmente, ação.
- Separador por espaço e borda superior, não por cartão.
- Cada seção tem um `aria-labelledby` quando tem título visível.

### 4.3 Botões

| Variante | Uso | Aparência |
| --- | --- | --- |
| `button--primary` | ação principal | fundo teal, texto paper |
| `button--outline` | ação secundária | fundo transparente, borda forte |
| `button--quiet` | ação terciária | texto e ícone |
| `button--small` | ação inline | altura menor, mesmo foco |

Regras:
- altura mínima de 44 px em alvos de toque;
- foco visível com contorno teal e offset;
- ícone sempre com `aria-hidden="true"` quando decorativo;
- não usar dois botões primários no mesmo bloco;
- texto de ação começa com verbo: “Abrir dossiê”, “Salvar alterações”, “Enviar laudo”.

### 4.4 Tags e estados

- `Tag` com tons `teal`, `blue`, `amber`, `neutral`, `rust`.
- Estado nunca depende só de cor: incluir rótulo textual.
- Tags de metadados são curtas; não transformar frase em tag.

### 4.5 Painéis

- `aside-panel` para fatos, privacidade, administração e dados da conta.
- `page-section` para conteúdo principal.
- Borda de 1 px, fundo raised, sombra mínima.
- Não aninhar cartões dentro de cartões sem necessidade.

### 4.6 Formulários

- Rótulo sempre visível; placeholder não substitui rótulo.
- Texto de ajuda em `field__hint`.
- Erro em `field-feedback--error` com ícone e `role="alert"`.
- Sucesso em `inline-feedback--ok` com `role="status"`.
- Campos inválidos com `aria-invalid` e vínculo ao erro.
- Botão de envio desabilitado apenas durante operação; explicar o estado.

### 4.7 Dossiê de caso

O caso é o componente mais complexo do sistema. A ordem visual é:

1. **cabeçalho:** código, título, subtítulo, dificuldade, duração e competências;
2. **aviso de simulação:** dados sintéticos e limite educacional;
3. **contexto e escopo:** o que aconteceu, o que o aluno pode fazer;
4. **metadados:** rubrica, fases, fontes, aprovação;
5. **abas:** Visão geral, Custódia (quando houver), Evidências/Exame, Registro, Hipóteses, Linha do tempo, Quesitos (quando houver), Relatório/Laudo;
6. **conteúdo da fase:** tarefa, critérios e ação;
7. **navegação inferior:** fase anterior/próxima, com estado e bloqueio.

Regras:
- abas são botões com `aria-selected`, `role="tab"` e painel associado;
- a fase atual é indicada por texto, não só por cor;
- evidência tem ID, título, tipo, relógio, origem, lacre, hash e botão de abrir;
- custódia usa três estados: documentado, ausente, não aplicável;
- quesitos têm extensão mínima, palavras-chave e resposta de referência após envio;
- o laudo separa fatos, análise, limitações e recomendações em campos próprios;
- o gabarito só aparece após a submissão.

### 4.8 Atividades

O briefing de exercício é um bloco antes da pergunta:

- objetivo;
- conhecimentos mobilizados;
- apoio;
- desafio;
- etapas;
- evidência esperada;
- critérios.

Visualmente: fundo teal-wash, borda esquerda teal, tipografia menor, lista curta. Não usar acordeão para esconder objetivo ou critério.

Formatos:
- `mcq`: alternativas com rationale após correção;
- `short`: campo com resposta normalizada;
- `subnet`: cinco campos numéricos;
- `order`: lista com botões de mover;
- `multi`: seleção múltipla com justificativa;
- `classify`: itens com seletor de categoria;
- `match`: colunas com seletor de correspondência.

Feedback sempre textual: “correto”, “incorreto”, “parcial”, com explicação. Não usar confete, som ou animação de recompensa.

### 4.9 Progresso

- Números grandes em mono para contagem, mas sempre com rótulo e contexto.
- Barra de progresso com `role="progressbar"` e valor acessível.
- Histórico de atividade em lista, com tipo, horário e link.
- Nunca mostrar “streak”, “tempo de estudo” ou métrica que o produto não mede.

### 4.10 Laboratórios

- Introdução clara antes da bancada.
- Banner de simulação no topo.
- Terminal com foco, histórico e comandos interpretados.
- Saída em mono, com contraste alto.
- Conclusão com resultado, evidências, erros/limites e próximo passo.
- Não simular ferramentas externas que não são executadas.

## 5. Acessibilidade

### 5.1 Estrutura

- Um `h1` por página; hierarquia sem saltos.
- Link de salto para `#conteudo`.
- `main` com `tabIndex={-1}` para foco após navegação.
- `nav` com rótulo; breadcrumb com `aria-current="page"`.
- Regiões de status com `role="status"`; erros com `role="alert"`.

### 5.2 Teclado e foco

- Todos os controles são alcançáveis por `Tab`.
- Foco visível em `:focus-visible`, com contorno teal e offset.
- Menu mobile: abre, prende o foco, fecha com `Esc` e devolve o foco ao botão.
- Abas: setas, Home e End quando implementadas; caso contrário, botões com `aria-selected`.
- Nenhuma ação depende de hover.

### 5.3 Nomes acessíveis

- O texto visível deve estar contido no nome acessível.
- Evitar `aria-label` que substitua o texto visível por uma versão diferente.
- Links de conta usam o texto visível (nome + nível), sem `aria-label` redundante.
- Ícones decorativos usam `aria-hidden="true"`.

### 5.4 Contraste e movimento

- Contraste mínimo AA; AAA quando o texto é pequeno e o par permite.
- `prefers-contrast: more` reforça linhas e campos.
- `prefers-reduced-motion: reduce` remove transições de topologia e progresso.
- Não usar texto sobre imagem ou gradiente.

### 5.5 Formulários e erros

- Rótulo programático e visível.
- Erro associado ao campo, com texto que explica como corrigir.
- Não limpar o formulário em caso de erro.
- Mensagens de sucesso não escondem a próxima ação.

## 6. Conteúdo e voz

### 6.1 Tom

- Direto, técnico e calmo.
- Explica o porquê antes de exigir.
- Não infantiliza, não usa jargão sem contexto.
- Não promete certeza que a evidência não sustenta.
- Usa “pode indicar”, “é compatível com”, “não permite concluir” quando apropriado.

### 6.2 Padrões de texto

| Situação | Formulação |
| --- | --- |
| limite | “Os dados disponíveis não permitem afirmar…” |
| hipótese | “Uma hipótese compatível é…” |
| ausência | “Não foi localizado neste recorte; isso não prova que não ocorreu.” |
| ação | “Abrir dossiê”, “Registrar evidência”, “Enviar laudo” |
| erro | “Não foi possível salvar. Verifique a conexão e tente novamente.” |
| sucesso | “Progresso registrado na sua conta.” |

### 6.3 O que evitar

- “Conta local”, “instalação local”, “sem sincronização”;
- “prova definitiva”, “autor identificado” sem base;
- “hacker”, “invadido” como diagnóstico;
- números inventados, depoimentos ou logs decorativos;
- “clique aqui”;
- exclamações em excesso;
- texto que promete laudo oficial.

## 7. Implementação

| Arquivo | Responsabilidade |
| --- | --- |
| `src/styles/tokens.css` | cores, tipo, espaço, raio, sombra, movimento |
| `src/styles/base.css` | reset, tipografia, foco, reduced motion |
| `src/styles/layout.css` | shell, cabeçalho, menu, rodapé, conteúdo |
| `src/styles/components.css` | botões, tags, campos, feedback, tabelas |
| `src/styles/home.css` | visão geral e hero |
| `src/styles/learning.css` | trilhas, lições, exercícios e briefing |
| `src/styles/case.css` | dossiê, evidências, custódia, quesitos, laudo |
| `src/styles/labs.css` | bancada escura, terminal, topologia |
| `src/styles/auth.css` | login, cadastro, recuperação, boas-vindas |
| `src/styles/admin.css` | administração e tabelas de contas |
| `src/styles/responsive.css` | ajustes finais, contraste, impressão |
| `src/components/ui.tsx` | PageHeader, SectionHeading, Tag, EmptyState, Callout |
| `src/components/AppShell.tsx` | navegação, breadcrumb, conta, menu mobile |
| `src/components/ExercisePlayer.tsx` | briefing e formatos de exercício |
| `src/pages/CasePage.tsx` | dossiê e fases do caso |

## 8. Governança

Antes de adicionar um componente:

1. ele resolve um problema recorrente ou semântico?
2. usa tokens existentes?
3. tem estado de foco, erro, vazio e carregamento quando aplicável?
4. funciona em 375 px sem overflow?
5. o nome acessível contém o texto visível?
6. a decoração comunica algo?

Se a resposta for “não” para as perguntas 1, 3, 4 ou 5, o componente não está pronto.

### Critérios de aceite visual

- 375, 768 e 1280 px sem rolagem horizontal;
- nenhum texto cortado ou sobreposto;
- contraste AA em texto e controles;
- foco visível em todos os elementos interativos;
- teclado percorre a página em ordem lógica;
- `prefers-reduced-motion` respeitado;
- impressão do caso sem cabeçalho, menu ou botões;
- nenhuma métrica fictícia.

## 9. Exemplo de composição

Uma página de caso deve parecer um dossiê:

```
[ código ] [ título ]                         [ ação principal ]
subtítulo / metadados / competências
──────────────────────────────────────────────────────────────
aviso de simulação
contexto e escopo                    | rubrica e fatos
──────────────────────────────────────────────────────────────
abas: Visão geral | Custódia | Exame | Registro | ...
──────────────────────────────────────────────────────────────
tarefa da fase
critérios
[ fonte E-01 ] [ fonte E-02 ] ...
[ ação da fase ]                     [ próxima fase ]
```

O que não fazer:

- grade de seis cartões iguais para “contexto, objetivo, escopo, rubrica, fases, evidências”;
- números grandes sem unidade ou fonte;
- gráfico decorativo;
- fundo escuro na página inteira;
- gradiente teal;
- ícones sem rótulo;
- tabela que vira texto espremido no mobile.
