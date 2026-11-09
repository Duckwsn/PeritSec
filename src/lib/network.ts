import {
  analyzeSubnet,
  intToIpv4,
  ipv4ToInt,
  isHostInCidr,
  isIpv4,
  isPrivateIpv4,
  isValidHostAddress,
  maskToPrefix,
  networkAddress,
  parseIpv4,
  prefixToMask,
  sameSubnet,
} from './subnet'

export type DeviceKind = 'pc' | 'switch' | 'router' | 'server'

export interface PcConfig {
  ip: string
  mask: string
  gateway: string
  dns: string
}

export interface PcDevice {
  id: string
  name: string
  kind: 'pc'
  mac: string
  role: string
  position: { x: number; y: number }
  config: PcConfig
}

export interface SwitchPort {
  id: string
  name: string
  deviceId: string
  vlan: number
  mode: 'access' | 'trunk'
  allowedVlans?: number[]
}

export interface SwitchDevice {
  id: string
  name: string
  kind: 'switch'
  role: string
  position: { x: number; y: number }
  ports: SwitchPort[]
}

export interface RouterInterface {
  id: string
  name: string
  ip: string
  mask: string
  vlan?: number
  description: string
}

export interface AclRule {
  id: string
  sequence: number
  action: 'permit' | 'deny'
  protocol: string
  destination: string
  port?: number
  description: string
}

export interface RouterDevice {
  id: string
  name: string
  kind: 'router'
  role: string
  position: { x: number; y: number }
  interfaces: RouterInterface[]
  acl: AclRule[]
}

export interface DnsRecord {
  name: string
  ip: string
  type: 'A'
}

export interface ServerDevice {
  id: string
  name: string
  kind: 'server'
  mac: string
  role: string
  position: { x: number; y: number }
  config: {
    ip: string
    mask: string
    gateway: string
    services: { dns: boolean; https: boolean }
    dnsRecords?: DnsRecord[]
  }
}

export type LabDevice = PcDevice | SwitchDevice | RouterDevice | ServerDevice

export interface LabLink {
  id: string
  from: string
  to: string
  label: string
}

export interface LabState {
  scenarioId: string
  devices: LabDevice[]
}

export const LAB_LINKS: LabLink[] = [
  { id: 'l1', from: 'pc-lab', to: 'switch', label: 'Fa0/1 · VLAN 30' },
  { id: 'l2', from: 'pc-rec', to: 'switch', label: 'Fa0/2 · VLAN 30' },
  { id: 'l3', from: 'dns', to: 'switch', label: 'Fa0/3 · VLAN 10' },
  { id: 'l4', from: 'switch', to: 'router', label: 'G0/0 · trunk 10,30' },
  { id: 'l5', from: 'router', to: 'web', label: 'G0/1 · 10.10.50.0/24' },
]

export const INTERNAL_DNS_IP = '10.30.0.10'
export const PORTAL_IP = '10.10.50.20'
export const PORTAL_NAME = 'portal.universidade.local'
export const LAB_NETWORK_CIDR = '10.30.4.0/24'
export const LAB_GATEWAY = '10.30.4.1'

function baseDevices(): LabDevice[] {
  return [
    {
      id: 'pc-lab',
      name: 'LAB-2-PC-07',
      kind: 'pc',
      mac: '3C:7A:8F:11:20:91',
      role: 'Estação de trabalho · Laboratório 2',
      position: { x: 8, y: 16 },
      config: {
        ip: '10.30.4.23',
        mask: '255.255.255.0',
        gateway: LAB_GATEWAY,
        dns: INTERNAL_DNS_IP,
      },
    },
    {
      id: 'pc-rec',
      name: 'REC-02-PC',
      kind: 'pc',
      mac: '3C:7A:8F:11:20:A4',
      role: 'Estação de trabalho · Recepção',
      position: { x: 8, y: 62 },
      config: {
        ip: '10.30.4.31',
        mask: '255.255.255.0',
        gateway: LAB_GATEWAY,
        dns: INTERNAL_DNS_IP,
      },
    },
    {
      id: 'switch',
      name: 'SW-ACESSO-01',
      kind: 'switch',
      role: 'Switch de acesso · 24 portas',
      position: { x: 36, y: 38 },
      ports: [
        { id: 'fa01', name: 'Fa0/1', deviceId: 'pc-lab', vlan: 30, mode: 'access' },
        { id: 'fa02', name: 'Fa0/2', deviceId: 'pc-rec', vlan: 30, mode: 'access' },
        { id: 'fa03', name: 'Fa0/3', deviceId: 'dns', vlan: 10, mode: 'access' },
        {
          id: 'fa24',
          name: 'Fa0/24',
          deviceId: 'router',
          vlan: 1,
          mode: 'trunk',
          allowedVlans: [10, 30],
        },
      ],
    },
    {
      id: 'dns',
      name: 'DNS-INT',
      kind: 'server',
      mac: '00:1C:0E:BB:10:0A',
      role: 'Resolvedor DNS interno',
      position: { x: 36, y: 82 },
      config: {
        ip: INTERNAL_DNS_IP,
        mask: '255.255.255.0',
        gateway: '10.30.0.1',
        services: { dns: true, https: false },
        dnsRecords: [
          { name: PORTAL_NAME, ip: PORTAL_IP, type: 'A' },
          { name: 'intranet.universidade.local', ip: PORTAL_IP, type: 'A' },
          { name: 'arquivos.universidade.local', ip: '10.10.50.21', type: 'A' },
        ],
      },
    },
    {
      id: 'router',
      name: 'R-EDGE-01',
      kind: 'router',
      role: 'Roteador de borda · inter-VLAN e DMZ',
      position: { x: 64, y: 38 },
      interfaces: [
        {
          id: 'g0010',
          name: 'G0/0.10',
          ip: '10.30.0.1',
          mask: '255.255.255.0',
          vlan: 10,
          description: 'Serviços internos · VLAN 10',
        },
        {
          id: 'g0030',
          name: 'G0/0.30',
          ip: LAB_GATEWAY,
          mask: '255.255.255.0',
          vlan: 30,
          description: 'Laboratórios · VLAN 30',
        },
        {
          id: 'g01',
          name: 'G0/1',
          ip: '10.10.50.1',
          mask: '255.255.255.0',
          description: 'DMZ · servidores',
        },
      ],
      acl: [
        {
          id: 'acl-10',
          sequence: 10,
          action: 'permit',
          protocol: 'icmp',
          destination: 'any',
          description: 'Diagnóstico ICMP permitido na rede didática',
        },
        {
          id: 'acl-20',
          sequence: 20,
          action: 'permit',
          protocol: 'tcp',
          destination: 'host 10.10.50.20',
          port: 443,
          description: 'HTTPS para o portal',
        },
        {
          id: 'acl-30',
          sequence: 30,
          action: 'permit',
          protocol: 'udp',
          destination: 'host 10.30.0.10',
          port: 53,
          description: 'DNS para o resolvedor interno',
        },
        {
          id: 'acl-40',
          sequence: 40,
          action: 'deny',
          protocol: 'ip',
          destination: 'any',
          description: 'Negar e registrar o restante do tráfego',
        },
      ],
    },
    {
      id: 'web',
      name: 'PORTAL-WEB',
      kind: 'server',
      mac: '00:1C:0E:CC:50:14',
      role: 'Servidor web do portal acadêmico',
      position: { x: 89, y: 38 },
      config: {
        ip: PORTAL_IP,
        mask: '255.255.255.0',
        gateway: '10.10.50.1',
        services: { dns: false, https: true },
      },
    },
  ]
}

