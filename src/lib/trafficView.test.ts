import { describe, expect, it } from 'vitest'
import { trafficChallenges, trafficPackets } from '../data/traffic'
import { filterTrafficPackets, packetMatchesTrafficSearch } from './trafficView'

describe('captura sintética de tráfego', () => {
  it('mantém dezenove pacotes e identificadores estáveis', () => {
    expect(trafficPackets).toHaveLength(19)
    expect(new Set(trafficPackets.map((packet) => packet.id)).size).toBe(19)
    expect(trafficPackets[0].id).toBe('PKT-001')
    expect(trafficPackets.at(-1)?.id).toBe('PKT-019')
  })

  it('filtra por protocolo, classificação e preset', () => {
    const dns = filterTrafficPackets(trafficPackets, {
      protocol: 'todos',
      status: 'todos',
      preset: 'dns',
      search: '',
    })
    expect(dns.length).toBeGreaterThan(0)
    expect(dns.every((packet) => packet.protocol === 'DNS')).toBe(true)

    const anomalies = filterTrafficPackets(trafficPackets, {
      protocol: 'todos',
      status: 'todos',
      preset: 'anomalias',
      search: '',
    })
    expect(anomalies.length).toBeGreaterThan(0)
    expect(anomalies.every((packet) => packet.status === 'anomalia')).toBe(true)

    const dnsAnomalies = filterTrafficPackets(trafficPackets, {
      protocol: 'DNS',
      status: 'anomalia',
      preset: 'todos',
      search: '',
    })
    expect(dnsAnomalies.length).toBe(anomalies.length)
    expect(dnsAnomalies.every((packet) => packet.protocol === 'DNS')).toBe(true)
  })

  it('busca em campos observados, como NXDOMAIN e resolvedor externo', () => {
    const nxdomain = filterTrafficPackets(trafficPackets, {
      protocol: 'todos',
      status: 'todos',
      preset: 'todos',
      search: 'NXDOMAIN',
    })
    expect(nxdomain.length).toBeGreaterThanOrEqual(3)
    expect(
      nxdomain.every((packet) =>
        packet.info.includes('NXDOMAIN') ||
        packet.fields.some((field) => field.value.includes('NXDOMAIN')),
      ),
    ).toBe(true)

    const searchByField = filterTrafficPackets(trafficPackets, {
      protocol: 'todos',
      status: 'todos',
      preset: 'todos',
      search: 'Resolvedor',
    })
    expect(searchByField.length).toBeGreaterThan(0)
    expect(packetMatchesTrafficSearch(trafficPackets[0], '10.30.4.23')).toBe(true)
    expect(packetMatchesTrafficSearch(trafficPackets[0], 'inexistente')).toBe(false)
  })

  it('combina preset de portal com busca e devolve vazio quando não há correspondência', () => {
    const portal = filterTrafficPackets(trafficPackets, {
      protocol: 'todos',
      status: 'todos',
      preset: 'portal',
      search: 'query',
    })
    expect(portal.length).toBeGreaterThan(0)
    expect(portal.every((packet) => packet.info.toLowerCase().includes('portal'))).toBe(true)
    expect(
      filterTrafficPackets(trafficPackets, {
        protocol: 'todos',
        status: 'todos',
        preset: 'todos',
        search: 'sem-correspondencia-possivel',
      }),
    ).toEqual([])
  })

  it('sustenta os desafios com evidência observável e limites explícitos', () => {
    const byId = new Map(trafficChallenges.map((challenge) => [challenge.id, challenge]))
    expect(byId.get('host-externo')?.answer).toBe('10.30.4.23')
    expect(byId.get('codigo-resposta')?.answer).toBe('nxdomain')
    expect(byId.get('exfiltracao')?.answer).toBe('nao')

    const externalDns = trafficPackets.filter(
      (packet) =>
        packet.protocol === 'DNS' &&
        packet.src === '10.30.4.23' &&
        packet.dst === '8.8.8.8',
    )
    expect(externalDns.length).toBeGreaterThanOrEqual(3)
    const httpsFromAffected = trafficPackets.filter(
      (packet) =>
        packet.protocol === 'TCP' &&
        packet.src === '10.30.4.23' &&
        packet.dstPort === 443,
    )
    expect(httpsFromAffected).toEqual([])
    expect(trafficChallenges.find((challenge) => challenge.id === 'exfiltracao')?.explanation)
      .toContain('recorte')
  })
})
