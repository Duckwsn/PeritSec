# Caso pericial — O IP não é uma pessoa

**Código:** CASO-2026-042  
**Tipo:** caso criminal fictício, interativo, de nível avançado  
**Duração estimada:** 70 minutos  
**Rota:** `/casos/autoria-e-o-ip`  
**Competências:** perícia digital, segurança, redes, leitura de logs, custódia, correlação e método investigativo

> **Aviso:** todos os personagens, a organização, os endereços, os logs, o tablet e a operadora são fictícios. Os endereços usados pertencem a faixas reservadas para documentação. O caso não usa dados de saúde reais, credenciais reais ou pessoas reais. O laudo produzido no exercício não é peça pericial oficial e não tem validade judicial.

## 1. Situação

A Clínica-Escola Horizonte (fictícia) comunica que o prontuário acadêmico 014 foi acessado fora do horário de atendimento. A aplicação registrou a sessão em **3 de outubro de 2026, às 22:41 BRT**, a partir do endereço público **198.51.100.77**.

A suspeita inicial recai sobre **M. B.**, ex-colaborador mencionado por colegas. Um tablet atribuído a essa pessoa foi apreendido e periciado. A operadora responde a um ofício informando que o endereço público é compartilhado por **CGNAT** e que não forneceu identidade civil, endereço ou dispositivo.

O aluno deve responder:

1. houve acesso?
2. é possível individualizar quem acessou?
3. a cadeia de custódia está completa?
4. o que falta para uma resposta defensável?

## 2. Objetivos de aprendizagem

- distinguir o registro técnico de um acesso da identificação de uma pessoa ou dispositivo;
- explicar por que um IP público sujeito a CGNAT não individualiza autoria;
- avaliar a cadeia de custódia pelo que o auto documenta e pelo que ele omite;
- normalizar horários entre provedor em UTC e aplicação em BRT;
- responder a quesitos com linguagem técnica, limites explícitos e diligências complementares;
- reconhecer que ausência de registro não é prova de não autoria.

## 3. Materiais simulados

| ID | Material | Origem fictícia | Relógio | Relevância |
| --- | --- | --- | --- | --- |
| E-01 | `prontuario-access.log` | aplicação do prontuário | BRT (UTC-3) | crítica |
| E-02 | `auth-prontuario.log` | serviço de identidade | BRT (UTC-3) | de apoio |
| E-03 | `oficio-042-operadora.txt` | Operadora Exemplo S.A. | tabela em UTC; resposta em BRT | crítica |
| E-04 | `edge-flow.log` | provedor de hospedagem | UTC (UTC+0) | de apoio |
| E-05 | `auto-custodia-042.md` | núcleo técnico | BRT (UTC-3) | crítica |
| E-06 | `aquisicao-IMG-042.txt` | sala de exame | BRT; relógio do tablet +3 min | de apoio |
| E-07 | `controle-acesso.txt` | administração do prontuário | BRT (UTC-3) | crítica |
| E-08 | `atendimento-042.txt` | coordenação da clínica | BRT (UTC-3) | de apoio |

### 3.1 O que cada fonte permite afirmar

- **E-01:** houve tentativa de entrada, falha de senha, autenticação, leitura do prontuário 014, consulta ao histórico e saída. O IP de origem é o mesmo em todas as requisições. O `user-agent` é genérico e não identifica dispositivo ou pessoa.
- **E-02:** a credencial `plantao-prontuario` falhou uma vez e autenticou em seguida, sem MFA. O log registra a credencial, não o operador individual.
- **E-03:** o IP público é compartilhado por CGNAT. Na janela, há seis conexões da sessão (três portas de origem reutilizadas), todas traduzidas para `100.64.12.34:41022`; a operadora afirma que o IP é compartilhado com outros assinantes. Não informa identidade civil, endereço ou dispositivo.
- **E-04:** o firewall do provedor confirma as conexões ao servidor `203.0.113.10:443` em UTC. Não vê a tradução CGNAT nem o assinante.
- **E-05:** o auto identifica o tablet, o lacre `LAC-042-01`, data, hora, entregador, recebedor e método. Deixa em branco transferências internas, sincronização de relógios e acesso ao armário.
- **E-06:** o exame lógico do tablet registra hash, método e limitações. O histórico de um navegador não contém o domínio do prontuário. O relógio do aparelho estava três minutos adiantado.
- **E-07:** a credencial era compartilhada por três profissionais; o sistema não registrava o operador; MFA não era exigido.
- **E-08:** a clínica registra a suspeita inicial e admite que não havia vídeo, controle de acesso físico, biometria ou registro individual de sessão. A suspeita não foi confirmada tecnicamente.

## 4. Linha do tempo normalizada

