export type TrafficStatus = 'normal' | 'atencao' | 'anomalia'

export interface TrafficPacket {
  id: string
  time: string
  src: string
  dst: string
  protocol: 'DNS' | 'TCP' | 'UDP' | 'ARP' | 'TLS'
  srcPort?: number
  dstPort?: number
  length: number
  info: string
  status: TrafficStatus
  fields: Array<{ label: string; value: string }>
}

const packets: Array<Omit<TrafficPacket, 'id'>> = [
  {
    time: '08:05:00.012',
    src: '10.30.4.23',
    dst: 'ff:ff:ff:ff:ff:ff',
    protocol: 'ARP',
    length: 42,
    info: 'Who has 10.30.4.1? Tell 10.30.4.23',
    status: 'normal',
    fields: [
      { label: 'Camada', value: 'Enlace (Ethernet II)' },
      { label: 'Opcode', value: '1 (request)' },
      { label: 'Sender MAC', value: '3c:7a:8f:11:20:91' },
      { label: 'Target IP', value: '10.30.4.1' },
    ],
  },
  {
    time: '08:05:00.013',
    src: '00:1c:0e:aa:30:01',
    dst: '3c:7a:8f:11:20:91',
    protocol: 'ARP',
    length: 42,
    info: '10.30.4.1 is at 00:1c:0e:aa:30:01',
    status: 'normal',
    fields: [
      { label: 'Camada', value: 'Enlace (Ethernet II)' },
      { label: 'Opcode', value: '2 (reply)' },
      { label: 'Sender IP', value: '10.30.4.1' },
      { label: 'Sender MAC', value: '00:1c:0e:aa:30:01' },
    ],
  },
  {
    time: '08:05:12.441',
    src: '10.30.5.31',
    dst: '10.30.0.10',
    protocol: 'DNS',
    srcPort: 49712,
    dstPort: 53,
    length: 76,
    info: 'Standard query A portal.universidade.local',
    status: 'normal',
    fields: [
      { label: 'Transaction ID', value: '0x91bc' },
      { label: 'Flags', value: 'RD = 1' },
      { label: 'Query type', value: 'A' },
      { label: 'VLAN', value: '50 (Laboratório 1)' },
    ],
  },
  {
    time: '08:05:12.465',
    src: '10.30.0.10',
    dst: '10.30.5.31',
    protocol: 'DNS',
    srcPort: 53,
    dstPort: 49712,
    length: 92,
    info: 'Standard query response A 10.10.50.20',
    status: 'normal',
    fields: [
      { label: 'Transaction ID', value: '0x91bc' },
      { label: 'Response code', value: 'NOERROR' },
      { label: 'Answer', value: 'portal.universidade.local A 10.10.50.20' },
      { label: 'TTL', value: '300 s' },
    ],
  },
  {
    time: '08:05:58.004',
    src: '10.30.4.23',
    dst: '8.8.8.8',
    protocol: 'DNS',
    srcPort: 53142,
    dstPort: 53,
    length: 74,
    info: 'Standard query A portal.universidade.local',
    status: 'atencao',
    fields: [
      { label: 'Transaction ID', value: '0x4a2f' },
      { label: 'Resolvedor', value: '8.8.8.8 (externo)' },
      { label: 'Cliente', value: 'LAB-2-PC-07' },
      { label: 'VLAN', value: '30 (Laboratório 2)' },
    ],
  },
  {
    time: '08:05:58.187',
    src: '8.8.8.8',
    dst: '10.30.4.23',
    protocol: 'DNS',
    srcPort: 53,
    dstPort: 53142,
    length: 78,
    info: 'Standard query response: NXDOMAIN',
    status: 'anomalia',
    fields: [
      { label: 'Transaction ID', value: '0x4a2f' },
      { label: 'Response code', value: 'NXDOMAIN (3)' },
      { label: 'Answers', value: '0' },
      { label: 'Interpretação', value: 'Nome inexistente para este resolvedor' },
    ],
  },
  {
    time: '08:06:03.011',
    src: '10.30.4.23',
    dst: '8.8.8.8',
    protocol: 'DNS',
    srcPort: 53186,
    dstPort: 53,
    length: 74,
    info: 'Standard query A portal.universidade.local (retry)',
    status: 'atencao',
    fields: [
      { label: 'Transaction ID', value: '0x4a5b' },
      { label: 'Tentativa', value: '2 em 5 segundos' },
      { label: 'Resolvedor', value: '8.8.8.8' },
    ],
  },
  {
    time: '08:06:03.193',
    src: '8.8.8.8',
    dst: '10.30.4.23',
    protocol: 'DNS',
    srcPort: 53,
    dstPort: 53186,
    length: 78,
    info: 'Standard query response: NXDOMAIN',
    status: 'anomalia',
    fields: [
      { label: 'Response code', value: 'NXDOMAIN' },
      { label: 'Answers', value: '0' },
      { label: 'TTL negativo', value: 'SOA minimum' },
    ],
  },
  {
    time: '08:06:12.442',
    src: '10.30.4.23',
    dst: '8.8.8.8',
    protocol: 'DNS',
    srcPort: 53204,
    dstPort: 53,
    length: 74,
    info: 'Standard query A portal.universidade.local (retry)',
    status: 'atencao',
    fields: [
      { label: 'Transaction ID', value: '0x4a9c' },
      { label: 'Tentativa', value: '3 em 14 segundos' },
      { label: 'Resolvedor', value: '8.8.8.8' },
    ],
  },
  {
    time: '08:06:12.621',
    src: '8.8.8.8',
    dst: '10.30.4.23',
    protocol: 'DNS',
    srcPort: 53,
    dstPort: 53204,
    length: 78,
    info: 'Standard query response: NXDOMAIN',
    status: 'anomalia',
    fields: [
      { label: 'Response code', value: 'NXDOMAIN' },
      { label: 'Answers', value: '0' },
      { label: 'Observação', value: 'Nenhum fluxo TCP segue esta resposta' },
    ],
  },
  {
    time: '08:07:30.118',
    src: '10.30.5.44',
    dst: '10.30.0.10',
    protocol: 'DNS',
    srcPort: 51502,
    dstPort: 53,
    length: 80,
    info: 'Standard query A intranet.universidade.local',
    status: 'normal',
    fields: [
      { label: 'Resolvedor', value: '10.30.0.10 (interno)' },
      { label: 'VLAN', value: '50' },
      { label: 'Query type', value: 'A' },
    ],
  },
  {
    time: '08:07:30.134',
    src: '10.30.0.10',
    dst: '10.30.5.44',
    protocol: 'DNS',
    srcPort: 53,
    dstPort: 51502,
    length: 96,
    info: 'Standard query response A 10.10.50.20',
    status: 'normal',
    fields: [
      { label: 'Response code', value: 'NOERROR' },
      { label: 'Answer', value: '10.10.50.20' },
      { label: 'TTL', value: '300 s' },
    ],
  },
  {
    time: '08:08:02.210',
    src: '10.30.5.44',
    dst: '10.10.50.20',
    protocol: 'TCP',
    srcPort: 49822,
    dstPort: 443,
    length: 74,
    info: '49822 → 443 [SYN] Seq=0 Win=64240 Len=0 MSS=1460',
    status: 'normal',
    fields: [
      { label: 'Flags', value: 'SYN' },
      { label: 'TTL', value: '63' },
      { label: 'Window', value: '64240' },
      { label: 'MSS', value: '1460' },
    ],
  },
  {
    time: '08:08:02.214',
    src: '10.10.50.20',
    dst: '10.30.5.44',
    protocol: 'TCP',
    srcPort: 443,
    dstPort: 49822,
    length: 74,
    info: '443 → 49822 [SYN, ACK] Seq=0 Ack=1 Win=65535 Len=0',
    status: 'normal',
    fields: [
      { label: 'Flags', value: 'SYN, ACK' },
      { label: 'TTL', value: '62' },
      { label: 'Acknowledgment', value: '1' },
    ],
  },
  {
    time: '08:08:02.215',
    src: '10.30.5.44',
    dst: '10.10.50.20',
    protocol: 'TCP',
    srcPort: 49822,
    dstPort: 443,
    length: 66,
    info: '49822 → 443 [ACK] Seq=1 Ack=1 Win=64240 Len=0',
    status: 'normal',
    fields: [
      { label: 'Flags', value: 'ACK' },
      { label: 'Handshake', value: 'concluído' },
    ],
  },
  {
    time: '08:08:02.220',
    src: '10.30.5.44',
    dst: '10.10.50.20',
    protocol: 'TLS',
    srcPort: 49822,
    dstPort: 443,
    length: 517,
    info: 'Client Hello (SNI=portal.universidade.local)',
    status: 'normal',
    fields: [
      { label: 'Versão', value: 'TLS 1.3' },
      { label: 'SNI', value: 'portal.universidade.local' },
      { label: 'Camada', value: 'Apresentação / aplicação' },
    ],
  },
  {
    time: '08:09:30.144',
    src: '10.30.5.31',
    dst: '10.10.50.20',
    protocol: 'TCP',
    srcPort: 49836,
    dstPort: 443,
    length: 74,
    info: '49836 → 443 [SYN] Seq=0 Win=64240 Len=0',
    status: 'normal',
    fields: [
      { label: 'Flags', value: 'SYN' },
      { label: 'VLAN', value: '50 (Laboratório 1)' },
    ],
  },
  {
    time: '08:09:30.148',
    src: '10.10.50.20',
    dst: '10.30.5.31',
    protocol: 'TCP',
    srcPort: 443,
    dstPort: 49836,
    length: 74,
    info: '443 → 49836 [SYN, ACK] Seq=0 Ack=1 Win=65535 Len=0',
    status: 'normal',
    fields: [
      { label: 'Flags', value: 'SYN, ACK' },
      { label: 'Serviço', value: 'portal acessível' },
    ],
  },
  {
    time: '08:12:44.770',
    src: '10.30.4.23',
    dst: '224.0.0.251',
    protocol: 'UDP',
    srcPort: 5353,
    dstPort: 5353,
    length: 92,
    info: 'Multicast DNS query (serviço local)',
    status: 'normal',
    fields: [
      { label: 'Destino', value: 'mDNS / 224.0.0.251' },
      { label: 'Cliente', value: 'LAB-2-PC-07' },
      { label: 'Tipo', value: 'descoberta local' },
    ],
  },
]