export interface LabScenario {
  id: string
  code: string
  title: string
  difficulty: 'iniciante' | 'intermediario' | 'avancado'
  minutes: number
  brief: string
  symptom: string
  objective: string
  hint: string
  successMessage: string
  patch: (devices: LabDevice[]) => void
  isComplete: (state: LabState) => boolean
}

function connectivityOk(state: LabState, pcId = 'pc-lab'): boolean {
  return (
    assessReach(state, pcId, PORTAL_IP, 'icmp').ok &&
    resolveName(state, pcId, PORTAL_NAME).ok
  )
}

function allLabHostsUnique(state: LabState): boolean {
  const hosts = state.devices.filter(
    (device): device is PcDevice | ServerDevice => device.kind === 'pc' || device.kind === 'server',
  )
  const seen = new Set<string>()
  for (const host of hosts) {
    if (seen.has(host.config.ip)) return false
    seen.add(host.config.ip)
  }
  return true
}

export const LAB_SCENARIOS: LabScenario[] = [
  {
    id: 'gateway-ausente',
    code: 'CH-1042',
    title: 'Sem saída para o portal',
    difficulty: 'iniciante',
    minutes: 8,
    brief:
      'A estação LAB-2-PC-07 recebe endereço e alcança máquinas da própria sub-rede, mas não abre o portal acadêmico.',
    symptom: 'A equipe suspeita de configuração de estação. Nenhuma alteração foi feita no servidor.',
    objective: 'Restabelecer a comunicação da estação com o portal, mantendo o plano de endereçamento 10.30.4.0/24.',
    hint: 'Comece pelo host. Verifique a configuração de IP e execute um teste para um endereço da própria sub-rede antes de testar o portal.',
    successMessage: 'A estação voltou a resolver o nome e alcançar o portal. O gateway padrão era o elo ausente.',
    patch: (devices) => {
      const pc = devices.find((device) => device.id === 'pc-lab')
      if (pc?.kind === 'pc') pc.config.gateway = ''
    },
    isComplete: (state) => connectivityOk(state, 'pc-lab'),
  },
  {
    id: 'dns-externo',
    code: 'CH-1051',
    title: 'Nome interno não resolve',
    difficulty: 'intermediario',
    minutes: 10,
    brief:
      'O ping para o endereço IP do portal funciona, mas abrir pelo nome falha. Outros computadores da mesma VLAN acessam normalmente.',
    symptom: 'O navegador exibe "nome não encontrado". O testemunho informa que a internet externa também funciona.',
    objective: 'Restabelecer a resolução do nome interno sem alterar o endereço IP do servidor.',
    hint: 'A resolução de nomes é feita por um resolvedor que precisa conhecer a zona interna. Compare o DNS configurado na estação com o serviço disponível na rede.',
    successMessage: 'A estação voltou a usar o resolvedor interno e o portal é resolvido para o endereço correto.',
    patch: (devices) => {
      const pc = devices.find((device) => device.id === 'pc-lab')
      if (pc?.kind === 'pc') pc.config.dns = '8.8.8.8'
    },
    isComplete: (state) => connectivityOk(state, 'pc-lab'),
  },
  {
    id: 'ip-duplicado',
    code: 'CH-1063',
    title: 'Dois donos para um endereço',
    difficulty: 'intermediario',
    minutes: 12,
    brief:
      'A recepção relata perda intermitente de rede. A estação do laboratório e a da recepção apresentam o mesmo endereço IPv4.',
    symptom: 'O sistema operacional pode exibir aviso de conflito de endereço. Os testes alternam entre sucesso e falha.',
    objective: 'Eliminar o conflito, preservar a estação do laboratório e manter os dois hosts aptos a alcançar o portal.',
    hint: 'Inventarie os endereços da VLAN antes de alterar configurações. Um endereço só é válido se for único e pertencer à faixa utilizável da sub-rede.',
    successMessage: 'O endereço duplicado foi corrigido e as duas estações alcançam o portal sem conflito.',
    patch: (devices) => {
      const pc = devices.find((device) => device.id === 'pc-rec')
      if (pc?.kind === 'pc') pc.config.ip = '10.30.4.23'
    },
    isComplete: (state) =>
      allLabHostsUnique(state) &&
      connectivityOk(state, 'pc-lab') &&
      connectivityOk(state, 'pc-rec'),
  },
  {
    id: 'vlan-porta',
    code: 'CH-1077',
    title: 'A porta no lugar errado',
    difficulty: 'avancado',
    minutes: 14,
    brief:
      'Após uma manutenção no rack, a estação do laboratório perdeu acesso aos serviços internos. O switch foi reenergizado e as portas foram reorganizadas.',
    symptom: 'A configuração da estação está correta. O gateway não responde aos testes e o resolvedor interno também não.',
    objective: 'Restaurar a conectividade corrigindo a atribuição de VLAN da porta de acesso, sem tocar na estação.',
    hint: 'Se o host tem IP, máscara e gateway coerentes, investigue a camada 2. Compare a VLAN da porta de acesso com a sub-rede configurada no host.',
    successMessage: 'A porta Fa0/1 voltou à VLAN 30. A estação recuperou a comunicação com o gateway e o DNS.',
    patch: (devices) => {
      const sw = devices.find((device) => device.id === 'switch')
      if (sw?.kind === 'switch') {
        const port = sw.ports.find((candidate) => candidate.id === 'fa01')
        if (port) port.vlan = 20
      }
    },
    isComplete: (state) => connectivityOk(state, 'pc-lab'),
  },
]

export function createInitialDevices(): LabDevice[] {
  return JSON.parse(JSON.stringify(baseDevices())) as LabDevice[]
}

export function getScenario(id: string): LabScenario {
  return LAB_SCENARIOS.find((scenario) => scenario.id === id) ?? LAB_SCENARIOS[0]
}

export function createLabState(scenarioId: string): LabState {
  const devices = createInitialDevices()
  getScenario(scenarioId).patch(devices)
  return { scenarioId, devices }
}

export function getDevice(state: LabState, id: string): LabDevice | undefined {
  return state.devices.find((device) => device.id === id)
}

export function getPcs(state: LabState): PcDevice[] {
  return state.devices.filter((device): device is PcDevice => device.kind === 'pc')
}

export function getSwitch(state: LabState): SwitchDevice {
  const sw = state.devices.find((device) => device.kind === 'switch')
  if (!sw || sw.kind !== 'switch') throw new Error('Switch não encontrado.')
  return sw
}

