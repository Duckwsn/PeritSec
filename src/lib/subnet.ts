/** Utilitários IPv4/CIDR determinísticos. Trabalham com inteiros sem sinal de 32 bits. */

export interface SubnetInfo {
  cidr: string
  network: string
  broadcast: string
  firstUsable: string
  lastUsable: string
  prefix: number
  mask: string
  usableHosts: number
  totalAddresses: number
}

export function parseIpv4(value: string): number | null {
  const parts = value.trim().split('.')
  if (parts.length !== 4) return null
  let result = 0
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null
    const octet = Number(part)
    if (octet < 0 || octet > 255) return null
    if (part.length > 1 && part.startsWith('0')) return null
    result = result * 256 + octet
  }
  return result >>> 0
}

export function isIpv4(value: string): boolean {
  return parseIpv4(value) !== null
}

export function ipv4ToInt(value: string): number {
  const parsed = parseIpv4(value)
  if (parsed === null) throw new Error(`Endereço IPv4 inválido: ${value}`)
  return parsed
}

export function intToIpv4(value: number): string {
  const n = value >>> 0
  return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')
}

export function maskToPrefix(mask: string): number | null {
  const numeric = parseIpv4(mask)
  if (numeric === null) return null
  let prefix = 0
  let seenZero = false
  for (let bit = 31; bit >= 0; bit -= 1) {
    const set = ((numeric >>> bit) & 1) === 1
    if (set && seenZero) return null
    if (set) prefix += 1
    else seenZero = true
  }
  return prefix
}

export function prefixToMask(prefix: number): string {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new Error(`Prefixo inválido: ${prefix}`)
  }
  if (prefix === 0) return '0.0.0.0'
  return intToIpv4((0xffffffff << (32 - prefix)) >>> 0)
}

export function networkAddress(ip: string, prefix: number): string {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  return intToIpv4((ipv4ToInt(ip) & mask) >>> 0)
}

export function broadcastAddress(ip: string, prefix: number): string {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  return intToIpv4((ipv4ToInt(ip) | (~mask >>> 0)) >>> 0)
}

export function analyzeCidr(cidr: string): SubnetInfo | null {
  const [ip, prefixText, ...rest] = cidr.trim().split('/')
  if (!ip || !prefixText || rest.length > 0) return null
  if (!isIpv4(ip)) return null
  if (!/^\d{1,2}$/.test(prefixText)) return null
  const prefix = Number(prefixText)
  if (prefix < 0 || prefix > 32) return null
  return analyzeSubnet(ip, prefix)
}

export function analyzeSubnet(ip: string, prefix: number): SubnetInfo | null {
  if (!isIpv4(ip) || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null
  const network = networkAddress(ip, prefix)
  const broadcast = broadcastAddress(ip, prefix)
  const totalAddresses = 2 ** (32 - prefix)
  const usableHosts = prefix >= 31 ? (prefix === 32 ? 1 : 2) : totalAddresses - 2
  const networkInt = ipv4ToInt(network)
  const broadcastInt = ipv4ToInt(broadcast)
  return {
    cidr: `${network}/${prefix}`,
    network,
    broadcast,
    firstUsable: prefix === 32 ? network : intToIpv4(networkInt + 1),
    lastUsable: prefix === 32 ? network : intToIpv4(broadcastInt - 1),
    prefix,
    mask: prefixToMask(prefix),
    usableHosts,
    totalAddresses,
  }
}

export function sameSubnet(a: string, b: string, prefix: number): boolean {
  return networkAddress(a, prefix) === networkAddress(b, prefix)
}

export function isHostInCidr(hostIp: string, cidr: string): boolean {
  const network = analyzeCidr(cidr)
  if (!network || !isIpv4(hostIp)) return false
  return networkAddress(hostIp, network.prefix) === network.network
}

export function isPrivateIpv4(ip: string): boolean {
  const value = parseIpv4(ip)
  if (value === null) return false
  const a = value >>> 24
  const b = (value >>> 16) & 255
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
}

export function isValidHostAddress(ip: string, prefix: number): boolean {
  const info = analyzeSubnet(ip, prefix)
  if (!info) return false
  if (prefix <= 30) {
    return ip !== info.network && ip !== info.broadcast
  }
  return true
}

/** Gerador determinístico (LCG) para variar exercícios sem perder reprodutibilidade. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0 || 0x9e3779b9
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  }
}

export interface GeneratedSubnetChallenge {
  seed: number
  hostCidr: string
  ip: string
  prefix: number
  network: string
  broadcast: string
  firstUsable: string
  lastUsable: string
  usableHosts: number
  mask: string
}

export function generateSubnetChallenge(seed: number): GeneratedSubnetChallenge {
  const random = createRandom(seed)
  const bases = ['10.20.0.0', '172.16.10.0', '192.168.50.0', '10.80.32.0', '172.20.4.0']
  const base = bases[Math.floor(random() * bases.length)]
  const prefix = [22, 23, 24, 25, 26, 27, 28][Math.floor(random() * 7)]
  const info = analyzeSubnet(base, prefix)
  if (!info) throw new Error('Falha ao gerar cenário de sub-rede')
  const size = 2 ** (32 - prefix)
  const offset = 1 + Math.floor(random() * Math.max(1, size - 2))
  const ip = intToIpv4(ipv4ToInt(info.network) + offset)
  return {
    seed,
    hostCidr: `${ip}/${prefix}`,
    ip,
    prefix,
    network: info.network,
    broadcast: info.broadcast,
    firstUsable: info.firstUsable,
    lastUsable: info.lastUsable,
    usableHosts: info.usableHosts,
    mask: info.mask,
  }
}

export function normalizeCidr(value: string): string | null {
  const info = analyzeCidr(value)
  return info?.cidr ?? null
}
