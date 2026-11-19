# Mapa pedagógico do PeritSec

## 1. Proposta

O PeritSec organiza o aprendizado em torno de competências observáveis, não de tempo de permanência. Cada unidade combina cinco movimentos:

1. **entender** o conceito;
2. **observar** um artefato ou cenário;
3. **experimentar** com uma ferramenta determinística;
4. **interpretar** os resultados;
5. **concluir** com limites explícitos.

A pergunta central de qualquer atividade é: *que evidência o aluno produziu e o que ela permite afirmar?*

## 2. Níveis

Os quatro níveis são pontos de partida e patamares de demonstração. Eles não são “liberações automáticas” de conteúdo.

| Nível | Ponto de partida | O que muda | Critério de demonstração |
| --- | --- | --- | --- |
| Iniciante | começa do zero ou precisa consolidar fundamentos | recomendação começa pelas lições de redes | competências de fundamentos de redes + endereçamento |
| Curioso | explora por interesse, com orientação | catálogo inicial mais amplo, ainda com pré-requisitos | fundamentos + endereçamento demonstrados |
| Intermediário | já entende fundamentos e quer diagnosticar | recomendação prioriza método e serviços | protocolos e serviços + diagnóstico demonstrados |
| Avançado | quer investigações complexas e correlação | acesso a casos que exigem método pericial | leitura de logs + custódia + correlação demonstradas |

### 2.1 Nível inicial, demonstrado e efetivo

- **Nível inicial:** escolhido no cadastro. Orienta a recomendação e o ponto de partida.
- **Nível demonstrado:** calculado pelas competências associadas a conteúdos concluídos.
- **Nível efetivo:** o maior entre inicial e demonstrado.

O nível efetivo nunca reduz o nível inicial. Um iniciante que demonstra competências sobe; um avançado não recebe dispensa de pré-requisitos. Mudar o nível inicial não apaga progresso nem desbloqueia conteúdo sem competência.

## 3. Competências

| ID | Competência | Evidência típica |
| --- | --- | --- |
| `fundamentos-redes` | Fundamentos de redes | explicar encapsulamento e caminho do pacote |
| `enderecamento` | Endereçamento IPv4 | calcular rede, broadcast e faixa de hosts |
| `diagnostico-redes` | Diagnóstico de conectividade | escolher testes discriminantes e justificar a causa |
| `protocolos-servicos` | Protocolos e serviços | relacionar TCP, UDP, DNS e DHCP ao sintoma |
| `segmentacao` | Segmentação e firewall | distinguir VLAN, roteamento, filtro e TLS |
| `metodo-investigativo` | Método investigativo | delimitar escopo, registrar intervenção e separar fato de inferência |
| `analise-logs` | Leitura de logs | localizar eventos, normalizar horários e reconhecer lacunas |
| `custodia-integridade` | Custódia e integridade | documentar posse, lacre, hash e limites da verificação |
| `correlacao-evidencias` | Correlação de evidências | cruzar fontes sem confundir correlação com causa |
| `cripto-aplicada` | Criptografia aplicada | diferenciar codificação, hash e cifra com cálculo verificável |

## 4. Trilhas e módulos

### Trilha A — Fundamentos de Redes

**Resultado:** explicar como um pacote chega ao destino e localizar em que camada uma falha começa.

| Módulo | Status | Conteúdo |
| --- | --- | --- |
| Fundamentos em prática | disponível | 5 lições + simulador de rede |
| Serviços, wireless e operação | em expansão | DHCP relay, DNS autoritativo, Wi-Fi, MTU e latência |

Lições: `caminho-do-pacote`, `ipv4-cidr`, `arp-gateway-rota`, `tcp-udp-dns-dhcp`, `vlans-firewall-tls`.

### Trilha B — Administração e Troubleshooting

**Resultado:** conduzir um diagnóstico reproduzível, alterando o mínimo necessário e justificando a causa.

| Módulo | Status | Conteúdo |
| --- | --- | --- |
| Diagnóstico em campo | disponível | método + simulador de rede |
| Cenários avançados | em expansão | intermitência, perda, MTU, DHCP relay e firewall |

Lição: `metodo-troubleshooting`.

### Trilha C — Cibersegurança

**Resultado:** explicar um comportamento de rede com evidências e reconhecer o que ainda não pode ser afirmado.

| Módulo | Status | Conteúdo |
| --- | --- | --- |
| Detecção e análise | disponível | log + laboratório de tráfego |
| Resposta e contenção | em expansão | reconstrução, contenção, comunicação e exfiltração |

Lição: `log-a-incidente`.

### Trilha D — Perícia Digital e Forense de Redes