export function getPortForDevice(state: LabState, deviceId: string): SwitchPort | undefined {
  return getSwitch(state).ports.find((port) => port.deviceId === deviceId)
}

export interface ConfigValidation {
  errors: string[]
  warnings: string[]
}

export function validatePcConfig(
  state: LabState,
  deviceId: string,
  config: PcConfig,
): ConfigValidation {
  const errors: string[] = []
  const warnings: string[] = []
  if (!isIpv4(config.ip)) errors.push('Endereço IPv4 inválido.')
  const prefix = maskToPrefix(config.mask)
  if (prefix === null) errors.push('Máscara de sub-rede inválida ou não contígua.')
  if (isIpv4(config.ip) && prefix !== null) {
    if (!isValidHostAddress(config.ip, prefix)) {
      errors.push('O endereço informado é rede ou broadcast, não um host utilizável.')
    }
    if (prefix !== 24) warnings.push('O plano didático usa /24 (10.30.4.0/24); outra máscara pode isolar o host.')
  }
  if (config.gateway.trim() !== '') {
    if (!isIpv4(config.gateway)) errors.push('Gateway padrão inválido.')
    else if (isIpv4(config.ip) && prefix !== null && !sameSubnet(config.ip, config.gateway, prefix)) {
      errors.push('O gateway não pertence à mesma sub-rede do host.')
    }
  } else {
    warnings.push('Sem gateway padrão: apenas destinos da própria sub-rede serão alcançáveis.')
  }
  if (!isIpv4(config.dns)) errors.push('Servidor DNS inválido.')
  if (isIpv4(config.ip)) {
    const duplicates = state.devices.filter((device) => {
      if (device.id === deviceId) return false
      if (device.kind === 'pc' || device.kind === 'server') return device.config.ip === config.ip
      if (device.kind === 'router') return device.interfaces.some((iface) => iface.ip === config.ip)
      return false
    })
    if (duplicates.length > 0) {
      errors.push(`Endereço já atribuído a ${duplicates.map((device) => device.name).join(', ')}.`)
    }
  }
  return { errors, warnings }
}

export function updatePcConfig(state: LabState, deviceId: string, config: PcConfig): LabState {
  return {
    ...state,
    devices: state.devices.map((device) =>
      device.id === deviceId && device.kind === 'pc'
        ? { ...device, config: { ...config } }
        : device,
    ),
  }
}

export function updateSwitchPortVlan(
  state: LabState,
  switchId: string,
  portId: string,
  vlan: number,
): LabState {
  return {
    ...state,
    devices: state.devices.map((device) =>
      device.id === switchId && device.kind === 'switch'
        ? {
            ...device,
            ports: device.ports.map((port) =>
              port.id === portId && port.mode === 'access' ? { ...port, vlan } : port,
            ),
          }
        : device,
    ),
  }
}

export type ReachCode =
  | 'ok'
  | 'invalid-config'
  | 'duplicate-ip'
  | 'no-gateway'
  | 'gateway-off-subnet'
  | 'vlan-mismatch'
  | 'no-route'
  | 'host-not-found'
  | 'acl-deny'
  | 'service-down'
  | 'external'

export interface ReachAssessment {
  ok: boolean
  code: ReachCode
  reason: string
  path: string[]
  hops: string[]
  targetIp: string
  external: boolean
}

function fail(code: ReachCode, reason: string, targetIp: string, path: string[] = []): ReachAssessment {
  return { ok: false, code, reason, path, hops: [], targetIp, external: false }
}

function routerInterfaceForIp(state: LabState, ip: string): { router: RouterDevice; iface: RouterInterface } | null {
  for (const device of state.devices) {
    if (device.kind !== 'router') continue
    const iface = device.interfaces.find((candidate) => candidate.ip === ip)
    if (iface) return { router: device, iface }
  }
  return null
}

function hostByIp(state: LabState, ip: string): PcDevice | ServerDevice | null {
  for (const device of state.devices) {
    if ((device.kind === 'pc' || device.kind === 'server') && device.config.ip === ip) return device
  }
  return null
}

export function findDuplicatesOf(state: LabState, ip: string, excludeId: string): LabDevice[] {
  return state.devices.filter((device) => {
    if (device.id === excludeId) return false
    if (device.kind === 'pc' || device.kind === 'server') return device.config.ip === ip
    if (device.kind === 'router') return device.interfaces.some((iface) => iface.ip === ip)
    return false
  })
}

function sourceVlan(state: LabState, sourceId: string): { vlan: number; switchId: string } | null {
  const port = getPortForDevice(state, sourceId)
  if (!port) return null
  return { vlan: port.vlan, switchId: getSwitch(state).id }
}

function aclAllows(router: RouterDevice, protocol: 'icmp' | 'tcp' | 'udp', destinationIp: string, port?: number): boolean {
  for (const rule of [...router.acl].sort((a, b) => a.sequence - b.sequence)) {
    const protocolMatches =
      rule.protocol === 'ip' ||
      rule.protocol === protocol ||
      (rule.protocol === 'tcp' && protocol === 'tcp') ||
      (rule.protocol === 'udp' && protocol === 'udp')
    if (!protocolMatches) continue
    const destinationMatches =
      rule.destination === 'any' ||
      rule.destination === `host ${destinationIp}` ||
      (rule.destination.includes('/') && isHostInCidr(destinationIp, rule.destination))
    if (!destinationMatches) continue
    if (rule.port !== undefined && rule.port !== port) continue
    return rule.action === 'permit'
  }
  return false
}

/**
 * Avalia conectividade a partir de um PC, percorrendo L2, gateway, roteamento e ACL.
 * Não executa nada no sistema operacional: é um modelo determinístico do cenário.
 */