| Ordem | Evento | Horário de origem | Horário normalizado (BRT) | Fonte |
| --- | --- | --- | --- | --- |
| 1 | Firewall do provedor registra conexão HTTPS do IP público ao servidor | `01:39:58Z` | `2026-10-03 22:39:58` | E-04 |
| 2 | Tentativa de autenticação falha por senha | `22:40:31 -03:00` | `2026-10-03 22:40:31` | E-01 / E-02 |
| 3 | Credencial de setor autentica sem MFA | `22:41:05 -03:00` | `2026-10-03 22:41:05` | E-02 |
| 4 | Prontuário 014 é lido e o histórico é consultado | `22:41:07 -03:00` | `2026-10-03 22:41:07` | E-01 |
| 5 | Clínica registra o acesso fora do horário e comunica o núcleo técnico | `04/10/2026 08:12 BRT` | `2026-10-04 08:12:00` | E-08 |
| 6 | Tablet é recebido, lacrado e acondicionado | `05/10/2026 14:20 BRT` | `2026-10-05 14:20:00` | E-05 |
| 7 | Aquisição lógica do tablet é concluída | `06/10/2026 10:05 BRT` | `2026-10-06 10:05:00` | E-06 |
| 8 | Operadora responde ao ofício com seis conexões CGNAT | `07/10/2026 16:40 BRT` | `2026-10-07 16:40:00` | E-03 |

**Cuidados:** E-04 e E-03 usam UTC; E-01, E-02, E-05 e E-08 usam BRT. O tablet está três minutos adiantado, mas isso não altera os logs do servidor. A ordem não deve ser confundida com a data de produção do documento.

## 5. Hipóteses

| ID | Hipótese | Estado esperado | Justificativa |
| --- | --- | --- | --- |
| H-01 | O IP 198.51.100.77 identifica, por si só, o dispositivo que acessou | refutada | E-03 declara CGNAT e registra seis conexões; E-04 vê apenas o IP público |
| H-02 | O acesso ocorreu, mas os elementos não individualizam a pessoa | sustentada | E-01/E-02 documentam a sessão; E-03 e E-07 explicam o limite |
| H-03 | O tablet é o único dispositivo compatível porque estava na residência de M. B. | insuficiente | não há prova de presença, rede doméstica ou uso exclusivo |
| H-04 | A credencial `plantao-prontuario` permite atribuir o acesso a um profissional específico | refutada | E-07 registra credencial coletiva e ausência de operador individual |
| H-05 | A ausência do domínio no histórico do tablet prova que M. B. não acessou | insuficiente | E-06 limita o alcance do histórico; ausência não prova não autoria |

A distinção entre **refutada** e **insuficiente** é parte central do exercício. Uma hipótese refutada contradiz uma fonte; uma hipótese insuficiente não tem dados para ser confirmada ou excluída.

## 6. Custódia

O aluno classifica cada item como **documentado** ou **ausente** e justifica.

| ID | Item | Estado | Leitura correta |
| --- | --- | --- | --- |
| C-01 | Identificação do material, lacre e data/hora | documentado | E-05 descreve tablet, série, lacre e recebimento |
| C-02 | Responsáveis pela entrega e pelo recebimento | documentado | E-05 nomeia entregador e recebedor |
| C-03 | Método de aquisição e cópia de trabalho | documentado | E-05 e E-06 confirmam aquisição lógica e cópia |
| C-04 | Transferência interna entre recebimento e exame | ausente | campo não preenchido; não há termo intermediário |
| C-05 | Verificação de sincronização dos relógios | ausente | campo em branco; tablet +3 min; fontes não conferidas |
| C-06 | Registro de acesso ao armário de evidências | ausente | não há registro de quem acessou, quando ou por quê |

**Consequência:** lacre e hash documentam integridade parcial, mas não substituem a continuidade da posse. A cadeia de custódia não está completa.

## 7. As oito fases

| Fase | Tarefa | Evidência produzida |
| --- | --- | --- |
| 1. Recebimento | ler o dossiê, o escopo e os objetivos | aceite do escopo e ciência dos limites |
| 2. Custódia | classificar os seis itens de custódia | checklist fundamentado |
| 3. Exame | abrir as oito fontes e registrar anotações | anotações por fonte, fatos e hipóteses separados |
| 4. Registro | selecionar as três fontes que sustentam o limite | trio E-01, E-03 e E-07 |
| 5. Hipóteses | classificar as cinco hipóteses | sustentada, refutada ou insuficiente |
| 6. Cronologia | ordenar os oito eventos normalizando fusos | linha do tempo correta |
| 7. Quesitos | responder aos quatro quesitos | respostas técnicas com limites |
| 8. Laudo | escolher a conclusão, apontar a afirmação não sustentada e escrever o laudo | rubrica de 100 pontos |

