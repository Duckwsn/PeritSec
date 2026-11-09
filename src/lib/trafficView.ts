import type { TrafficPacket } from '../data/traffic'

export type TrafficPreset = 'todos' | 'dns' | 'tcp-tls' | 'anomalias' | 'portal'

export interface TrafficFilter {
  protocol: string
  status: string
  preset: TrafficPreset
  search: string
}

export function packetMatchesTrafficSearch(packet: TrafficPacket, search: string): boolean {
  if (!search) return true
  const haystack = [
    packet.id,
    packet.time,
    packet.src,
    packet.dst,
    packet.protocol,
    packet.info,
    String(packet.length),
    ...packet.fields.flatMap((field) => [field.label, field.value]),
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(search.trim().toLowerCase())
}

export function filterTrafficPackets(
  packets: TrafficPacket[],
  filter: TrafficFilter,
): TrafficPacket[] {
  return packets.filter((packet) => {
    if (filter.protocol !== 'todos' && packet.protocol !== filter.protocol) return false
    if (filter.status !== 'todos' && packet.status !== filter.status) return false
    if (filter.preset === 'dns' && packet.protocol !== 'DNS') return false
    if (
      filter.preset === 'tcp-tls' &&
      packet.protocol !== 'TCP' &&
      packet.protocol !== 'TLS'
    ) {
      return false
    }
    if (filter.preset === 'anomalias' && packet.status !== 'anomalia') return false
    if (filter.preset === 'portal' && !packet.info.toLowerCase().includes('portal')) return false
    return packetMatchesTrafficSearch(packet, filter.search)
  })
}