export function assessReach(
  state: LabState,
  sourceId: string,
  targetIp: string,
  protocol: 'icmp' | 'tcp' | 'udp' = 'icmp',
  port?: number,
): ReachAssessment {
  const source = getDevice(state, sourceId)
  if (!source || source.kind !== 'pc') {
    return fail('invalid-config', 'A origem precisa ser uma estação de trabalho.', targetIp)
  }
  if (!isIpv4(source.config.ip) || maskToPrefix(source.config.mask) === null) {
    return fail('invalid-config', 'A estação de origem possui endereço ou máscara inválidos.', targetIp)
  }
  if (!isIpv4(targetIp)) {
    return fail('host-not-found', 'O destino não é um endereço IPv4 válido.', targetIp)
  }
  const prefix = maskToPrefix(source.config.mask) as number
  const duplicate = findDuplicatesOf(state, source.config.ip, source.id)
  if (duplicate.length > 0) {
    return fail(
      'duplicate-ip',
      `Conflito de endereço: ${source.config.ip} também está atribuído a ${duplicate
        .map((device) => device.name)
        .join(', ')}.`,
      targetIp,
      [source.id],
    )
  }
  if (targetIp === source.config.ip) {
    return {
      ok: true,
      code: 'ok',
      reason: 'Destino é o próprio host.',
      path: [source.id],
      hops: [],
      targetIp,
      external: false,
    }
  }

  const vlan = sourceVlan(state, source.id)
  if (!vlan) {
    return fail('invalid-config', 'A porta de acesso da estação não foi localizada no switch.', targetIp, [
      source.id,
    ])
  }

  const targetRouter = routerInterfaceForIp(state, targetIp)
  const targetHost = hostByIp(state, targetIp)
  const onLink = sameSubnet(source.config.ip, targetIp, prefix)

  if (onLink) {
    if (targetRouter) {
      if (targetRouter.iface.vlan !== undefined && targetRouter.iface.vlan !== vlan.vlan) {
        return fail(
          'vlan-mismatch',
          `O gateway ${targetIp} está na VLAN ${targetRouter.iface.vlan}, mas a porta da estação está na VLAN ${vlan.vlan}.`,
          targetIp,
          [source.id, vlan.switchId, targetRouter.router.id],
        )
      }
      return {
        ok: true,
        code: 'ok',
        reason: 'Gateway alcançável na mesma sub-rede.',
        path: [source.id, vlan.switchId, targetRouter.router.id],
        hops: [targetRouter.router.name],
        targetIp,
        external: false,
      }
    }
    if (!targetHost) {
      return fail('host-not-found', `Nenhum host ativo possui o endereço ${targetIp}.`, targetIp, [
        source.id,
        vlan.switchId,
      ])
    }
    const targetPort = getPortForDevice(state, targetHost.id)
    if (targetPort && targetPort.vlan !== vlan.vlan) {
      return fail(
        'vlan-mismatch',
        `Origem na VLAN ${vlan.vlan} e destino na VLAN ${targetPort.vlan}: sem roteamento entre VLANs para este par.`,
        targetIp,
        [source.id, vlan.switchId, targetHost.id],
      )
    }
    const targetDuplicate = findDuplicatesOf(state, targetIp, targetHost.id)
    if (targetDuplicate.length > 0) {
      return fail(
        'duplicate-ip',
        `O endereço de destino ${targetIp} está duplicado na rede.`,
        targetIp,
        [source.id, vlan.switchId],
      )
    }
    return {
      ok: true,
      code: 'ok',
      reason: 'Destino na mesma sub-rede.',
      path: [source.id, vlan.switchId, targetHost.id],
      hops: [],
      targetIp,
      external: false,
    }
  }

  if (!source.config.gateway.trim()) {
    return fail(
      'no-gateway',
      'Sem gateway padrão configurado: a estação não sabe por onde sair da sub-rede.',
      targetIp,
      [source.id],
    )
  }
  if (!isIpv4(source.config.gateway) || !sameSubnet(source.config.ip, source.config.gateway, prefix)) {
    return fail(
      'gateway-off-subnet',
      `O gateway ${source.config.gateway} não pertence à sub-rede ${networkAddress(source.config.ip, prefix)}/${prefix}.`,
      targetIp,
      [source.id],
    )
  }
  const gateway = routerInterfaceForIp(state, source.config.gateway)
  if (!gateway) {
    return fail(
      'no-gateway',
      `O endereço ${source.config.gateway} está configurado como gateway, mas não pertence a nenhum roteador ativo.`,
      targetIp,
      [source.id, vlan.switchId],
    )
  }
  if (gateway.iface.vlan !== undefined && gateway.iface.vlan !== vlan.vlan) {
    return fail(
      'vlan-mismatch',
      `A porta da estação está na VLAN ${vlan.vlan}, mas o gateway ${gateway.iface.ip} atende a VLAN ${gateway.iface.vlan}.`,
      targetIp,
      [source.id, vlan.switchId, gateway.router.id],
    )
  }
  const trunk = getSwitch(state).ports.find((candidate) => candidate.mode === 'trunk')
  if (trunk?.allowedVlans && !trunk.allowedVlans.includes(vlan.vlan)) {
    return fail(
      'vlan-mismatch',
      `A VLAN ${vlan.vlan} não está liberada no trunk do switch.`,
      targetIp,
      [source.id, vlan.switchId, gateway.router.id],
    )
  }

  const matchingInterface = gateway.router.interfaces.find((iface) => {
    const ifacePrefix = maskToPrefix(iface.mask)
    return ifacePrefix !== null && sameSubnet(iface.ip, targetIp, ifacePrefix)
  })

  if (!matchingInterface) {
    if (isIpv4(targetIp) && !isPrivateIpv4(targetIp)) {
      return {
        ok: true,
        code: 'external',
        reason: `Destino externo ${targetIp} alcançável pela rota padrão simulada.`,
        path: [source.id, vlan.switchId, gateway.router.id],
        hops: [gateway.router.name, 'Internet (simulada)'],
        targetIp,
        external: true,
      }
    }
    return fail(
      'no-route',
      `O roteador não possui rota para ${targetIp}. A rota padrão didática cobre apenas destinos públicos.`,
      targetIp,
      [source.id, vlan.switchId, gateway.router.id],
    )
  }

  if (targetRouter) {
    return {
      ok: true,
      code: 'ok',
      reason: 'Interface do roteador alcançável.',
      path: [source.id, vlan.switchId, gateway.router.id],
      hops: [gateway.router.name],
      targetIp,
      external: false,
    }
  }

  if (!targetHost) {
    return fail(
      'host-not-found',
      `A rota existe, mas nenhum host ativo responde por ${targetIp}.`,
      targetIp,
      [source.id, vlan.switchId, gateway.router.id],
    )
  }

  if (targetHost.kind === 'server' && protocol === 'tcp' && port === 443 && !targetHost.config.services.https) {
    return fail('service-down', 'O serviço HTTPS do servidor de destino está indisponível.', targetIp, [
      source.id,
      vlan.switchId,
      gateway.router.id,
      targetHost.id,
    ])
  }
  if (targetHost.kind === 'server' && protocol === 'udp' && port === 53 && !targetHost.config.services.dns) {
    return fail('service-down', 'O serviço DNS do servidor de destino está indisponível.', targetIp, [
      source.id,
      vlan.switchId,
      gateway.router.id,
      targetHost.id,
    ])
  }

  if (!aclAllows(gateway.router, protocol, targetIp, port)) {
    return fail(
      'acl-deny',
      `A ACL do roteador negou ${protocol.toUpperCase()}${port ? `/${port}` : ''} para ${targetIp}.`,
      targetIp,
      [source.id, vlan.switchId, gateway.router.id],
    )
  }

  const path = [source.id, vlan.switchId, gateway.router.id]
  if (targetHost.kind === 'server' && getPortForDevice(state, targetHost.id)) {
    path.push(vlan.switchId)
  }
  path.push(targetHost.id)

  return {
    ok: true,
    code: 'ok',
    reason: 'Caminho roteado disponível.',
    path,
    hops: [gateway.router.name, ...(targetHost.kind === 'server' ? [targetHost.name] : [])],
    targetIp,
    external: false,
  }
}

