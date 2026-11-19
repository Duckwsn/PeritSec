import { sha256Hex } from '../lib/crypto'
import type { CaseDefinition, EvidenceItem } from '../lib/caseEngine'

function evidence(base: Omit<EvidenceItem, 'hash'>): EvidenceItem {
  return { ...base, hash: sha256Hex(base.content) }
}

const dhcpLog = `# dhcpd.log · DHCP-01 (10.30.0.20) · relógio em BRT (UTC-3)
# Extrato sintético preparado para o exercício. Personagens fictícios.
2026-09-14T07:48:03-03:00 dhcpd[2214]: SIGHUP: recarregando configuração (ref. CHG-441)
2026-09-14T07:50:19-03:00 dhcpd[2214]: scope 10.30.4.0/24: option domain-name-servers: 10.30.0.10 -> 8.8.8.8
2026-09-14T07:52:11-03:00 dhcpd[2214]: DHCPACK on 10.30.4.23 to 3c:7a:8f:11:20:91 (LAB-2-PC-07) via eth0
    options: subnet-mask=255.255.255.0, routers=10.30.4.1, domain-name-servers=8.8.8.8, lease-time=28800
2026-09-14T07:58:47-03:00 dhcpd[2214]: DHCPACK on 10.30.4.24 to 3c:7a:8f:11:20:92 (LAB-2-PC-08) via eth0
    options: subnet-mask=255.255.255.0, routers=10.30.4.1, domain-name-servers=8.8.8.8, lease-time=28800
2026-09-14T08:01:10-03:00 dhcpd[2214]: DHCPACK on 10.30.4.31 to 3c:7a:8f:11:20:a4 (REC-02-PC) via eth0
    options: subnet-mask=255.255.255.0, routers=10.30.4.1, domain-name-servers=8.8.8.8, lease-time=28800
2026-09-14T09:02:36-03:00 dhcpd[2214]: scope 10.30.4.0/24: option domain-name-servers: 8.8.8.8 -> 10.30.0.10 (rollback)
2026-09-14T09:03:04-03:00 dhcpd[2214]: DHCPACK on 10.30.4.23 to 3c:7a:8f:11:20:91 (LAB-2-PC-07) via eth0
    options: subnet-mask=255.255.255.0, routers=10.30.4.1, domain-name-servers=10.30.0.10, lease-time=28800
# Fim do extrato.`

const dnsLog = `# named-query.log · DNS-INT (10.30.0.10) · relógio em BRT (UTC-3)
# Extrato de consultas tipo A. Endereços e usuários fictícios.
08:04:10  10.30.5.31  portal.universidade.local.  A  NOERROR  10.10.50.20
08:04:38  10.30.5.44  portal.universidade.local.  A  NOERROR  10.10.50.20
08:05:12  10.30.5.31  intranet.universidade.local. A NOERROR  10.10.50.20
08:09:02  10.30.5.44  portal.universidade.local.  A  NOERROR  10.10.50.20
08:10:27  10.30.5.31  arquivos.universidade.local. A NXDOMAIN  -
# Observação do extrato: nenhuma consulta originada de 10.30.4.0/24 entre 08:05:00 e 09:03:00.
09:03:41  10.30.4.23  portal.universidade.local.  A  NOERROR  10.10.50.20
# Fim do extrato.`

const firewallLog = `# fw-edge.log · export UTC · extrato filtrado
# Firewall de borda fictício. Datas em UTC (UTC+0).
2026-09-14T11:05:58Z ALLOW UDP 10.30.4.23:53142 -> 8.8.8.8:53
2026-09-14T11:06:03Z ALLOW UDP 10.30.4.23:53186 -> 8.8.8.8:53
2026-09-14T11:06:12Z ALLOW UDP 10.30.4.23:53204 -> 8.8.8.8:53
2026-09-14T11:09:30Z ALLOW TCP 10.30.5.31:49822 -> 10.10.50.20:443
2026-09-14T11:10:02Z ALLOW TCP 10.30.5.44:49836 -> 10.10.50.20:443
# Observação do extrato: nenhum fluxo TCP/443 originado de 10.30.4.0/24 aparece na janela.
# Nenhum evento DENY associado ao endereço 10.10.50.20 neste recorte.`

const webLog = `# portal-access.log · PORTAL-WEB (10.10.50.20) · relógio em BRT
# Registro sintético de acesso. Endereços fictícios.
2026-09-14 08:04:55 10.30.5.31  GET  /notas     200  4182 bytes  84ms
2026-09-14 08:08:02 10.30.5.44  POST /login     302   312 bytes  41ms
2026-09-14 08:09:30 10.30.5.31  GET  /notas     200  4182 bytes  79ms
2026-09-14 08:10:13 10.30.5.31  GET  /notas     200  4182 bytes  81ms
2026-09-14 08:12:00 healthcheck                ok   uptime=39d  load=0.14
# Observação do extrato: 0 requisições originadas de 10.30.4.0/24 entre 08:05 e 09:03.
# Nenhum reinício ou erro 5xx no período.`

const pcapSummary = `# pcap-summary.txt · captura sintética no uplink do Laboratório 2
# Somente cabeçalhos. Horários em UTC. Nenhum conteúdo de aplicação foi registrado.
11:05:58.004  10.30.4.23:53142 > 8.8.8.8:53      DNS  A portal.universidade.local
11:05:58.187  8.8.8.8:53 > 10.30.4.23:53142      DNS  NXDOMAIN
11:06:03.011  10.30.4.23:53186 > 8.8.8.8:53      DNS  A portal.universidade.local
11:06:03.193  8.8.8.8:53 > 10.30.4.23:53186      DNS  NXDOMAIN
11:06:12.442  10.30.4.23:53204 > 8.8.8.8:53      DNS  A portal.universidade.local
11:06:12.621  8.8.8.8:53 > 10.30.4.23:53204      DNS  NXDOMAIN
# Observação do extrato: nenhum fluxo TCP/443 partindo de 10.30.4.23.
11:09:30.144  10.30.5.31:49822 > 10.10.50.20:443 TCP  SYN
11:09:30.146  10.10.50.20:443 > 10.30.5.31:49822 TCP  SYN, ACK
11:09:30.148  10.30.5.31:49822 > 10.10.50.20:443 TCP  ACK
# Fim do extrato.`

const changeLog = `# CHG-441 · resumo do registro de mudança (fictício)
Status: implementado; rollback executado
Janela: 14/09/2026, 07:45–07:55 BRT
Alvo: escopo DHCP 10.30.4.0/24 (VLAN 30 · Laboratório 2)
Alteração: domain-name-servers 10.30.0.10 -> 8.8.8.8
Justificativa declarada: teste de redundância de resolução externa
Solicitante registrado: ana.souza
Aprovação registrada: coordenação de infraestrutura
Execução registrada: equipe de redes
Plano de reversão: não detalhado na solicitação
Rollback: 14/09/2026 09:02 BRT, após indisponibilidade relatada
Observação: não houve teste de resolução de nomes da zona interna antes da janela
# Fim do registro.`

const authLog = `# auth-portal.log · serviço de autenticação do portal · BRT
08:03:27 user=m.silva   src=10.30.5.31 result=SUCCESS mfa=ok
08:04:12 user=j.pereira src=10.30.5.44 result=SUCCESS mfa=ok
08:07:55 user=m.silva   src=10.30.5.31 result=SUCCESS mfa=ok
# Observação do extrato: nenhuma tentativa de autenticação originada de 10.30.4.0/24.
# Nenhuma falha de senha ou bloqueio de conta no recorte.
# Fim do extrato.`

const avLog = `# av-console.log · console de endpoint fictício
12/09/2026 23:14:02  LAB-2-PC-03  ameaça=PUA:Win32/InstallCore  ação=quarentena
12/09/2026 23:15:10  LAB-2-PC-03  varredura concluída; nenhuma conexão de rede associada
# Evento fora da janela do incidente. Host diferente do LAB-2-PC-07.
# Fim do extrato.`