**Resultado:** reconstruir um incidente a partir de fontes múltiplas, separar fato de inferência, comunicar limitações e reconhecer quando a autoria não pode ser individualizada.

| Módulo | Status | Conteúdo |
| --- | --- | --- |
| Método pericial | disponível | custódia, vestígio, laudo, laboratório de tráfego e caso do portal |
| Atribuição e limites | disponível | lição sobre IP + caso criminal com CGNAT, credencial coletiva e custódia incompleta |

Lições: `custodia-integridade`, `vestigio-evidencia`, `ip-nao-e-pessoa`, `laudo-e-quesitos`.

Casos: `portal-fora-do-ar` e `autoria-e-o-ip`.

### Trilha E — Criptografia e Criptoanálise

**Resultado:** classificar transformações, calcular resultados verificáveis e reconhecer os limites da recuperação.

| Módulo | Status | Conteúdo |
| --- | --- | --- |
| Transformações e limites | disponível | lição + laboratório com César, Vigenère, Base64 e SHA-256 |
| Criptoanálise aplicada | em expansão | frequência assistida, formatos e limites de dicionário |

Lição: `codificacao-hash-cifra`.

## 5. Inventário atual

| Tipo | Quantidade | Observação |
| --- | --- | --- |
| Trilhas | 5 | A–E, com dois módulos cada |
| Lições | 12 | todas com exercícios e feedback |
| Laboratórios | 3 | rede, tráfego e criptografia |
| Casos completos | 2 | portal e autoria |
| Casos em preparação | 2 | integridade de arquivo e possível exfiltração |
| Formatos de exercício | 7 | mcq, short, subnet, order, multi, classify, match |
| Níveis | 4 | iniciante, curioso, intermediário, avançado |
| Competências | 10 | ver tabela acima |

## 6. Pré-requisitos

A regra é declarativa e fica em `shared/progression.mjs`. O servidor revalida qualquer novo registro de conteúdo.

| Conteúdo | Nível mínimo | Pré-requisitos de conteúdo | Competências exigidas |
| --- | --- | --- | --- |
| `caminho-do-pacote` | iniciante | — | — |
| `ipv4-cidr` | iniciante | — | — |
| `lab-redes` | iniciante | — | — |
| `arp-gateway-rota` | curioso | `ipv4-cidr` | — |
| `tcp-udp-dns-dhcp` | curioso | `arp-gateway-rota` | — |
| `vlans-firewall-tls` | curioso | `tcp-udp-dns-dhcp` | — |
| `metodo-troubleshooting` | curioso | — | — |
| `codificacao-hash-cifra` | curioso | — | — |
| `lab-cripto` | curioso | — | — |
| `log-a-incidente` | intermediário | — | — |
| `custodia-integridade` | intermediário | — | — |
| `vestigio-evidencia` | intermediário | `log-a-incidente`, `custodia-integridade` | `custodia-integridade` |
| `ip-nao-e-pessoa` | intermediário | `vestigio-evidencia` | `analise-logs`, `correlacao-evidencias` |
| `laudo-e-quesitos` | avançado | `vestigio-evidencia`, `ip-nao-e-pessoa`, `custodia-integridade` | `custodia-integridade`, `correlacao-evidencias` |
| `lab-trafego` | curioso | `tcp-udp-dns-dhcp`, `log-a-incidente` | — |
| `portal-fora-do-ar` | avançado | `tcp-udp-dns-dhcp`, `log-a-incidente`, `custodia-integridade`, `lab-trafego`, `metodo-troubleshooting` | `protocolos-servicos`, `analise-logs`, `custodia-integridade`, `correlacao-evidencias`, `metodo-investigativo` |
| `autoria-e-o-ip` | avançado | `ip-nao-e-pessoa`, `laudo-e-quesitos`, `log-a-incidente`, `custodia-integridade` | `analise-logs`, `custodia-integridade`, `correlacao-evidencias` |

### 6.1 Histórico e acesso

- Conteúdo concluído continua acessível para revisão, mesmo que o nível inicial mude.
- Conteúdo bloqueado não é liberado por abrir a URL. A página mostra o que falta.
- O modo administrativo ignora nível e pré-requisitos, mas não cria conclusões.
- O servidor recusa gravar um novo conteúdo sem os requisitos; registros históricos podem ser atualizados.

## 7. Formatos de atividade