export type ResolveCode =
  | 'ok'
  | 'no-dns'
  | 'invalid-config'
  | 'duplicate-ip'
  | 'dns-unreachable'
  | 'service-down'
  | 'nxdomain'
  | 'timeout'

export interface NameResolution {
  ok: boolean
  code: ResolveCode
  reason: string
  queryName: string
  ip?: string
  resolver: string
  resolverKind: 'internal' | 'external' | 'unknown'
  path: string[]
}

export function resolveName(state: LabState, sourceId: string, name: string): NameResolution {
  const queryName = name.trim().toLowerCase()
  const source = getDevice(state, sourceId)
  if (!source || source.kind !== 'pc') {
    return {
      ok: false,
      code: 'invalid-config',
      reason: 'A consulta precisa partir de uma estação de trabalho.',
      queryName,
      resolver: '',
      resolverKind: 'unknown',
      path: [],
    }
  }
  const resolver = source.config.dns.trim()
  if (!resolver) {
    return {
      ok: false,
      code: 'no-dns',
      reason: 'Nenhum servidor DNS está configurado na estação.',
      queryName,
      resolver: '',
      resolverKind: 'unknown',
      path: [source.id],
    }
  }
  if (!isIpv4(resolver)) {
    return {
      ok: false,
      code: 'invalid-config',
      reason: 'O servidor DNS configurado não é um IPv4 válido.',
      queryName,
      resolver,
      resolverKind: 'unknown',
      path: [source.id],
    }
  }
  if (!isIpv4(source.config.ip) || maskToPrefix(source.config.mask) === null) {
    return {
      ok: false,
      code: 'invalid-config',
      reason: 'A configuração de rede da estação impede a consulta DNS.',
      queryName,
      resolver,
      resolverKind: 'unknown',
      path: [source.id],
    }
  }
  const duplicate = findDuplicatesOf(state, source.config.ip, source.id)
  if (duplicate.length > 0) {
    return {
      ok: false,
      code: 'duplicate-ip',
      reason: `Conflito de endereço: ${source.config.ip} está atribuído a mais de um host.`,
      queryName,
      resolver,
      resolverKind: 'unknown',
      path: [source.id],
    }
  }

  const assessment = assessReach(state, sourceId, resolver, 'udp', 53)
  if (!assessment.ok) {
    return {
      ok: false,
      code: 'dns-unreachable',
      reason: `O resolvedor ${resolver} não está acessível. ${assessment.reason}`,
      queryName,
      resolver,
      resolverKind: resolver === INTERNAL_DNS_IP ? 'internal' : 'external',
      path: assessment.path,
    }
  }

  if (resolver === INTERNAL_DNS_IP) {
    const dns = state.devices.find(
      (device) => device.kind === 'server' && device.config.ip === INTERNAL_DNS_IP,
    )
    if (dns?.kind !== 'server' || !dns.config.services.dns) {
      return {
        ok: false,
        code: 'service-down',
        reason: 'O serviço DNS interno não está disponível.',
        queryName,
        resolver,
        resolverKind: 'internal',
        path: assessment.path,
      }
    }
    const record = dns.config.dnsRecords?.find((candidate) => candidate.name.toLowerCase() === queryName)
    if (!record) {
      return {
        ok: false,
        code: 'nxdomain',
        reason: `NXDOMAIN: a zona interna não possui registro para ${queryName}.`,
        queryName,
        resolver,
        resolverKind: 'internal',
        path: assessment.path,
      }
    }
    return {
      ok: true,
      code: 'ok',
      reason: `Registro A interno: ${queryName} → ${record.ip}.`,
      queryName,
      ip: record.ip,
      resolver,
      resolverKind: 'internal',
      path: assessment.path,
    }
  }

  const internalDevice = state.devices.find(
    (device) =>
      (device.kind === 'pc' || device.kind === 'server') && device.config.ip === resolver,
  )
  if (internalDevice) {
    return {
      ok: false,
      code: 'timeout',
      reason: `O host ${resolver} não executa um serviço DNS didático.`,
      queryName,
      resolver,
      resolverKind: 'unknown',
      path: assessment.path,
    }
  }

  if (queryName === PORTAL_NAME || queryName.endsWith('.local')) {
    return {
      ok: false,
      code: 'nxdomain',
      reason: `NXDOMAIN: o resolvedor externo ${resolver} não conhece a zona interna .local.`,
      queryName,
      resolver,
      resolverKind: 'external',
      path: assessment.path,
    }
  }
  const publicIp = queryName === 'example.org' ? '93.184.216.34' : '203.0.113.10'
  return {
    ok: true,
    code: 'ok',
    reason: `Consulta externa simulada: ${queryName} → ${publicIp}.`,
    queryName,
    ip: publicIp,
    resolver,
    resolverKind: 'external',
    path: assessment.path,
  }
}

export interface PacketEvent {
  protocol: 'DNS' | 'ICMP' | 'TCP' | 'UDP' | 'ARP'
  offsetMs: number
  src: string
  dst: string
  sourcePort?: number
  destPort?: number
  length: number
  info: string
  status: 'ok' | 'fail' | 'warn'
  layer: 'Aplicação' | 'Transporte' | 'Rede' | 'Enlace'
  path: string[]
  fields: Record<string, string | number>
}

export interface CommandResult {
  command: string
  output: string
  events: PacketEvent[]
  ok: boolean
  cleared?: boolean
}

function bitsToIp(value: number): string {
  return intToIpv4(value)
}

function ipconfigText(pc: PcDevice, duplicates: LabDevice[]): string {
  const prefix = maskToPrefix(pc.config.mask)
  const network = prefix !== null && isIpv4(pc.config.ip) ? networkAddress(pc.config.ip, prefix) : 'inválida'
  const conflict =
    duplicates.length > 0
      ? `\nAVISO: conflito de endereço com ${duplicates.map((device) => device.name).join(', ')}.`
      : ''
  return [
    'Configuração de IP do Windows · ambiente simulado',
    '',
    `Host: ${pc.name}`,
    'Adaptador Ethernet:',
    `   Endereço IPv4. . . . . . . . . . . . . : ${pc.config.ip || '(vazio)'}`,
    `   Máscara de sub-rede. . . . . . . . . . : ${pc.config.mask || '(vazia)'}`,
    `   Rede calculada. . . . . . . . . . . . . : ${network}${prefix !== null ? `/${prefix}` : ''}`,
    `   Gateway padrão. . . . . . . . . . . . . : ${pc.config.gateway || '(vazio)'}`,
    `   Servidor DNS. . . . . . . . . . . . . . : ${pc.config.dns || '(vazio)'}`,
    `   Endereço físico. . . . . . . . . . . . : ${pc.mac}`,
    conflict,
  ].join('\n')
}