export const investigationCases: CaseDefinition[] = [
  {
    id: 'portal-fora-do-ar',
    code: 'CASO-2026-014',
    title: 'O portal que sumiu para um laboratório',
    subtitle: 'Indisponibilidade seletiva do portal acadêmico em uma rede com segmentação',
    difficulty: 'intermediario',
    durationMinutes: 45,
    competencies: ['forense', 'redes', 'diagnostico', 'seguranca'],
    context: [
      'Em 14 de setembro de 2026, por volta das 08:05, o professor responsável pelo Laboratório 2 de uma universidade fictícia relatou que nenhum aluno conseguia abrir o portal acadêmico. O Laboratório 1, no mesmo prédio, continuava acessando normalmente.',
      'O monitoramento do servidor do portal não indicava indisponibilidade. A equipe de plantão restaurou o serviço às 09:03, mas não produziu uma explicação técnica conclusiva. As cópias sintéticas dos registros foram entregues para análise independente.',
      'Sua tarefa é reconstruir o que aconteceu, indicar qual configuração produziu o efeito observado e separar o que as evidências realmente sustentam daquilo que exigiria outras fontes.',
    ],
    scope:
      'Exercício educacional fictício. Analise exclusivamente as cópias sintéticas fornecidas. Não há autorização para testar redes reais, identificar pessoas ou acessar sistemas de terceiros. Não utilize dados pessoais reais.',
    objectives: [
      'Delimitar a janela do incidente e diferenciar sintoma de causa.',
      'Correlacionar registros de DHCP, DNS, firewall, servidor e captura de tráfego.',
      'Normalizar horários entre fontes com fusos diferentes antes de ordenar eventos.',
      'Testar hipóteses concorrentes e reconhecer uma hipótese sem sustentação suficiente.',
      'Produzir uma conclusão com grau de confiança, limitações e recomendações.',
    ],
    constraints: [
      'Os extratos são recortes: a ausência de um evento não prova, por si só, que ele nunca ocorreu.',
      'Nomes, endereços e organizações são fictícios.',
      'A correspondência de hash atesta a integridade desta cópia sintética, não a autenticidade histórica dos fatos.',
      'O relatório não deve atribuir responsabilidade individual com base apenas no campo "solicitante" de um registro de mudança.',
    ],
    evidence: [
      evidence({
        id: 'E-01',
        title: 'Leases e opções do escopo do Laboratório 2',
        kind: 'log',
        fileName: 'dhcpd.log',
        origin: 'DHCP-01 · 10.30.0.20',
        clock: 'BRT (UTC-3)',
        collectedAt: '14/09/2026 09:20 BRT',
        collectedBy: 'equipe de plantão (fictícia)',
        method: 'Exportação de log do serviço; cópia de trabalho',
        seal: 'SEAL-014-A',
        description:
          'Mostra a alteração da opção de DNS no escopo da VLAN 30 e os leases entregues aos clientes do Laboratório 2.',
        content: dhcpLog,
        relevance: 'critical',
      }),
      evidence({
        id: 'E-02',
        title: 'Consultas recebidas pelo resolvedor interno',
        kind: 'log',
        fileName: 'named-query.log',
        origin: 'DNS-INT · 10.30.0.10',
        clock: 'BRT (UTC-3)',
        collectedAt: '14/09/2026 09:24 BRT',
        collectedBy: 'equipe de plantão (fictícia)',
        method: 'Exportação de consultas A; cópia de trabalho',
        seal: 'SEAL-014-B',
        description:
          'Extrato de consultas atendidas pelo DNS interno. A ausência de consultas de uma sub-rede é um indício, não uma prova isolada.',
        content: dnsLog,
        relevance: 'supporting',
      }),
      evidence({
        id: 'E-03',
        title: 'Eventos de firewall para DNS e HTTPS',
        kind: 'log',
        fileName: 'fw-edge.log',
        origin: 'Firewall de borda · export UTC',
        clock: 'UTC (UTC+0)',
        collectedAt: '14/09/2026 09:31 BRT',
        collectedBy: 'equipe de plantão (fictícia)',
        method: 'Filtro por endereços do incidente; exportação de cabeçalhos',
        seal: 'SEAL-014-C',
        description:
          'Registra consultas UDP/53 ao resolvedor externo e conexões HTTPS aceitas de clientes do Laboratório 1. Exige conversão de UTC para BRT.',
        content: firewallLog,
        relevance: 'supporting',
      }),
      evidence({
        id: 'E-04',
        title: 'Disponibilidade e acessos do servidor do portal',
        kind: 'log',
        fileName: 'portal-access.log',
        origin: 'PORTAL-WEB · 10.10.50.20',
        clock: 'BRT (UTC-3)',
        collectedAt: '14/09/2026 09:18 BRT',
        collectedBy: 'equipe de plantão (fictícia)',
        method: 'Exportação do log de acesso e healthcheck',
        seal: 'SEAL-014-D',
        description:
          'Mostra o portal operacional e atendendo o Laboratório 1 durante a janela. Ajuda a afastar a hipótese de indisponibilidade geral do servidor.',
        content: webLog,
        relevance: 'exclusion',
      }),
      evidence({
        id: 'E-05',
        title: 'Resumo da captura no uplink do Laboratório 2',
        kind: 'capture',
        fileName: 'pcap-summary.txt',
        origin: 'Captura sintética · uplink VLAN 30',
        clock: 'UTC (UTC+0)',
        collectedAt: '14/09/2026 09:40 BRT',
        collectedBy: 'equipe de plantão (fictícia)',
        method: 'Resumo de cabeçalhos; sem payload de aplicação',
        seal: 'SEAL-014-E',
        description:
          'Evidencia consultas repetidas ao resolvedor externo com resposta NXDOMAIN e a ausência de fluxo TCP/443 a partir do host afetado.',
        content: pcapSummary,
        relevance: 'critical',
      }),
      evidence({
        id: 'E-06',
        title: 'Registro da mudança CHG-441',
        kind: 'change',
        fileName: 'CHG-441.md',
        origin: 'Gestão de mudanças (fictícia)',
        clock: 'BRT (UTC-3)',
        collectedAt: '14/09/2026 09:44 BRT',
        collectedBy: 'equipe de plantão (fictícia)',
        method: 'Cópia do registro de mudança',
        seal: 'SEAL-014-F',
        description:
          'Documenta a alteração da opção DNS, o solicitante registrado e o rollback. Não autentica autoria, intenção ou responsabilidade individual.',
        content: changeLog,
        relevance: 'supporting',
      }),
      evidence({
        id: 'E-07',
        title: 'Autenticações no portal durante o incidente',
        kind: 'log',
        fileName: 'auth-portal.log',
        origin: 'Serviço de autenticação · portal',
        clock: 'BRT (UTC-3)',
        collectedAt: '14/09/2026 09:26 BRT',
        collectedBy: 'equipe de plantão (fictícia)',
        method: 'Exportação de eventos de autenticação',
        seal: 'SEAL-014-G',
        description:
          'Ajuda a testar a hipótese de falha de autenticação. Não há tentativas originadas do Laboratório 2 no recorte.',
        content: authLog,
        relevance: 'exclusion',
      }),
      evidence({
        id: 'E-08',
        title: 'Alerta de endpoint de dois dias antes',
        kind: 'summary',
        fileName: 'av-console.log',
        origin: 'Console antimalware (fictício)',
        clock: 'BRT (UTC-3)',
        collectedAt: '14/09/2026 09:47 BRT',
        collectedBy: 'equipe de plantão (fictícia)',
        method: 'Extrato do console de endpoint',
        seal: 'SEAL-014-H',
        description:
          'Evento de PUA em outro host, fora da janela. Pista potencialmente irrelevante para a causa imediata.',
        content: avLog,
        relevance: 'irrelevant',
      }),
    ],
    evidenceSelectionPrompt:
      'Selecione as duas fontes que, correlacionadas, documentam diretamente (1) a configuração de DNS entregue ao cliente e (2) o efeito observado na consulta ao portal. Outras fontes podem contextualizar ou excluir hipóteses, mas não são necessárias para esse par.',
    evidenceSelectionCorrectIds: ['E-01', 'E-05'],
    hypotheses: [
      {
        id: 'H-01',
        label: 'O servidor do portal ficou indisponível para toda a organização.',
        detail: 'Se verdadeira, todos os laboratórios deveriam falhar e o servidor não responderia durante a janela.',
        expected: 'refuted',
        justification:
          'E-04 registra respostas 200 e healthcheck saudável durante o incidente; E-03 mostra conexões HTTPS do Laboratório 1 aceitas. O sintoma era seletivo.',
        evidenceIds: ['E-03', 'E-04'],
      },
      {
        id: 'H-02',
        label:
          'A opção de DNS entregue por DHCP direcionou clientes do Laboratório 2 a um resolvedor externo, que não conhece a zona interna.',
        detail: 'A hipótese prevê leases com DNS externo, consultas UDP/53 para fora e NXDOMAIN para o nome do portal.',
        expected: 'supported',
        justification:
          'E-01 mostra 8.8.8.8 nos leases; E-03 mostra consultas UDP/53 a 8.8.8.8; E-05 mostra NXDOMAIN; E-06 registra a mudança e o rollback. E-02 corrobora a ausência de consultas do Laboratório 2 no DNS interno.',
        evidenceIds: ['E-01', 'E-03', 'E-05', 'E-06'],
      },
      {
        id: 'H-03',
        label: 'O firewall bloqueou a porta 443 apenas para o Laboratório 2.',
        detail: 'Uma regra seletiva explicaria a falha sem afetar o Laboratório 1.',
        expected: 'refuted',
        justification:
          'E-03 não registra negação de TCP/443 para o portal e E-05 não mostra nenhuma tentativa TCP/443 partindo de 10.30.4.23. Sem resolução do nome, o cliente não chega a abrir a conexão. A hipótese não é sustentada.',
        evidenceIds: ['E-03', 'E-05'],
      },
      {
        id: 'H-04',
        label: 'É possível afirmar que Ana Souza foi a responsável individual pela falha.',
        detail: 'O registro de mudança contém um nome no campo solicitante.',
        expected: 'insufficient',
        justification:
          'E-06 registra um nome, mas não autentica autoria, delegação, intenção ou responsabilidade. O exercício não contém entrevistas, identidade verificada ou trilha de aprovação completa. A conclusão correta é que os dados disponíveis não permitem essa afirmação.',
        evidenceIds: ['E-06'],
      },
      {
        id: 'H-05',
        label: 'Usuários do Laboratório 2 não conseguiram autenticar no portal.',
        detail: 'Uma falha de credenciais poderia impedir o acesso mesmo com rede funcional.',
        expected: 'refuted',
        justification:
          'E-07 não registra tentativas de autenticação originadas do Laboratório 2 e mostra autenticações bem-sucedidas do Laboratório 1. O bloqueio ocorreu antes da camada de aplicação.',
        evidenceIds: ['E-07'],
      },
    ],
    timeline: [
      {
        id: 'T-01',
        label: 'Opção DNS do escopo da VLAN 30 é alterada para 8.8.8.8.',
        sourceTime: '07:50:19 -03:00',
        normalizedTime: '2026-09-14T07:50:19-03:00',
        source: 'E-01 / E-06',
        note: 'Registro no DHCP e na mudança CHG-441.',
      },
      {
        id: 'T-02',
        label: 'LAB-2-PC-07 renova o lease e passa a receber 8.8.8.8 como DNS.',
        sourceTime: '07:52:11 -03:00',
        normalizedTime: '2026-09-14T07:52:11-03:00',
        source: 'E-01',
        note: 'Configuração entregue ao cliente.',
      },
      {
        id: 'T-03',
        label: 'Chamado registra que o portal não abre no Laboratório 2.',
        sourceTime: '08:05:42 -03:00',
        normalizedTime: '2026-09-14T08:05:42-03:00',
        source: 'Registro do chamado',
        note: 'Sintoma relatado.',
      },
      {
        id: 'T-04',
        label: 'O PC-07 recebe NXDOMAIN ao consultar o nome do portal.',
        sourceTime: '11:06:12Z',
        normalizedTime: '2026-09-14T08:06:12-03:00',
        source: 'E-05',
        note: 'Horário UTC na captura; equivale a 08:06:12 BRT.',
      },
      {
        id: 'T-05',
        label: 'O portal atende requisições do Laboratório 1 com HTTP 200.',
        sourceTime: '08:09:30 -03:00',
        normalizedTime: '2026-09-14T08:09:30-03:00',
        source: 'E-04',
        note: 'Demonstra que o serviço não estava globalmente indisponível.',
      },
      {
        id: 'T-06',
        label: 'A opção DNS é revertida para 10.30.0.10 e um novo lease é entregue.',
        sourceTime: '09:02:36 -03:00',
        normalizedTime: '2026-09-14T09:02:36-03:00',
        source: 'E-01 / E-06',
        note: 'Rollback e retorno da resolução interna.',
      },
    ],
    conclusionOptions: [
      {
        id: 'C-01',
        label: 'O servidor web ficou indisponível para todos os laboratórios.',
        rationale:
          'Contradiz E-04 e E-03: o portal atendeu o Laboratório 1 durante a janela e o healthcheck permaneceu saudável.',
      },
      {
        id: 'C-02',
        label:
          'A configuração de DNS entregue por DHCP direcionou o Laboratório 2 a um resolvedor externo, impedindo a resolução do nome interno do portal.',
        rationale:
          'É a única causa compatível com E-01 (lease com 8.8.8.8), E-03 (consultas externas), E-05 (NXDOMAIN), E-04 (serviço disponível) e E-06 (mudança e rollback).',
      },
      {
        id: 'C-03',
        label: 'Uma regra de firewall bloqueou a porta 443 apenas para o Laboratório 2.',
        rationale:
          'As evidências não mostram negação de TCP/443 nem tentativa de conexão do host afetado; o fluxo parou antes, na resolução do nome.',
      },
      {
        id: 'C-04',
        label: 'Um conflito de endereço IP duplicado no Laboratório 2 derrubou o acesso ao portal.',
        rationale:
          'Não há registro de endereço duplicado no caso. Os leases DHCP são distintos e nenhuma fonte descreve conflito.',
      },
      {
        id: 'C-05',
        label: 'Falha de autenticação dos usuários do Laboratório 2.',
        rationale:
          'E-07 mostra que o Laboratório 2 não originou tentativas de autenticação no recorte. O problema ocorreu antes do login.',
      },
    ],
    correctConclusionId: 'C-02',
    unsupportedClaimOptions: [
      {
        id: 'U-01',
        label: 'A alteração foi comprovadamente executada por Ana Souza, que deve ser responsabilizada individualmente.',
        rationale:
          'O campo "solicitante" em E-06 não comprova autoria, autorização ou intenção. Seriam necessários outros elementos, como autenticação da mudança, entrevistas e trilha de aprovação. A conclusão técnica não deve atribuir responsabilidade individual.',
      },
      {
        id: 'U-02',
        label: 'O portal permaneceu disponível para outros clientes durante a janela.',
        rationale: 'Sustentada por E-04 e E-03.',
      },
      {
        id: 'U-03',
        label: 'O cliente afetado recebeu 8.8.8.8 como servidor DNS por DHCP.',
        rationale: 'Sustentada por E-01.',
      },
      {
        id: 'U-04',
        label: 'A captura não contém nenhum fluxo TCP/443 originado do host afetado.',
        rationale: 'Sustentada pelo resumo da captura E-05, com a limitação de ser um recorte de cabeçalhos.',
      },
    ],
    unsupportedClaimId: 'U-01',
    referenceReport: {
      facts:
        'Entre 07:50:19 e 09:02:36 BRT, a opção domain-name-servers do escopo DHCP 10.30.4.0/24 foi alterada de 10.30.0.10 para 8.8.8.8 e depois revertida. Leases do Laboratório 2 receberam 8.8.8.8. A captura do uplink mostra consultas repetidas do host 10.30.4.23 a 8.8.8.8:53 com resposta NXDOMAIN para portal.universidade.local e nenhum fluxo TCP/443 originado desse host. O servidor do portal registrou respostas 200 para clientes do Laboratório 1 durante a mesma janela e não foi reiniciado. O firewall registrou as consultas UDP/53 do host afetado e conexões HTTPS do Laboratório 1, sem negativa associada ao portal no recorte. O chamado foi aberto às 08:05:42 BRT.',
      inference:
        'A causa técnica mais provável é a entrega, por DHCP, de um resolvedor externo aos clientes do Laboratório 2. O resolvedor 8.8.8.8 não conhece a zona interna .local e devolve NXDOMAIN; sem resolver o nome, o navegador não inicia a conexão TCP/443. A mudança CHG-441 e o rollback às 09:02 reforçam a relação temporal. A falha do servidor, o bloqueio seletivo de firewall e a falha de autenticação são hipóteses incompatíveis com as fontes disponíveis.',
      limitations:
        'Os extratos são recortes e a ausência de eventos em um log não prova que eles nunca ocorreram. Não há logs completos dos clientes, conteúdo de aplicação, configuração integral do firewall nem entrevistas. Os fusos diferentes exigem normalização: a captura e o firewall estão em UTC, os demais registros em BRT. O campo "solicitante" do registro de mudança não autentica autoria, autorização ou intenção e não permite atribuir responsabilidade individual. A integridade das cópias foi verificada por hash, mas isso não comprova a veracidade histórica dos eventos nelas representados.',
      recommendations:
        'Manter o escopo DHCP apontando para o resolvedor interno e forçar a renovação dos leases dos clientes afetados. Validar a resolução de nomes internos antes de qualquer mudança de opção DHCP e incluir esse teste no plano de homologação e rollback. Restringir a alteração de opções de DNS a perfis autorizados, com aprovação registrada e trilha de auditoria. Monitorar NXDOMAIN para a zona interna e divergências entre leases e resolvedores esperados. Preservar os extratos originais com hash e documentar a aquisição. Revisar o processo de mudança para separar solicitante, aprovador e executor e evitar conclusões de responsabilidade baseadas apenas em um campo de formulário.',
    },
    reportGuidance: {
      facts:
        'Descreva apenas o que os registros mostram: horários normalizados, endereços, respostas, estados de serviço. Não inclua opinião sobre culpa.',
      inference:
        'Explique o encadeamento técnico entre a configuração entregue e o comportamento observado. Sinalize o que é interpretação.',
      limitations:
        'Registre lacunas, recortes, fusos, fontes ausentes e o que não pode ser afirmado. Diferencie ausência de evidência de evidência de ausência.',
      recommendations:
        'Proponha ações de correção, prevenção, teste e monitoramento. Não prometa resultados que dependam de dados que você não possui.',
    },
    integrityNote:
      'Cada extrato possui um hash SHA-256 calculado sobre o texto exibido. A verificação confirma que a cópia não foi alterada depois da preparação do exercício. Ela não comprova, sozinha, a origem histórica, a autenticidade dos fatos ou a correção das conclusões.',
  },
  {
    id: 'autoria-e-o-ip',
    code: 'CASO-2026-042',
    title: 'O IP não é uma pessoa',
    subtitle:
      'Acesso indevido a um prontuário escolar, CGNAT compartilhado e os limites da atribuição de autoria',
    difficulty: 'avancado',
    durationMinutes: 70,
    competencies: ['forense', 'seguranca', 'redes'],
    context: [
      'Em 4 de outubro de 2026, a Clínica-Escola Horizonte (fictícia) comunicou o acesso ao prontuário 014 fora do horário de atendimento. O servidor registrou a sessão em 3 de outubro, às 22:41 BRT, a partir do endereço público 198.51.100.77.',
      'A suspeita inicial recaiu sobre M. B. (personagem fictício), ex-colaborador mencionado por colegas. Um tablet atribuído a essa pessoa foi apreendido e periciado. A operadora respondeu a um ofício informando que o endereço público é compartilhado por CGNAT e que não forneceu identidade civil, endereço ou dispositivo.',
      'Sua tarefa é separar o que está documentado do que é inferência: houve acesso? É possível individualizar quem acessou? A cadeia de custódia está completa? O que falta para uma resposta defensável?',
    ],
    scope:
      'Exercício educacional fictício, com personagens, organização, endereços e registros simulados. Os endereços usados pertencem a faixas reservadas para documentação. Analise apenas as cópias fornecidas. Não há autorização para acessar sistemas, identificar pessoas reais ou produzir prova judicial. O laudo aqui produzido não é peça pericial oficial.',
    objectives: [
      'Distinguir o registro técnico de um acesso da identificação de uma pessoa ou dispositivo.',
      'Explicar por que um endereço IP público sujeito a CGNAT não individualiza autoria.',
      'Avaliar a cadeia de custódia a partir do que o auto documenta e do que ele omite.',
      'Normalizar horários entre provedor em UTC e aplicação em BRT.',
      'Responder a quesitos com linguagem técnica, limites explícitos e diligências complementares.',
    ],
    constraints: [
      'O endereço IP, isoladamente, não prova autoria. A resposta da operadora não identifica civilmente o assinante.',
      'A credencial de setor era compartilhada; o log de sessão não registra o operador individual.',
      'A ausência de um domínio no histórico do tablet não prova que o acesso não ocorreu por outro meio.',
      'Os campos não preenchidos no auto de custódia são lacunas documentais, não detalhes irrelevantes.',
      'Nenhum dado de saúde real, credencial real ou pessoa real foi utilizado.',
    ],
    evidence: [
      evidence({
        id: 'E-01',
        title: 'Acessos recebidos pela aplicação do prontuário',
        kind: 'log',
        fileName: 'prontuario-access.log',
        origin: 'Prontuário Acadêmico · aplicação (fictícia)',
        clock: 'BRT (UTC-3)',
        collectedAt: '04/10/2026 09:10 BRT',
        collectedBy: 'equipe de tecnologia da clínica (fictícia)',
        method: 'Exportação do log de acesso; cópia de trabalho',
        seal: 'SEAL-042-A',
        description:
          'Registra tentativa de entrada, autenticação, leitura do prontuário 014 e saída. O IP de origem é comum a todas as requisições.',
        content: `# prontuario-access.log · Prontuário Acadêmico (fictício) · BRT (UTC-3)
# Endereços reservados para documentação. Personagens e dados fictícios.
2026-10-03 22:39:58 198.51.100.77 GET  /entrar 200 8123
2026-10-03 22:40:31 198.51.100.77 POST /entrar 401 914
2026-10-03 22:41:05 198.51.100.77 POST /entrar 302 412
2026-10-03 22:41:07 198.51.100.77 GET  /prontuario/014 200 48210
2026-10-03 22:41:26 198.51.100.77 GET  /prontuario/014/historico 200 31877
2026-10-03 22:42:14 198.51.100.77 POST /sair 302 290
# user-agent observado: Mozilla/5.0 (Linux; Android 13; Generic)
# O user-agent não identifica de forma única dispositivo, navegador ou pessoa.
# Fim do extrato.`,
        relevance: 'critical',
      }),
      evidence({
        id: 'E-02',
        title: 'Autenticações no serviço de identidade',
        kind: 'log',
        fileName: 'auth-prontuario.log',
        origin: 'Serviço de identidade · prontuário (fictício)',
        clock: 'BRT (UTC-3)',
        collectedAt: '04/10/2026 09:12 BRT',
        collectedBy: 'equipe de tecnologia da clínica (fictícia)',
        method: 'Exportação de eventos de autenticação',
        seal: 'SEAL-042-B',
        description:
          'Mostra uma falha de senha seguida de sucesso com a credencial de setor. Não há identificador individual do operador.',
        content: `# auth-prontuario.log · serviço de identidade (fictício) · BRT (UTC-3)
2026-10-03 22:40:31 user=plantao-prontuario src=198.51.100.77 result=FAIL reason=senha
2026-10-03 22:41:05 user=plantao-prontuario src=198.51.100.77 result=SUCCESS mfa=nao_exigido perfil=consulta
# A sessão é registrada pela credencial de setor; não há identificador individual do operador.
# Nenhum outro acesso ao prontuário 014 foi registrado entre 21:00 e 23:59 BRT.
# Fim do extrato.`,
        relevance: 'supporting',
      }),
      evidence({
        id: 'E-03',
        title: 'Resposta da operadora sobre o IP público',
        kind: 'summary',
        fileName: 'oficio-042-operadora.txt',
        origin: 'Operadora Exemplo S.A. (fictícia)',
        clock: 'UTC (UTC+0) na tabela; resposta em BRT',
        collectedAt: '07/10/2026 16:40 BRT',
        collectedBy: 'núcleo técnico (fictício)',
        method: 'Resposta a ofício; cópia digital',
        seal: 'SEAL-042-C',
        description:
          'Declara CGNAT e apresenta as seis conexões da sessão no IP público durante a janela. Não fornece identidade civil, endereço ou dispositivo.',
        content: `# RESPOSTA DE PRESERVAÇÃO E INFORMAÇÃO · Operadora Exemplo S.A. (fictícia)
# Ofício NTC-2026-042 · resposta recebida em 07/10/2026 16:40 BRT
Endereço público consultado: 198.51.100.77
Tecnologia declarada: CGNAT (tradução de endereços em escala de operadora)
Janela solicitada: 03/10/2026 22:39-22:43 BRT (04/10/2026 01:39-01:43 UTC)
Conexões registradas nessa janela: 6
Mapeamentos (UTC):
2026-10-04T01:39:58Z 198.51.100.77:61210 -> 100.64.12.34:41022
2026-10-04T01:40:31Z 198.51.100.77:61210 -> 100.64.12.34:41022
2026-10-04T01:41:05Z 198.51.100.77:61211 -> 100.64.12.34:41022
2026-10-04T01:41:07Z 198.51.100.77:61211 -> 100.64.12.34:41022
2026-10-04T01:41:26Z 198.51.100.77:61211 -> 100.64.12.34:41022
2026-10-04T01:42:14Z 198.51.100.77:61212 -> 100.64.12.34:41022
# A operadora não informou identidade civil, endereço ou dispositivo.
# O IP público é compartilhado com outros assinantes; conexões fora deste recorte não foram detalhadas.
# Três portas de origem (61210, 61211 e 61212) foram reutilizadas em conexões sucessivas.
# A associação entre conexão e titular exige correlação de porta, data e hora com registros de autenticação.
# O endereço 100.64.12.34 pertence à faixa de CGNAT e não é um IP público.
# Fim da resposta.`,
        relevance: 'critical',
      }),
      evidence({
        id: 'E-04',
        title: 'Conexões vistas pelo firewall do provedor de hospedagem',
        kind: 'log',
        fileName: 'edge-flow.log',
        origin: 'Provedor de hospedagem (fictício)',
        clock: 'UTC (UTC+0)',
        collectedAt: '04/10/2026 09:40 BRT',
        collectedBy: 'provedor de hospedagem (fictício)',
        method: 'Exportação de cabeçalhos; sem payload',
        seal: 'SEAL-042-D',
        description:
          'Corrobora o horário das conexões do IP público ao servidor. Não vê a tradução CGNAT nem identifica assinante ou dispositivo. Exige conversão de UTC para BRT.',
        content: `# edge-flow.log · provedor de hospedagem (fictício) · UTC
# Apenas cabeçalhos de conexão. Endereço do servidor reservado para documentação.
2026-10-04T01:39:58Z ALLOW TCP 198.51.100.77:61210 -> 203.0.113.10:443
2026-10-04T01:40:31Z ALLOW TCP 198.51.100.77:61210 -> 203.0.113.10:443
2026-10-04T01:41:05Z ALLOW TCP 198.51.100.77:61211 -> 203.0.113.10:443
2026-10-04T01:41:07Z ALLOW TCP 198.51.100.77:61211 -> 203.0.113.10:443
2026-10-04T01:41:26Z ALLOW TCP 198.51.100.77:61211 -> 203.0.113.10:443
2026-10-04T01:42:14Z ALLOW TCP 198.51.100.77:61212 -> 203.0.113.10:443
# Observação: o firewall de borda registra o IP público de origem, mas não vê a tradução CGNAT
# nem identifica o assinante ou o dispositivo.
# Fim do extrato.`,
        relevance: 'supporting',
      }),
      evidence({
        id: 'E-05',
        title: 'Auto de recebimento e custódia do tablet',
        kind: 'change',
        fileName: 'auto-custodia-042.md',
        origin: 'Núcleo técnico (fictício)',
        clock: 'BRT (UTC-3)',
        collectedAt: '05/10/2026 14:20 BRT',
        collectedBy: 'perito designado (fictício)',
        method: 'Documento de recebimento e acondicionamento',
        seal: 'SEAL-042-E',
        description:
          'Documenta identificação, lacre, responsáveis e método. Os campos de transferência interna, sincronização de relógios e acesso ao armário estão em branco.',
        content: `# AUTO DE RECEBIMENTO E CUSTÓDIA · NTC-2026-042 (fictício)
Material: 1 tablet TabX A12 (fictício), série FIC-042-7781, com carregador.
Recebido em: 05/10/2026 14:20 BRT
Entregue por: agente de plantão (fictício)
Recebido por: perito designado (fictício)
Lacre de recebimento: LAC-042-01
Acondicionamento: embalagem lacrada, armário de evidências.
Método previsto: aquisição lógica com bloqueador de escrita; cópia de trabalho.
Preenchimento do formulário:
- identificação do material: preenchida
- lacre e data/hora: preenchidos
- responsável pela entrega e recebimento: preenchidos
- método de aquisição: preenchido
- transferências internas: campo não preenchido
- verificação de sincronização dos relógios: campo não preenchido
- registro de acesso ao armário: campo não preenchido
# O documento não substitui a cadeia de custódia formal prevista na legislação.
# Fim do auto.`,
        relevance: 'critical',
      }),
      evidence({
        id: 'E-06',
        title: 'Resumo da aquisição forense do tablet',
        kind: 'summary',
        fileName: 'aquisicao-IMG-042.txt',
        origin: 'Sala de exame (fictícia)',
        clock: 'BRT (UTC-3); relógio do dispositivo +3 min',
        collectedAt: '06/10/2026 10:05 BRT',
        collectedBy: 'perito designado (fictício)',
        method: 'Aquisição lógica com bloqueador de escrita; cópia de trabalho',
        seal: 'SEAL-042-F',
        description:
          'Registra o hash da imagem e as limitações do exame. O histórico do navegador não contém o domínio do prontuário, mas a ausência não prova não autoria.',
        content: `# RESUMO DE AQUISIÇÃO · IMG-042 (fictício)
Dispositivo: tablet TabX A12, série FIC-042-7781
Aquisição em: 06/10/2026 10:05 BRT
Método: aquisição lógica; bloqueador de escrita; cópia de trabalho
Hash SHA-256 da imagem: registrado no campo de integridade desta cópia
Relógio do dispositivo: 3 minutos adiantado em relação à referência de rede na aquisição
Histórico do navegador (30 dias): nenhuma entrada para prontuario.clinica-escola.example
Aplicativos instalados: nenhum aplicativo da clínica; dois navegadores de uso geral
Contas configuradas: uma conta pessoal de e-mail (fictícia)
# Limitações registradas pelo examinador:
# - o histórico não abrange navegação privada, outros perfis, outros navegadores ou outros dispositivos;
# - a ausência de registro não prova que o acesso não ocorreu por este aparelho ou por outra via.
# Fim do resumo.`,
        relevance: 'supporting',
      }),
      evidence({
        id: 'E-07',
        title: 'Política e registro da credencial de setor',
        kind: 'summary',
        fileName: 'controle-acesso.txt',
        origin: 'Administração do prontuário (fictícia)',
        clock: 'BRT (UTC-3)',
        collectedAt: '04/10/2026 09:35 BRT',
        collectedBy: 'equipe de tecnologia da clínica (fictícia)',
        method: 'Exportação da configuração de perfil e sessão',
        seal: 'SEAL-042-G',
        description:
          'Confirma que a credencial era compartilhada por três profissionais e que o log não registra o operador individual. MFA não era exigido.',
        content: `# CONTROLE DE ACESSO · Prontuário Acadêmico (fictício)
Credencial: plantao-prontuario
Perfil: consulta e impressão de prontuários
MFA: não exigido para este perfil
Usuários autorizados: 3 profissionais do plantão (cadastro por setor, sem vínculo individual no log)
Política interna: credencial de setor compartilhada; troca de senha a cada 90 dias
Registro de sessão: identificador da credencial, endereço IP e horário; sem identificador de operador
# O sistema não permite atribuir uma sessão a um profissional específico apenas por este registro.
# Fim do extrato.`,
        relevance: 'critical',
      }),
      evidence({
        id: 'E-08',
        title: 'Registro de atendimento da clínica-escola',
        kind: 'summary',
        fileName: 'atendimento-042.txt',
        origin: 'Clínica-Escola Horizonte (fictícia)',
        clock: 'BRT (UTC-3)',
        collectedAt: '04/10/2026 08:12 BRT',
        collectedBy: 'coordenação da clínica (fictícia)',
        method: 'Cópia do registro administrativo',
        seal: 'SEAL-042-H',
        description:
          'Contém a suspeita inicial e admite que não há vídeo, controle de acesso físico, biometria ou registro individual de sessão.',
        content: `# REGISTRO DE ATENDIMENTO · Clínica-Escola Horizonte (fictícia)
Data: 04/10/2026 08:12 BRT
Relato: acesso ao prontuário 014 fora do horário de atendimento, em 03/10/2026 à noite.
Providências: preservação dos logs da aplicação e comunicação ao núcleo técnico.
Suspeita inicial: M. B. (personagem fictício), ex-colaborador, mencionado por colegas.
Registros disponíveis: nenhum vídeo, controle de acesso físico, biometria ou registro individual de sessão.
Observação do responsável: a suspeita não foi confirmada por meio técnico.
# Personagens e dados fictícios. Nenhum dado de saúde real.
# Fim do registro.`,
        relevance: 'supporting',
      }),
    ],
    evidenceSelectionPrompt:
      'Selecione as três fontes que, correlacionadas, sustentam o limite da conclusão: o acesso registrado, a natureza compartilhada do IP público e o uso de uma credencial coletiva. Outras fontes contextualizam, excluem hipóteses ou documentam custódia, mas não formam esse trio direto.',
    evidenceSelectionCorrectIds: ['E-01', 'E-03', 'E-07'],
    hypotheses: [
      {
        id: 'H-01',
        label: 'O endereço IP 198.51.100.77 identifica, por si só, o dispositivo que acessou o prontuário.',
        detail:
          'A hipótese trata o IP público como identificador único de aparelho ou pessoa.',
        expected: 'refuted',
        justification:
          'E-03 declara CGNAT e registra seis conexões no mesmo IP público na janela; E-04 registra apenas o IP de origem, sem tradução ou dispositivo. O IP compartilhado não individualiza aparelho, pessoa ou assinante.',
        evidenceIds: ['E-03', 'E-04'],
      },
      {
        id: 'H-02',
        label:
          'O acesso ocorreu na janela registrada, mas os elementos disponíveis não individualizam a pessoa que o realizou.',
        detail:
          'A hipótese separa o fato técnico documentado do limite de atribuição de autoria.',
        expected: 'supported',
        justification:
          'E-01 e E-02 documentam a sessão e a leitura do prontuário; E-03 demonstra o compartilhamento do IP; E-07 demonstra a credencial coletiva sem operador individual. O conjunto sustenta o acesso, não a autoria.',
        evidenceIds: ['E-01', 'E-02', 'E-03', 'E-07'],
      },
      {
        id: 'H-03',
        label:
          'O tablet apreendido é o único dispositivo compatível com o acesso porque estava na residência de M. B. no horário.',
        detail:
          'A afirmação pressupõe presença, rede e exclusividade de dispositivo que não estão documentadas.',
        expected: 'insufficient',
        justification:
          'Não há registro de presença, de rede doméstica ou de uso exclusivo do tablet. E-06 mostra apenas que o histórico de um navegador não contém o domínio, com limitações expressas. Os dados não permitem confirmar nem excluir o aparelho.',
        evidenceIds: ['E-06'],
      },
      {
        id: 'H-04',
        label: 'A credencial plantao-prontuario permite atribuir o acesso a um profissional específico.',
        detail:
          'A hipótese supõe que a credencial de setor identifique o operador da sessão.',
        expected: 'refuted',
        justification:
          'E-07 registra que a credencial era compartilhada por três profissionais, que o MFA não era exigido e que a sessão não contém identificador individual. E-02 mostra apenas o nome da credencial.',
        evidenceIds: ['E-02', 'E-07'],
      },
      {
        id: 'H-05',
        label: 'A ausência do domínio no histórico do tablet prova que M. B. não acessou o sistema.',
        detail:
          'A hipótese transforma ausência de registro em prova de não autoria.',
        expected: 'insufficient',
        justification:
          'E-06 limita expressamente o alcance do histórico: não cobre navegação privada, outros perfis, outros navegadores ou outros dispositivos. A ausência não confirma nem refuta o acesso pelo titular ou por outra pessoa.',
        evidenceIds: ['E-06'],
      },
    ],
    timeline: [
      {
        id: 'T-01',
        label: 'O firewall do provedor registra conexão HTTPS do IP público ao servidor da clínica.',
        sourceTime: '01:39:58Z',
        normalizedTime: '2026-10-03T22:39:58-03:00',
        source: 'E-04',
        note: 'Horário UTC; equivale a 22:39:58 BRT.',
      },
      {
        id: 'T-02',
        label: 'Uma tentativa de autenticação com a credencial de setor falha por senha.',
        sourceTime: '22:40:31 -03:00',
        normalizedTime: '2026-10-03T22:40:31-03:00',
        source: 'E-01 / E-02',
        note: 'Registro da aplicação e do serviço de identidade.',
      },
      {
        id: 'T-03',
        label: 'A credencial de setor autentica com sucesso sem exigência de MFA.',
        sourceTime: '22:41:05 -03:00',
        normalizedTime: '2026-10-03T22:41:05-03:00',
        source: 'E-02',
        note: 'A sessão é registrada pela credencial, não por uma pessoa.',
      },
      {
        id: 'T-04',
        label: 'O prontuário 014 é lido e seu histórico é consultado.',
        sourceTime: '22:41:07 -03:00',
        normalizedTime: '2026-10-03T22:41:07-03:00',
        source: 'E-01',
        note: 'Resposta HTTP 200 para as duas requisições.',
      },
      {
        id: 'T-05',
        label: 'A clínica registra o acesso fora do horário e comunica o núcleo técnico.',
        sourceTime: '04/10/2026 08:12 BRT',
        normalizedTime: '2026-10-04T08:12:00-03:00',
        source: 'E-08',
        note: 'Registro administrativo posterior ao acesso.',
      },
      {
        id: 'T-06',
        label: 'O tablet é recebido, lacrado e acondicionado no armário de evidências.',
        sourceTime: '05/10/2026 14:20 BRT',
        normalizedTime: '2026-10-05T14:20:00-03:00',
        source: 'E-05',
        note: 'Auto de recebimento com lacre LAC-042-01.',
      },
      {
        id: 'T-07',
        label: 'A aquisição lógica do tablet é concluída com hash e cópia de trabalho.',
        sourceTime: '06/10/2026 10:05 BRT',
        normalizedTime: '2026-10-06T10:05:00-03:00',
        source: 'E-06',
        note: 'Relógio do dispositivo estava 3 minutos adiantado.',
      },
      {
        id: 'T-08',
        label: 'A operadora responde ao ofício e informa seis conexões CGNAT na janela.',
        sourceTime: '07/10/2026 16:40 BRT',
        normalizedTime: '2026-10-07T16:40:00-03:00',
        source: 'E-03',
        note: 'Resposta recebida depois da preservação dos logs e da aquisição.',
      },
    ],
    timelineInitialOrder: ['T-05', 'T-03', 'T-08', 'T-01', 'T-06', 'T-04', 'T-02', 'T-07'],
    conclusionOptions: [
      {
        id: 'C-01',
        label:
          'M. B. acessou o prontuário, pois o endereço IP público estava associado à sua linha.',
        rationale:
          'A resposta da operadora não identifica civilmente o assinante nem associa o IP a uma pessoa. O endereço é compartilhado por CGNAT e a suspeita inicial não é prova.',
      },
      {
        id: 'C-02',
        label:
          'O acesso partiu de um IP público compartilhado por CGNAT e de uma credencial coletiva; os elementos disponíveis não individualizam pessoa ou dispositivo, e a autoria permanece indeterminada.',
        rationale:
          'É a conclusão compatível com E-01 e E-02 (acesso documentado), E-03 (IP compartilhado, seis conexões), E-07 (credencial de setor) e E-06 (limites do exame do tablet).',
      },
      {
        id: 'C-03',
        label: 'Não houve acesso, porque o endereço 198.51.100.77 é reservado para documentação.',
        rationale:
          'Os endereços são reservados para evitar dados reais no exercício. Dentro do cenário, E-01 e E-02 documentam o acesso e a leitura do prontuário.',
      },
      {
        id: 'C-04',
        label: 'A operadora confirmou a identidade do assinante e o vínculo com M. B.',
        rationale:
          'E-03 afirma o contrário: a operadora não informou identidade civil, endereço ou dispositivo e descreveu o IP como compartilhado.',
      },
      {
        id: 'C-05',
        label:
          'O tablet não contém o domínio no histórico, portanto o acesso foi necessariamente feito por outro sistema.',
        rationale:
          'E-06 limita o alcance do histórico. A ausência não prova que o acesso não ocorreu pelo tablet ou por outro meio; apenas não foi localizada naquele recorte.',
      },
    ],
    correctConclusionId: 'C-02',
    unsupportedClaimOptions: [
      {
        id: 'U-01',
        label: 'O endereço IP, isoladamente, prova que M. B. realizou o acesso.',
        rationale:
          'O IP público era compartilhado por CGNAT, a credencial era coletiva e a operadora não identificou pessoa ou dispositivo. O endereço localiza uma conexão, não uma autoria.',
      },
      {
        id: 'U-02',
        label: 'O servidor registrou acesso autenticado ao prontuário 014 em 03/10/2026, às 22:41:07 BRT.',
        rationale: 'Sustentada por E-01 e E-02.',
      },
      {
        id: 'U-03',
        label: 'A operadora declarou que o IP público era compartilhado por outros assinantes no horário.',
        rationale: 'Sustentada por E-03, que registra seis conexões e declara o compartilhamento.',
      },
      {
        id: 'U-04',
        label: 'O histórico do tablet não contém o domínio do prontuário no período examinado.',
        rationale:
          'Sustentada por E-06, com a limitação expressa de que o histórico não cobre todas as formas de acesso.',
      },
    ],
    unsupportedClaimId: 'U-01',
    referenceReport: {
      facts:
        'Em 3 de outubro de 2026, entre 22:39:58 e 22:42:14 BRT, a aplicação do Prontuário Acadêmico registrou conexões do endereço público 198.51.100.77, uma falha de senha às 22:40:31 e autenticação bem-sucedida da credencial plantao-prontuario às 22:41:05. Às 22:41:07, o prontuário 014 foi lido com resposta HTTP 200; o histórico foi consultado às 22:41:26. O firewall do provedor registrou as mesmas conexões entre 01:39:58Z e 01:42:14Z. A resposta da operadora declarou CGNAT, seis conexões da sessão no IP público na janela e a tradução de todas elas para 100.64.12.34:41022, sem informar identidade civil, endereço ou dispositivo. O auto de custódia registra identificação, lacre LAC-042-01, data, hora, responsáveis e método, com três campos em branco: transferências internas, sincronização de relógios e acesso ao armário. A imagem do tablet tem hash registrado; o histórico de um navegador não contém o domínio e o relógio do aparelho estava três minutos adiantado. O registro da clínica menciona suspeita inicial sem vídeo, biometria ou log individual.',
      inference:
        'O acesso ao prontuário é tecnicamente demonstrável pelos logs da aplicação e da autenticação. A autoria não pode ser individualizada: o IP público é compartilhado por CGNAT, o que impede tratar o endereço como identificador de pessoa ou dispositivo; a credencial era coletiva e o serviço não registrava o operador individual. A correlação de porta, data e hora pode apontar um assinante, mas ainda não identifica a pessoa que operou o dispositivo, e a operadora não forneceu identidade civil. O histórico do tablet não localizou o domínio, porém a ausência em um recorte não prova não autoria. A suspeita inicial é hipótese de investigação, não conclusão pericial.',
      limitations:
        'Os logs são recortes e a ausência de eventos não prova que eles nunca ocorreram. Não há identificação civil do assinante, endereço de instalação, dispositivo, vídeo, biometria ou registro individual de sessão. A cadeia de custódia tem lacunas documentais: o auto não registra transferências internas, verificação de sincronização dos relógios ou acesso ao armário. O relógio do tablet estava três minutos adiantado. O histórico do navegador não cobre navegação privada, outros perfis, outros navegadores ou outros dispositivos. A integridade das cópias foi verificada por hash, mas isso não comprova a veracidade histórica dos fatos representados.',
      recommendations:
        'Requisitar formalmente à operadora a correlação entre porta, data, hora e assinante, com preservação dos registros de autenticação e dos logs NAT, observando a legislação aplicável. Preservar os logs originais com hash e documentar toda a cadeia de custódia, inclusive transferências, acesso ao armário e sincronização de relógios. Substituir a credencial compartilhada por contas individuais com MFA e registrar o operador em cada sessão. Ampliar o exame do tablet para outros perfis, navegadores e artefatos, sem tratar ausência como prova de não autoria. Conferir relógios das fontes e documentar a normalização de fusos. Se houver novos elementos, reavaliar a hipótese de autoria com base no conjunto, e não no IP isolado.',
    },
    reportGuidance: {
      facts:
        'Registre horários normalizados, endereços, credencial, respostas HTTP, lacre, hash e campos do auto. Não transforme suspeita em fato.',
      inference:
        'Explique por que o acesso está documentado e por que o IP e a credencial coletiva não individualizam autoria. Sinalize o que é limite técnico.',
      limitations:
        'Aponte lacunas de custódia, ausência de identificação civil, limites do histórico do tablet, fusos e o que exigiria outras fontes.',
      recommendations:
        'Proponha diligências proporcionais e verificáveis: correlação NAT, preservação, contas individuais, MFA e ampliação do exame. Não prometa resultados.',
    },
    integrityNote:
      'Cada cópia sintética possui hash SHA-256 calculado sobre o texto exibido. A verificação confirma integridade em relação ao valor registrado; não autentica a origem histórica, a autoria do acesso ou a veracidade dos fatos simulados.',
    rubric: {
      cause: 15,
      unsupported: 5,
      evidence: 10,
      hypotheses: 10,
      timeline: 10,
      custody: 10,
      quesitos: 20,
      report: 20,
    },
    criterionCopy: {
      cause: {
        label: 'Conclusão sobre a autoria',
        met: 'A conclusão reconhece o acesso documentado e o limite probatório do IP e da credencial compartilhada.',
        unmet: 'A opção escolhida trata o IP ou a suspeita inicial como prova de autoria, ou nega um acesso documentado.',
      },
      evidence: {
        label: 'Correlação de fontes',
        met: 'As fontes selecionadas documentam o acesso, o compartilhamento do IP e a credencial coletiva.',
        unmet: 'A seleção não reúne as três fontes que sustentam o limite da conclusão.',
      },
      hypotheses: {
        label: 'Teste de hipóteses',
        met: 'As hipóteses foram separadas entre sustentadas, refutadas e sem dados suficientes.',
        unmet: 'Alguma hipótese foi tratada como conclusão sem o suporte correspondente.',
      },
      timeline: {
        label: 'Cronologia',
        met: 'A cronologia normaliza o horário UTC do provedor e preserva a ordem dos eventos.',
        unmet: 'A ordem ou a conversão de fuso ainda não corresponde aos registros.',
      },
      custody: {
        label: 'Custódia e integridade',
        met: 'Você distinguiu o que o auto documenta das lacunas de transferência, relógio e acesso.',
        unmet: 'A avaliação da custódia ainda confunde campo preenchido com etapa efetivamente documentada.',
      },
      quesitos: {
        label: 'Quesitos do juízo',
        met: 'As respostas tratam acesso, autoria, custódia e diligências com limites explícitos.',
        unmet: 'Algum quesito ficou incompleto, sem fundamento técnico ou sem separar fato de inferência.',
      },
      unsupported: {
        label: 'Limite da conclusão',
        met: 'Você identificou a afirmação que ultrapassa o que o conjunto probatório permite.',
        unmet: 'A afirmação escolhida é sustentada pelas fontes ou deixa passar a conclusão sem suporte.',
      },
      report: {
        label: 'Laudo técnico',
        met: 'O laudo separa fatos, análise, lacunas e diligências com extensão e conteúdo suficientes.',
        unmet: 'O laudo ainda não separa fatos, inferências e limitações de forma verificável.',
      },
    },
    reportKeywords: {
      facts: ['ip', '198.51.100.77', 'cgnat', 'credencial', 'prontuario', '22:41', 'log'],
      inference: ['compartilhado', 'cgnat', 'nao', 'individualiza', 'autoria', 'credencial', 'dispositivo'],
      limitations: ['ausencia', 'nao', 'log', 'fonte', 'transferencia', 'custodia', 'relogio', 'dispositivo', 'escopo'],
      recommendations: ['operadora', 'nat', 'porta', 'horario', 'dispositivo', 'credencial', 'mfa', 'preservar', 'pericia'],
    },
    reportMinLength: 80,
    reportLimitationBlocklist: [
      'm. b. foi o autor',
      'ficou comprovado que m. b.',
      'o ip prova a autoria',
      'responsavel individual',
      'culpado',
      'culpada',
    ],
    evidenceOpenMin: 6,
    notesMin: 3,
    custodyChecklist: [
      {
        id: 'C-01',
        label: 'Identificação do material, lacre e data/hora de recebimento',
        detail:
          'O auto descreve o tablet, a série, o lacre LAC-042-01 e o recebimento em 05/10/2026 às 14:20 BRT.',
        expected: 'documented',
        rationale:
          'E-05 preenche identificação, lacre, data e hora. São elementos de individualização e rastreabilidade inicial.',
      },
      {
        id: 'C-02',
        label: 'Responsáveis pela entrega e pelo recebimento',
        detail:
          'O auto nomeia quem entregou e quem recebeu o material, ainda que os personagens sejam fictícios.',
        expected: 'documented',
        rationale:
          'E-05 registra entregador e recebedor. Isso documenta o primeiro elo, mas não substitui a trilha completa.',
      },
      {
        id: 'C-03',
        label: 'Método de aquisição e existência de cópia de trabalho',
        detail:
          'O auto prevê aquisição lógica com bloqueador de escrita e cópia de trabalho; o resumo E-06 confirma o método.',
        expected: 'documented',
        rationale:
          'E-05 e E-06 documentam o método e a cópia de trabalho. A preservação do original deve ser verificada no procedimento.',
      },
      {
        id: 'C-04',
        label: 'Trilha de transferência interna entre recebimento e exame',
        detail:
          'O campo de transferências internas está em branco no auto. Não há termo intermediário entre o armário e a sala de exame.',
        expected: 'missing',
        rationale:
          'E-05 não documenta as transferências. A lacuna compromete a continuidade da cadeia de custódia, mesmo que o lacre permaneça íntegro.',
      },
      {
        id: 'C-05',
        label: 'Verificação de sincronização dos relógios das fontes',
        detail:
          'O campo de sincronização está em branco. O tablet estava três minutos adiantado, e não há registro de conferência dos relógios do servidor e do provedor.',
        expected: 'missing',
        rationale:
          'E-05 não registra a verificação e E-06 mostra divergência no tablet. A cronologia depende de relógios documentados.',
      },
      {
        id: 'C-06',
        label: 'Registro de acesso ao armário de evidências',
        detail:
          'O auto não contém registro de quem acessou o armário, quando ou com qual finalidade.',
        expected: 'missing',
        rationale:
          'E-05 deixa o campo em branco. Sem esse registro, não é possível reconstruir toda a posse do material.',
      },
    ],
    quesitos: [
      {
        id: 'Q-01',
        prompt:
          'O endereço IP 198.51.100.77, por si só, identifica a pessoa que acessou o prontuário? Justifique tecnicamente.',
        guidance:
          'Diferencie endereço público, CGNAT, assinante, dispositivo e pessoa. Explique o que a operadora informou e o que ela não informou.',
        minLength: 140,
        keywords: ['nao', 'cgnat', 'compartilhado', 'porta', 'assinante'],
        forbidden: [
          'sim o ip identifica',
          'o ip identifica a pessoa',
          'o ip prova a autoria',
        ],
        referenceAnswer:
          'Não. O IP público é compartilhado por CGNAT e a operadora registrou seis conexões na mesma janela. A correlação de porta, data e hora pode apontar um assinante, mas não identifica a pessoa que operava o dispositivo. Seriam necessários registros complementares e diligências específicas.',
      },
      {
        id: 'Q-02',
        prompt: 'O que os registros permitem concluir sobre a autoria do acesso ao prontuário?',
        guidance:
          'Separe o acesso documentado da atribuição de autoria. Considere a credencial coletiva e o exame do tablet.',
        minLength: 140,
        keywords: ['autoria', 'indeterminada', 'nao', 'individualizar', 'dispositivo'],
        referenceAnswer:
          'O acesso está documentado pelos logs da aplicação e da autenticação. A autoria permanece indeterminada: o IP é compartilhado, a credencial era coletiva e o serviço não registrava o operador individual. O tablet não confirmou o acesso, mas a ausência no histórico também não prova não autoria.',
      },
      {
        id: 'Q-03',
        prompt: 'A cadeia de custódia documentada está completa? Aponte as lacunas e seus efeitos.',
        guidance:
          'Avalie o que o auto preenche e o que deixa em branco. Relacione lacunas a riscos para a credibilidade do exame.',
        minLength: 140,
        keywords: ['custodia', 'transferencia', 'relogio', 'lacre', 'hash', 'acesso'],
        referenceAnswer:
          'Não está completa. O auto documenta identificação, lacre, data, responsáveis, método e hash da imagem, mas não registra transferências internas, verificação de sincronização dos relógios nem acesso ao armário. Essas lacunas afetam a continuidade e a rastreabilidade, ainda que o lacre e o hash estejam documentados.',
      },
      {
        id: 'Q-04',
        prompt:
          'Quais diligências complementares poderiam esclarecer a autoria sem confundir suspeita com prova?',
        guidance:
          'Proponha ações proporcionais, verificáveis e compatíveis com a legislação. Explique o que cada uma poderia ou não demonstrar.',
        minLength: 140,
        keywords: ['operadora', 'nat', 'porta', 'horario', 'dispositivo', 'credencial', 'mfa', 'imagem'],
        referenceAnswer:
          'Requisitar à operadora a correlação entre porta, data, hora e assinante, com preservação dos logs NAT e de autenticação; ampliar o exame do tablet e de outros dispositivos; verificar relógios e documentar a cadeia de custódia; substituir a credencial compartilhada por contas individuais com MFA. Essas medidas podem reduzir a indeterminação, mas não autorizam concluir autoria sem um conjunto probatório completo.',
      },
    ],
    phases: [
      { id: 'recebimento', label: 'Recebimento', source: 'receipt' },
      { id: 'custodia', label: 'Custódia', source: 'custody' },
      { id: 'exame', label: 'Exame', source: 'evidence' },
      { id: 'registro', label: 'Registro', source: 'record' },
      { id: 'hipoteses', label: 'Hipóteses', source: 'analysis' },
      { id: 'cronologia', label: 'Cronologia', source: 'timeline' },
      { id: 'quesitos', label: 'Quesitos', source: 'quesitos' },
      { id: 'laudo', label: 'Laudo', source: 'report' },
    ],
    copy: {
      conclusionLabel: 'Conclusão sobre a autoria',
      conclusionTask: 'Tarefa 7 — Qual conclusão o conjunto de fontes sustenta sobre a autoria?',
      unsupportedLabel: 'Afirmação não sustentada',
      evidenceTask:
        'Tarefa 2 — Quais fontes documentam o acesso, o compartilhamento do IP e a credencial coletiva?',
      evidenceSelectionIntro:
        'Selecione as três fontes que, correlacionadas, sustentam o limite da conclusão: o acesso registrado, a natureza compartilhada do IP público e o uso de uma credencial coletiva. Outras fontes contextualizam ou testam hipóteses, mas não formam esse trio direto.',
      evidenceSelectionExplanation:
        'O trio conecta o acesso efetivamente registrado (E-01) à natureza compartilhada do endereço (E-03) e à credencial de uso coletivo (E-02). As demais fontes contextualizam o tablet, a custódia ou a resposta da operadora, mas não sustentam sozinhas o limite da autoria.',
      timelineTitle: 'Cronologia normalizada',
      timelineIntro:
        'O provedor registra em UTC; a aplicação, a autenticação e o auto usam BRT (UTC-3). Ordene pelo instante em que cada evento ocorreu, não pela data em que o documento foi produzido. Use as setas para reposicionar.',
      timelineNote:
        'O log de borda E-04 e a resposta da operadora E-03 usam UTC. A aplicação E-01, a autenticação E-02 e o auto E-05 usam BRT. O relógio do tablet está 3 minutos adiantado, mas isso não altera o horário dos logs do servidor.',
      reportTitle: 'Laudo e resposta aos quesitos',
      reportIntro:
        'A tarefa final combina a conclusão, o limite probatório e um relato que separe fatos, análise, lacunas e diligências. O laudo responde aos quesitos e não transforma suspeita em autoria.',
      reportFieldLabels: {
        facts: 'Fatos e vestígios verificados',
        inference: 'Análise técnico-pericial',
        limitations: 'Limitações e lacunas',
        recommendations: 'Diligências e recomendações',
      },
      rubricNote:
        'Aprovação a partir de 70/100. Custódia e quesitos têm peso próprio neste caso. O gabarito completo aparece após a submissão.',
      tabLabels: {
        evidencias: 'Exame',
        linha: 'Cronologia',
        relatorio: 'Laudo',
      },
    },
    legalReferences: [
      {
        label: 'CPP, arts. 158-A a 158-F',
        description:
          'Cadeia de custódia: reconhecimento, coleta, acondicionamento, transporte, recebimento, processamento, armazenamento e descarte do vestígio.',
        href: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689compilado.htm',
      },
      {
        label: 'CPP, art. 159, § 3º',
        description:
          'Faculta às partes a formulação de quesitos e a indicação de assistente técnico; o caput exige perito oficial para o exame de corpo de delito e outras perícias.',
        href: 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689compilado.htm',
      },
      {
        label: 'Lei nº 12.965/2014 — Marco Civil da Internet',
        description:
          'Guarda e disponibilização de registros de conexão e de acesso a aplicações, com proteção de dados e exigência de ordem judicial quando cabível.',
        href: 'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm',
      },
      {
        label: 'Lei nº 13.709/2018 — LGPD',
        description:
          'Tratamento de dados pessoais com finalidade, necessidade, segurança e prestação de contas, inclusive em contexto de investigação.',
        href: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm',
      },
      {
        label: 'Lei nº 14.155/2021',
        description:
          'Alterações na legislação penal sobre crimes patrimoniais e informáticos. Não qualifica a conduta neste exercício; serve como referência de contexto.',
        href: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14155.htm',
      },
    ],
  },
]

export function getCaseById(id: string): CaseDefinition | undefined {
  return investigationCases.find((caseDefinition) => caseDefinition.id === id)
}

export const CASE_TIMELINE_INITIAL_ORDER = ['T-03', 'T-06', 'T-01', 'T-05', 'T-02', 'T-04']

export const CASE_CATALOG_PREVIEW = [
  {
    code: 'CASO-2026-021',
    title: 'Integridade de um arquivo apreendido',
    status: 'em preparação',
    description:
      'Comparação de hash, cadeia de custódia e limites da verificação de integridade em um artefato sintético. Ainda não disponível.',
  },
  {
    code: 'CASO-2026-028',
    title: 'Tráfego que não deveria sair',
    status: 'em preparação',
    description:
      'Correlação entre DNS, firewall e volume de dados para distinguir backup legítimo de possível exfiltração. Ainda não disponível.',
  },
]
