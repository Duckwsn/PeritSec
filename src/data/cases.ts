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