function ipAddrText(pc: PcDevice): string {
  const prefix = maskToPrefix(pc.config.mask)
  return [
    '1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536',
    '    inet 127.0.0.1/8 scope host lo',
    '2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP',
    `    link/ether ${pc.mac.toLowerCase()} brd ff:ff:ff:ff:ff:ff`,
    `    inet ${pc.config.ip || '(sem endereço)'}/${prefix ?? '?'} scope global eth0`,
    `    default via ${pc.config.gateway || '(sem gateway)'} dev eth0`,
    `    dns ${pc.config.dns || '(sem DNS)'}`,
  ].join('\n')
}

function gatewayUsable(state: LabState, pc: PcDevice): boolean {
  if (!isIpv4(pc.config.gateway) || !isIpv4(pc.config.ip)) return false
  const prefix = maskToPrefix(pc.config.mask)
  if (prefix === null || !sameSubnet(pc.config.ip, pc.config.gateway, prefix)) return false
  const port = getPortForDevice(state, pc.id)
  const router = routerInterfaceForIp(state, pc.config.gateway)
  if (!port || !router) return false
  return router.iface.vlan === undefined || router.iface.vlan === port.vlan
}

function arpText(state: LabState, pc: PcDevice): string {
  const lines = [`Interface: ${pc.config.ip || '(sem IP)'} --- 0x8`]
  const entries: string[] = []
  if (gatewayUsable(state, pc)) {
    const router = routerInterfaceForIp(state, pc.config.gateway)
    if (router) {
      entries.push(
        `  ${pc.config.gateway.padEnd(15)}  ${router.iface.vlan === 30 ? '00-1c-0e-aa-30-01' : '00-1c-0e-aa-00-01'}  dinâmico`,
      )
    }
  }
  const rec = state.devices.find((device) => device.id === 'pc-rec')
  if (rec?.kind === 'pc') {
    const sourcePort = getPortForDevice(state, pc.id)
    const targetPort = getPortForDevice(state, rec.id)
    if (
      sourcePort &&
      targetPort &&
      sourcePort.vlan === targetPort.vlan &&
      isIpv4(pc.config.ip) &&
      maskToPrefix(pc.config.mask) !== null &&
      sameSubnet(pc.config.ip, rec.config.ip, maskToPrefix(pc.config.mask) as number) &&
      rec.config.ip !== pc.config.ip
    ) {
      entries.push(`  ${rec.config.ip.padEnd(15)}  ${rec.mac.toLowerCase().replaceAll(':', '-')}  dinâmico`)
    }
  }
  if (entries.length === 0) {
    lines.push('  Nenhuma entrada ARP dinâmica disponível.')
  } else {
    lines.push('  Endereço IP       Endereço físico       Tipo')
    lines.push(...entries)
  }
  return lines.join('\n')
}

function routeText(pc: PcDevice): string {
  const prefix = maskToPrefix(pc.config.mask)
  const lines: string[] = ['Tabela de rotas (simulada)']
  if (isIpv4(pc.config.ip) && prefix !== null) {
    lines.push(
      `  ${networkAddress(pc.config.ip, prefix)}/${prefix}  diretamente conectado  interface eth0`,
    )
  }
  if (gatewayUsableForText(pc)) {
    lines.push(`  0.0.0.0/0                  via ${pc.config.gateway}          interface eth0`)
  } else {
    lines.push('  Nenhuma rota padrão válida.')
  }
  return lines.join('\n')
}

function gatewayUsableForText(pc: PcDevice): boolean {
  if (!isIpv4(pc.config.gateway) || !isIpv4(pc.config.ip)) return false
  const prefix = maskToPrefix(pc.config.mask)
  if (prefix === null) return false
  return sameSubnet(pc.config.ip, pc.config.gateway, prefix)
}

function dnsQueryEvent(
  sourceIp: string,
  resolver: string,
  queryName: string,
  response: NameResolution,
  offsetMs: number,
): PacketEvent[] {
  const events: PacketEvent[] = [
    {
      protocol: 'DNS',
      offsetMs,
      src: sourceIp,
      dst: resolver,
      sourcePort: 53142,
      destPort: 53,
      length: 74,
      info: `Standard query A ${queryName}`,
      status: 'ok',
      layer: 'Aplicação',
      path: response.path,
      fields: {
        'Transaction ID': '0x4a2f',
        Flags: 'RD = 1',
        Questions: 1,
        'Query type': 'A',
        Name: queryName,
      },
    },
  ]
  if (response.code === 'dns-unreachable') {
    events.push({
      protocol: 'DNS',
      offsetMs: offsetMs + 2000,
      src: resolver,
      dst: sourceIp,
      destPort: 53142,
      sourcePort: 53,
      length: 0,
      info: 'Sem resposta: resolvedor inacessível',
      status: 'fail',
      layer: 'Aplicação',
      path: response.path,
      fields: { Resultado: 'timeout', 'Tentativas': 2 },
    })
  } else if (response.ok) {
    events.push({
      protocol: 'DNS',
      offsetMs: offsetMs + 24,
      src: resolver,
      dst: sourceIp,
      sourcePort: 53,
      destPort: 53142,
      length: 90,
      info: `Standard query response A ${response.ip}`,
      status: 'ok',
      layer: 'Aplicação',
      path: response.path,
      fields: {
        'Transaction ID': '0x4a2f',
        'Response code': 'NOERROR',
        Answers: 1,
        'Address': response.ip ?? '',
        TTL: 300,
      },
    })
  } else {
    events.push({
      protocol: 'DNS',
      offsetMs: offsetMs + 34,
      src: resolver,
      dst: sourceIp,
      sourcePort: 53,
      destPort: 53142,
      length: 78,
      info: 'Standard query response: NXDOMAIN',
      status: 'fail',
      layer: 'Aplicação',
      path: response.path,
      fields: {
        'Transaction ID': '0x4a2f',
        'Response code': 'NXDOMAIN',
        Answers: 0,
        'Authority': 'SOA local',
      },
    })
  }
  return events
}

function pingEvents(
  src: string,
  dst: string,
  ok: boolean,
  path: string[],
  startOffset = 0,
): PacketEvent[] {
  if (!ok) {
    return [
      {
        protocol: 'ICMP',
        offsetMs: startOffset,
        src,
        dst,
        length: 74,
        info: 'Echo request sem resposta',
        status: 'fail',
        layer: 'Rede',
        path,
        fields: { Type: 8, Code: 0, TTL: 64, 'Resposta': 'ausente' },
      },
    ]
  }
  const events: PacketEvent[] = []
  for (let index = 0; index < 4; index += 1) {
    const offset = startOffset + index * 1000
    const roundTrip = 2 + (index % 2)
    const ttl = 63
    events.push({
      protocol: 'ICMP',
      offsetMs: offset,
      src,
      dst,
      length: 74,
      info: `Echo (ping) request  id=0x0${index + 1}, seq=${index + 1}/4`,
      status: 'ok',
      layer: 'Rede',
      path,
      fields: { Type: 8, Code: 0, Identifier: `0x000${index + 1}`, Sequence: index + 1, TTL: 64 },
    })
    events.push({
      protocol: 'ICMP',
      offsetMs: offset + roundTrip,
      src: dst,
      dst: src,
      length: 74,
      info: `Echo (ping) reply    id=0x0${index + 1}, seq=${index + 1}/4`,
      status: 'ok',
      layer: 'Rede',
      path: [...path].reverse(),
      fields: { Type: 0, Code: 0, TTL: ttl, 'RTT': `${roundTrip} ms` },
    })
  }
  return events
}