### 7.1 Seleção de fontes

O trio direto é:

- **E-01** — o acesso e a leitura do prontuário;
- **E-03** — a natureza compartilhada do IP público por CGNAT;
- **E-07** — a credencial coletiva sem operador individual.

E-02 corrobora a autenticação; E-04 corrobora horários; E-05 e E-06 documentam custódia e exame; E-08 registra a suspeita inicial. Nenhuma delas, isolada, sustenta o limite da conclusão.

## 8. Quesitos

| ID | Quesito | Critério de resposta |
| --- | --- | --- |
| Q-01 | O IP 198.51.100.77, por si só, identifica a pessoa que acessou? | diferenciar IP público, CGNAT, assinante, dispositivo e pessoa; citar a correlação de porta, data e hora |
| Q-02 | O que os registros permitem concluir sobre a autoria? | separar acesso documentado de autoria indeterminada; considerar credencial coletiva e tablet |
| Q-03 | A cadeia de custódia está completa? Quais são as lacunas? | citar transferências, relógios e acesso ao armário; relacionar a riscos |
| Q-04 | Que diligências poderiam esclarecer a autoria? | propor medidas proporcionais, verificáveis e compatíveis com a legislação |

Cada resposta exige pelo menos 140 caracteres e precisa conter os conceitos centrais. Termos que afirmam autoria individual sem base são bloqueados na avaliação.

## 9. Rubrica

| Critério | Peso | O que é avaliado |
| --- | --- | --- |
| Conclusão sobre a autoria | 15 | reconhecer o acesso e o limite probatório do IP e da credencial |
| Limite da conclusão | 5 | identificar a afirmação que ultrapassa o conjunto |
| Correlação de fontes | 10 | selecionar E-01, E-03 e E-07 |
| Teste de hipóteses | 10 | separar sustentada, refutada e insuficiente |
| Cronologia | 10 | normalizar UTC/BRT e preservar a ordem |
| Custódia e integridade | 10 | distinguir documentado de ausente |
| Quesitos | 20 | responder com fundamento, limite e diligência |
| Laudo | 20 | separar fatos, análise, lacunas e recomendações |

**Total:** 100. **Aprovação:** 70.

A rubrica valoriza mais os quesitos e o laudo porque o caso não termina na identificação de um “culpado”. Termina na qualidade da resposta técnica e na clareza do que não foi possível concluir.

## 10. Laudo de referência

### 10.1 Fatos e vestígios verificados

Em 3 de outubro de 2026, entre 22:39:58 e 22:42:14 BRT, a aplicação registrou conexões do IP público 198.51.100.77. Houve falha de senha às 22:40:31 e autenticação da credencial `plantao-prontuario` às 22:41:05. Às 22:41:07, o prontuário 014 foi lido com HTTP 200; o histórico foi consultado às 22:41:26. O firewall do provedor registrou as mesmas conexões entre 01:39:58Z e 01:42:14Z. A operadora declarou CGNAT e seis conexões da sessão na janela, todas traduzidas para `100.64.12.34:41022`, sem informar identidade civil, endereço ou dispositivo. O auto de custódia registra identificação, lacre, data, hora, responsáveis e método, mas deixa em branco transferências internas, sincronização de relógios e acesso ao armário. O tablet tem hash de imagem registrado; o histórico de um navegador não contém o domínio; o relógio do aparelho estava três minutos adiantado.

### 10.2 Análise técnico-pericial

O acesso ao prontuário é tecnicamente demonstrável pelos logs da aplicação e da autenticação. A autoria não pode ser individualizada: o IP público é compartilhado por CGNAT; a credencial era coletiva; o serviço não registrava o operador individual. A correlação de porta, data e hora pode apontar um assinante, mas não identifica a pessoa que operou o dispositivo, e a operadora não forneceu identidade civil. O histórico do tablet não localizou o domínio, mas a ausência em um recorte não prova não autoria. A suspeita inicial é hipótese de investigação, não conclusão pericial.

### 10.3 Limitações e lacunas

- os logs são recortes; a ausência de eventos não prova que eles nunca ocorreram;
- não há identificação civil do assinante, endereço de instalação, dispositivo, vídeo, biometria ou registro individual de sessão;
- a cadeia de custódia tem lacunas documentais;
- o relógio do tablet estava três minutos adiantado;
- o histórico do navegador não cobre navegação privada, outros perfis, outros navegadores ou outros dispositivos;
- o hash atesta integridade da cópia, não veracidade histórica dos fatos.

### 10.4 Diligências e recomendações