| Formato | O que exige | Exemplo de evidência |
| --- | --- | --- |
| `mcq` | escolher uma alternativa e justificar | diagnóstico de sintoma |
| `short` | formular resposta curta normalizada | nome de protocolo, comando, conceito |
| `subnet` | calcular rede, broadcast, faixa e hosts | endereçamento IPv4 |
| `order` | reconstruir uma sequência | DORA, handshake, cronologia |
| `multi` | selecionar todas as afirmações sustentadas | correlação de fontes |
| `classify` | separar itens em categorias | fato / inferência / lacuna; documentado / ausente |
| `match` | relacionar conceitos, fontes ou efeitos | técnica e limite; evidência e conclusão |

Cada exercício pode declarar:

- **contexto:** situação que dá sentido à pergunta;
- **objetivo:** o que o aluno deve demonstrar;
- **conhecimentos:** conceitos mobilizados;
- **apoio:** material de consulta curto;
- **desafio:** o que torna a tarefa exigente;
- **etapas:** roteiro de trabalho sem entregar a resposta;
- **evidência:** o que deve ser registrado;
- **critérios:** o que torna a resposta defensável;
- **resposta de referência:** conferência após a correção.

## 8. Avaliação

### 8.1 Exercícios

- Correção determinística, com variações controladas de caixa, acento e espaço em respostas curtas.
- Sub-rede é verificada por valores numéricos, não por comparação textual.
- Feedback explica o erro e por que a alternativa correta se sustenta.
- A pontuação é limitada a 100 por competência.
- Refazer não apaga a melhor pontuação nem o registro de conclusão.

### 8.2 Casos

O caso do portal usa rubrica de 100 pontos: causa 25, correlação 20, hipóteses 15, linha do tempo 15, limite da conclusão 5, relatório 20; aprovação a partir de 70.

O caso criminal usa: conclusão 15, limite da conclusão 5, correlação 10, hipóteses 10, cronologia 10, custódia 10, quesitos 20, laudo 20; aprovação a partir de 70. Custódia e quesitos têm peso próprio porque o caso ensina que a qualidade da conclusão depende da rastreabilidade e da resposta técnica.

### 8.3 O que não conta

- permanecer na página;
- abrir uma lição sem resolver exercícios;
- assistir a uma simulação sem alterar configuração ou responder;
- enviar relatório vazio;
- acertar por tentativa aleatória sem justificativa quando a atividade exige justificativa.

## 9. Progressão recomendada

A recomendação usa uma ordem editorial por nível inicial. Ela não concede acesso: cada item ainda passa por nível efetivo e pré-requisitos.

- **Iniciante:** caminho do pacote → IPv4/CIDR → laboratório de rede → ARP/gateway → TCP/UDP/DNS/DHCP → VLAN/firewall/TLS → método → criptografia.
- **Curioso:** IPv4/CIDR → laboratório de rede → caminho do pacote → ARP → serviços → método → criptografia → logs → custódia.
- **Intermediário:** método → serviços → ARP → IPv4 → caminho → VLAN → laboratório → criptografia → logs → custódia.
- **Avançado:** logs → custódia → vestígio → IP → laudo → método → laboratório de tráfego → casos.

Atividades já iniciadas têm prioridade para retomada. Depois vêm as próximas permitidas. Conteúdo concluído aparece para revisão.

## 10. Caso criminal no percurso

`autoria-e-o-ip` é o ponto em que o aluno aplica custódia, correlação, atribuição e laudo. Ele não é uma prova de “quem foi”, mas um exercício de limites:

- o acesso está documentado;
- o IP público é compartilhado por CGNAT;
- a credencial é coletiva;
- a custódia tem lacunas;
- o tablet não confirma nem exclui autoria;
- a conclusão defensável é a indeterminação da autoria, com diligências complementares.

O detalhamento está em `docs/CASO-PERICIAL.md`.

## 11. Acessibilidade pedagógica

- Todo conteúdo tem hierarquia de títulos, rótulos e instruções antes da tarefa.
- As atividades não dependem de cor, arrastar ou mouse.
- Ordenação usa botões de mover para cima/baixo.
- Classificação e correspondência usam seletores nativos e feedback textual.
- O foco é visível; o menu fecha com `Esc` e devolve foco.
- O relatório tem rótulos explícitos e critérios antes do envio.
- O produto respeita `prefers-reduced-motion` e `prefers-contrast`.

## 12. Lacunas pedagógicas conhecidas

1. Não há revisão espaçada com registro de revisões concluídas.
2. Não há modo instrutor com turma e visão agregada.
3. Dois casos do catálogo ainda estão em preparação.
4. A avaliação de textos livres é por extensão, palavras-chave, termos proibidos e rubrica; não há correção semântica por IA, por decisão de custo e transparência.
5. Não há certificação externa nem equivalência com formação oficial.

Essas lacunas estão declaradas para evitar que o produto pareça mais completo do que é.