function formatPingFailure(result: ReachAssessment): string {
  switch (result.code) {
    case 'duplicate-ip':
      return `Ping indisponível. ${result.reason}\nO sistema pode apresentar perda total ou intermitente até o conflito ser resolvido.`
    case 'no-gateway':
    case 'gateway-off-subnet':
    case 'vlan-mismatch':
      return `Falha ao alcançar ${result.targetIp}: rede de destino inacessível.\nCausa observada: ${result.reason}`
    case 'no-route':
      return `Falha ao alcançar ${result.targetIp}: sem rota para o destino.\nCausa observada: ${result.reason}`
    case 'acl-deny':
      return `Falha ao alcançar ${result.targetIp}: pacote descartado pela política de acesso.`
    case 'host-not-found':
      return `Falha ao alcançar ${result.targetIp}: host inativo ou inexistente.`
    default:
      return `Falha ao alcançar ${result.targetIp}. ${result.reason}`
  }
}

function outputPing(resolvedIp: string, result: ReachAssessment): string {
  if (!result.ok) return formatPingFailure(result)
  const times = [2, 3, 2, 4]
  return [
    `Disparando ${resolvedIp} com 32 bytes de dados:`,
    ...times.map(
      (time, index) =>
        `Resposta de ${resolvedIp}: bytes=32 tempo=${time}ms TTL=63  (seq=${index + 1})`,
    ),
    '',
    'Estatísticas do Ping:',
    '    Pacotes: enviados = 4, recebidos = 4, perdidos = 0 (0% de perda)',
  ].join('\n')
}

function parseTarget(args: string[]): string {
  return args.filter((argument) => !argument.startsWith('-')).at(-1) ?? ''
}