- requisitar à operadora a correlação entre porta, data, hora e assinante, com preservação dos logs NAT e de autenticação;
- preservar os logs originais com hash e documentar toda a cadeia de custódia, inclusive transferências, acesso ao armário e sincronização de relógios;
- substituir a credencial compartilhada por contas individuais com MFA e registrar o operador em cada sessão;
- ampliar o exame do tablet para outros perfis, navegadores e artefatos, sem tratar ausência como prova de não autoria;
- conferir relógios das fontes e documentar a normalização de fusos;
- reavaliar a hipótese de autoria apenas com um conjunto probatório complementar, nunca com o IP isolado.

## 11. Conclusão esperada

A única conclusão compatível com o conjunto é:

> O acesso partiu de um IP público compartilhado por CGNAT e de uma credencial coletiva; os elementos disponíveis não individualizam pessoa ou dispositivo, e a autoria permanece indeterminada.

As conclusões incorretas típicas são:

- atribuir o acesso a M. B. porque o IP estaria associado à sua linha;
- negar o acesso porque o endereço é reservado para documentação;
- afirmar que a operadora confirmou a identidade do assinante;
- concluir que o tablet não foi usado porque o domínio não está no histórico.

## 12. Base normativa

As referências abaixo foram conferidas no site do Planalto. A citação é educacional e não substitui consulta jurídica, competência, autorização ou análise do caso concreto.

| Norma | Dispositivo | Uso no caso |
| --- | --- | --- |
| Código de Processo Penal | arts. 158-A a 158-F | cadeia de custódia: reconhecimento, isolamento, fixação, coleta, acondicionamento, transporte, recebimento, processamento, armazenamento e descarte |
| Código de Processo Penal | art. 159, caput e § 3º | perito oficial no exame de corpo de delito e outras perícias; faculdade de formulação de quesitos e indicação de assistente técnico |
| Lei nº 12.965/2014 — Marco Civil da Internet | arts. 10, 13, 15 e 22 | guarda e disponibilização de registros de conexão e de acesso a aplicações, com proteção de dados e hipóteses legais de fornecimento |
| Lei nº 13.709/2018 — LGPD | princípios e bases legais | tratamento de dados pessoais com finalidade, necessidade, segurança e prestação de contas |
| Lei nº 14.155/2021 | alterações penais | contexto de crimes patrimoniais e informáticos; não qualifica a conduta do exercício |

Links oficiais:

- CPP: <https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689compilado.htm>
- Marco Civil: <https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm>
- LGPD: <https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm>
- Lei 14.155/2021: <https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14155.htm>

## 13. Limites do exercício

- Não há acesso a sistemas reais, operadoras reais, bases de prontuário ou dispositivos de terceiros.
- Não há malware, exploração, quebra de senha ou aquisição forense real.
- O hash é calculado sobre o texto exibido e demonstra integridade da cópia; não autentica origem histórica.
- O laudo é educacional. Não constitui prova, parecer, laudo oficial ou opinião jurídica.
- A conclusão de autoria indeterminada não é uma falha do exercício: é o resultado tecnicamente correto diante das fontes disponíveis.

## 14. Condução sugerida

1. Peça ao aluno para ler o escopo e dizer, com suas palavras, o que não está autorizado.
2. Antes de abrir as fontes, peça uma previsão: o que um IP público costuma provar? A resposta inicial pode ser corrigida ao final.
3. Durante o exame, exija uma nota por fonte com duas colunas: “o que este registro mostra” e “o que ele não mostra”.
4. Na custódia, peça a diferença entre “campo preenchido” e “etapa documentada”.
5. Na cronologia, faça converter UTC para BRT antes de ordenar.
6. Nos quesitos, proíba a palavra “culpado” e peça uma frase de limite.
7. No laudo, avalie primeiro a separação entre fato, inferência, lacuna e recomendação; depois a conclusão.

## 15. Erros comuns e feedback

| Erro | Por que ocorre | Feedback |
| --- | --- | --- |
| “O IP é do suspeito, então foi ele.” | confundir endereço com identidade | o IP localiza uma conexão; CGNAT e credencial coletiva impedem individualização |
| “Não há prova, então nada aconteceu.” | confundir ausência de evidência com evidência de ausência | E-01 e E-02 documentam o acesso; o limite é de autoria, não de ocorrência |
| “O tablet não tem o site, então está inocente.” | superestimar o alcance do histórico | E-06 declara que o histórico não cobre todos os meios de acesso |
| “A custódia está ok porque tem lacre.” | reduzir custódia a um único controle | lacre e hash não substituem transferências, relógios e acesso ao armário |
| “A operadora confirmou o assinante.” | ler a resposta além do que ela diz | a operadora forneceu conexões e negou identidade civil, endereço e dispositivo |