export const trafficPackets: TrafficPacket[] = packets.map((packet, index) => ({
  ...packet,
  id: `PKT-${String(index + 1).padStart(3, '0')}`,
}))

export const TRAFFIC_SCENARIO = {
  title: 'Consulta que não deveria sair',
  context:
    'Recorte sintético do uplink do Laboratório 2 durante a janela de indisponibilidade do portal. Horários em BRT (UTC-3). Os payloads não foram capturados; apenas cabeçalhos e metadados.',
  source: 'Captura didática · 14/09/2026 · 08:05–08:13 BRT',
  warning:
    'A captura é um recorte. Não é possível concluir que houve exfiltração, comprometimento do host ou ausência total de outros fluxos a partir destes dados.',
  objectives: [
    'Aplicar filtros e localizar um padrão de consultas repetidas.',
    'Distinguir um pedido DNS de uma resposta e interpretar o código NXDOMAIN.',
    'Reconhecer o limite de uma captura de cabeçalhos antes de afirmar comprometimento.',
  ],
}

export interface TrafficChallenge {
  id: string
  prompt: string
  kind: 'short' | 'mcq'
  choices?: Array<{ id: string; label: string }>
  answer: string
  explanation: string
}

export const trafficChallenges: TrafficChallenge[] = [
  {
    id: 'host-externo',
    prompt: 'Qual host realizou consultas DNS repetidas a um resolvedor externo? Informe apenas o IPv4.',
    kind: 'short',
    answer: '10.30.4.23',
    explanation:
      'O endereço 10.30.4.23 aparece como origem de três consultas ao resolvedor externo 8.8.8.8. As consultas do Laboratório 1 vão para o DNS interno 10.30.0.10.',
  },
  {
    id: 'codigo-resposta',
    prompt: 'Qual código de resposta indica que o nome consultado não existe para aquele resolvedor?',
    kind: 'mcq',
    choices: [
      { id: 'noerror', label: 'NOERROR' },
      { id: 'nxdomain', label: 'NXDOMAIN' },
      { id: 'synack', label: 'SYN, ACK' },
      { id: 'timeout', label: 'Timeout de ICMP' },
    ],
    answer: 'nxdomain',
    explanation:
      'NXDOMAIN significa que o servidor DNS respondeu que o nome não existe na zona consultada. NOERROR indicaria resposta válida, mesmo que sem registros.',
  },
  {
    id: 'exfiltracao',
    prompt:
      'A captura permite afirmar que o host 10.30.4.23 exfiltrou dados por HTTPS?',
    kind: 'mcq',
    choices: [
      {
        id: 'sim',
        label: 'Sim, as consultas DNS provam a exfiltração.',
      },
      {
        id: 'nao',
        label:
          'Não. Não há fluxo TCP/443 originado do host e a captura contém apenas cabeçalhos de um recorte.',
      },
      {
        id: 'talvez',
        label: 'Sim, porque todo NXDOMAIN indica comando e controle.',
      },
    ],
    answer: 'nao',
    explanation:
      'Consultas DNS não são transferência de dados por HTTPS. A captura mostra apenas cabeçalhos de um recorte e nenhum fluxo TCP/443 do host. Uma conclusão responsável exige mais fontes e não pode transformar ausência de evidência em prova de inocência ou de culpa.',
  },
]