export function runTerminalCommand(state: LabState, hostId: string, raw: string): CommandResult {
  const commandLine = raw.trim().replace(/\s+/g, ' ')
  const host = getDevice(state, hostId)
  if (!host || host.kind !== 'pc') {
    return {
      command: commandLine,
      output: 'O terminal didático está disponível apenas para estações de trabalho neste cenário.',
      events: [],
      ok: false,
    }
  }
  if (!commandLine) {
    return { command: '', output: '', events: [], ok: true }
  }
  const [command, ...args] = commandLine.split(' ')
  const normalized = command.toLowerCase()
  const duplicates = findDuplicatesOf(state, host.config.ip, host.id)

  if (normalized === 'clear' || normalized === 'cls') {
    return { command: commandLine, output: '', events: [], ok: true, cleared: true }
  }

  if (normalized === 'help' || normalized === '?') {
    return {
      command: commandLine,
      output: [
        'Terminal didático conectado ao estado da topologia.',
        '',
        'Comandos disponíveis:',
        '  ping <ip|nome>       Testa alcance e tempo de resposta',
        '  tracert <ip|nome>    Mostra o caminho até o destino',
        '  traceroute <ip|nome> Sinônimo de tracert',
        '  ipconfig             Configuração de rede do host',
        '  ip addr              Configuração no estilo Linux',
        '  ip route             Tabela de rotas do host',
        '  nslookup <nome>      Consulta o DNS configurado',
        '  dig <nome>           Consulta DNS detalhada',
        '  arp -a               Exibe a tabela ARP local',
        '  netstat -an          Conexões e portas locais',
        '  ss                   Visão de sockets no estilo Linux',
        '  clear                Limpa a tela',
        '',
        'Ambiente isolado: nenhum comando é executado no sistema operacional real.',
      ].join('\n'),
      events: [],
      ok: true,
    }
  }

  if (normalized === 'ipconfig') {
    return {
      command: commandLine,
      output: ipconfigText(host, duplicates),
      events: [],
      ok: duplicates.length === 0,
    }
  }

  if (normalized === 'ip' && args[0]?.toLowerCase() === 'addr') {
    return { command: commandLine, output: ipAddrText(host), events: [], ok: true }
  }

  if (normalized === 'ip' && args[0]?.toLowerCase() === 'route') {
    return { command: commandLine, output: routeText(host), events: [], ok: true }
  }

  if (normalized === 'arp') {
    return { command: commandLine, output: arpText(state, host), events: [], ok: true }
  }

  if (normalized === 'ping') {
    const target = parseTarget(args)
    if (!target) {
      return { command: commandLine, output: 'Uso: ping <endereço-ip|nome>', events: [], ok: false }
    }
    let targetIp = target
    let resolution: NameResolution | null = null
    if (!isIpv4(target)) {
      resolution = resolveName(state, host.id, target)
      if (!resolution.ok) {
        return {
          command: commandLine,
          output: `Não foi possível resolver "${target}".\n${resolution.reason}`,
          events: dnsQueryEvent(host.config.ip, resolution.resolver, target, resolution, 0),
          ok: false,
        }
      }
      targetIp = resolution.ip as string
    }
    const reach = assessReach(state, host.id, targetIp, 'icmp')
    const resolutionEvents = resolution
      ? dnsQueryEvent(host.config.ip, resolution.resolver, target, resolution, 0)
      : []
    const start = resolutionEvents.length > 0 ? 40 : 0
    return {
      command: commandLine,
      output: outputPing(targetIp, reach),
      events: [...resolutionEvents, ...pingEvents(host.config.ip, targetIp, reach.ok, reach.path, start)],
      ok: reach.ok,
    }
  }

  if (normalized === 'tracert' || normalized === 'traceroute') {
    const target = parseTarget(args)
    if (!target) {
      return {
        command: commandLine,
        output: `Uso: ${normalized} <endereço-ip|nome>`,
        events: [],
        ok: false,
      }
    }
    let targetIp = target
    let resolution: NameResolution | null = null
    if (!isIpv4(target)) {
      resolution = resolveName(state, host.id, target)
      if (!resolution.ok) {
        return {
          command: commandLine,
          output: `Não foi possível resolver "${target}".\n${resolution.reason}`,
          events: dnsQueryEvent(host.config.ip, resolution.resolver, target, resolution, 0),
          ok: false,
        }
      }
      targetIp = resolution.ip as string
    }
    const reach = assessReach(state, host.id, targetIp, 'icmp')
    const lines = [
      `Rastreando a rota para ${target.includes('.') && !isIpv4(target) ? `${target} [${targetIp}]` : targetIp} com no máximo 30 saltos:`,
    ]
    if (!reach.ok) {
      const path = reach.code === 'no-gateway' || reach.code === 'duplicate-ip' ? [] : reach.path
      lines.push('  1     *        *        *       Esgotado o tempo limite do pedido.')
      lines.push('', `Rastreamento interrompido. ${reach.reason}`)
      return {
        command: commandLine,
        output: lines.join('\n'),
        events: [
          ...(resolution ? dnsQueryEvent(host.config.ip, resolution.resolver, target, resolution, 0) : []),
          {
            protocol: 'ICMP',
            offsetMs: 1000,
            src: host.config.ip,
            dst: targetIp,
            length: 74,
            info: 'TTL expirado / sem resposta',
            status: 'fail',
            layer: 'Rede',
            path,
            fields: { 'TTL inicial': 1, Resposta: 'timeout' },
          },
        ],
        ok: false,
      }
    }
    const hops = reach.hops.length > 0 ? reach.hops : [targetIp]
    const hopIps = hops.map((hop, index) => {
      if (index === hops.length - 1) return targetIp
      if (hop.includes('Internet')) return '203.0.113.1'
      return '10.30.4.1'
    })
    hopIps.forEach((ip, index) => {
      lines.push(
        `  ${String(index + 1).padStart(2)}    ${1 + index} ms    ${2 + index} ms    ${2 + index} ms   ${ip}`,
      )
    })
    lines.push('', 'Rastreamento concluído.')
    return {
      command: commandLine,
      output: lines.join('\n'),
      events: [
        ...(resolution ? dnsQueryEvent(host.config.ip, resolution.resolver, target, resolution, 0) : []),
        ...hopIps.map((ip, index) => ({
          protocol: 'ICMP' as const,
          offsetMs: 1000 + index * 500,
          src: host.config.ip,
          dst: ip,
          length: 74,
          info: `Time-to-live exceeded / echo reply · salto ${index + 1}`,
          status: 'ok' as const,
          layer: 'Rede' as const,
          path: reach.path,
          fields: { 'TTL': index + 1, 'Salto': ip, 'RTT': `${1 + index} ms` },
        })),
      ],
      ok: true,
    }
  }

  if (normalized === 'nslookup' || normalized === 'dig') {
    const query = args.find((argument) => !argument.startsWith('-') && !argument.startsWith('+')) ?? ''
    if (!query) {
      return {
        command: commandLine,
        output:
          normalized === 'dig'
            ? 'Uso: dig <nome> [+short]'
            : 'Uso: nslookup <nome>\nResolvedor configurado: ' + (host.config.dns || '(vazio)'),
        events: [],
        ok: false,
      }
    }
    const resolution = resolveName(state, host.id, query)
    const events = dnsQueryEvent(host.config.ip, resolution.resolver, query, resolution, 0)
    if (normalized === 'dig') {
      if (args.includes('+short') && resolution.ok) {
        return { command: commandLine, output: resolution.ip ?? '', events, ok: true }
      }
      const header = [
        `; <<>> DiG simulado <<>> ${query}`,
        `;; SERVER: ${resolution.resolver}#53(${resolution.resolverKind === 'internal' ? 'interno' : 'externo'})`,
        ';; ->>HEADER<<- opcode: QUERY, status: ' +
          (resolution.ok ? 'NOERROR' : resolution.code === 'nxdomain' ? 'NXDOMAIN' : 'SERVFAIL'),
        '',
        ';; QUESTION SECTION:',
        `;${query}.        IN    A`,
        '',
      ]
      if (resolution.ok) {
        header.push(';; ANSWER SECTION:', `${query}.    300    IN    A    ${resolution.ip}`, '')
      }
      header.push(`;; ${resolution.reason}`)
      return { command: commandLine, output: header.join('\n'), events, ok: resolution.ok }
    }
    if (!resolution.ok) {
      return {
        command: commandLine,
        output: [
          `Servidor:  ${resolution.resolver || '(não configurado)'}`,
          'Address:  ' + (resolution.resolver || 'unavailable') + '#53',
          '',
          `*** O servidor não conseguiu encontrar ${query}: ${resolution.code === 'nxdomain' ? 'Non-existent domain' : 'consulta sem resposta'}.`,
          `Detalhe didático: ${resolution.reason}`,
        ].join('\n'),
        events,
        ok: false,
      }
    }
    return {
      command: commandLine,
      output: [
        `Servidor:  ${resolution.resolver}`,
        'Address:  ' + resolution.resolver + '#53',
        '',
        `Nome:     ${query}`,
        `Address:  ${resolution.ip}`,
        '',
        resolution.resolverKind === 'internal'
          ? 'Resposta fornecida pela zona interna simulada.'
          : 'Resposta fornecida por resolvedor externo simulado.',
      ].join('\n'),
      events,
      ok: true,
    }
  }

  if (normalized === 'netstat') {
    return {
      command: commandLine,
      output: [
        'Conexões ativas · ambiente simulado',
        '',
        '  Proto  Endereço local        Endereço externo       Estado',
        '  TCP    0.0.0.0:135          0.0.0.0:0              LISTENING',
        '  TCP    0.0.0.0:445          0.0.0.0:0              LISTENING',
        '  TCP    10.30.4.23:5040      0.0.0.0:0              LISTENING',
        '  UDP    0.0.0.0:5353         *:*',
        '',
        'Nenhuma conexão de saída estabelecida no momento da consulta.',
      ].join('\n'),
      events: [],
      ok: true,
    }
  }

  if (normalized === 'ss') {
    return {
      command: commandLine,
      output: [
        'Netid State  Local Address:Port     Peer Address:Port',
        'tcp   LISTEN 0.0.0.0:135            0.0.0.0:*',
        'tcp   LISTEN 0.0.0.0:445            0.0.0.0:*',
        'udp   UNCONN 0.0.0.0:5353           0.0.0.0:*',
      ].join('\n'),
      events: [],
      ok: true,
    }
  }

  if (normalized === 'hostname') {
    return { command: commandLine, output: host.name, events: [], ok: true }
  }

  return {
    command: commandLine,
    output: `Comando "${normalized}" não reconhecido neste terminal didático. Digite "help" para ver os comandos disponíveis.`,
    events: [],
    ok: false,
  }
}

export function routerRouteTable(state: LabState): string[] {
  const router = state.devices.find((device) => device.kind === 'router')
  if (!router || router.kind !== 'router') return []
  return router.interfaces.map((iface) => {
    const prefix = maskToPrefix(iface.mask)
    const network = prefix !== null
      ? networkAddress(iface.ip, prefix)
      : '?'
    return `${network}/${prefix ?? '?'}  conectado  ${iface.name}`
  })
}

export function summarizeTopology(state: LabState): string {
  const pcs = getPcs(state)
  const sw = getSwitch(state)
  const router = state.devices.find((device) => device.kind === 'router')
  return `6 dispositivos · ${pcs.length} estações · ${sw.ports.length} portas no switch · ${
    router?.kind === 'router' ? router.interfaces.length : 0
  } interfaces no roteador`
}

/** Auxiliar de simulação não usado na interface: mantém conversão disponível para testes. */
export function ipFromInt(value: number): string {
  return bitsToIp(value)
}

/** Reexporta utilitários de rede usados por componentes sem duplicar dependências. */
export { analyzeSubnet, prefixToMask, parseIpv4, ipv4ToInt }
