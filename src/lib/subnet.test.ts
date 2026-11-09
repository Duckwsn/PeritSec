import { describe, expect, it } from 'vitest'
import {
  analyzeCidr,
  analyzeSubnet,
  generateSubnetChallenge,
  intToIpv4,
  ipv4ToInt,
  isHostInCidr,
  isPrivateIpv4,
  isValidHostAddress,
  maskToPrefix,
  networkAddress,
  normalizeCidr,
  parseIpv4,
  prefixToMask,
  sameSubnet,
} from './subnet'

describe('IPv4 e sub-redes', () => {
  it('analisa 10.30.4.23/24 com limites corretos', () => {
    const info = analyzeSubnet('10.30.4.23', 24)
    expect(info).not.toBeNull()
    expect(info).toMatchObject({
      cidr: '10.30.4.0/24',
      network: '10.30.4.0',
      broadcast: '10.30.4.255',
      firstUsable: '10.30.4.1',
      lastUsable: '10.30.4.254',
      prefix: 24,
      mask: '255.255.255.0',
      usableHosts: 254,
      totalAddresses: 256,
    })
  })

  it('rejeita octetos inválidos, zeros à esquerda e máscaras não contíguas', () => {
    expect(parseIpv4('10.30.4.256')).toBeNull()
    expect(parseIpv4('10.30.04.23')).toBeNull()
    expect(parseIpv4('10.30.4')).toBeNull()
    expect(parseIpv4('10.30.4.23 ')).toBe(ipv4ToInt('10.30.4.23'))
    expect(maskToPrefix('255.255.255.0')).toBe(24)
    expect(maskToPrefix('255.0.255.0')).toBeNull()
    expect(prefixToMask(24)).toBe('255.255.255.0')
    expect(() => prefixToMask(33)).toThrow()
  })

  it('preserva a conversão entre inteiro e notação decimal', () => {
    const ip = '192.168.50.77'
    expect(intToIpv4(ipv4ToInt(ip))).toBe(ip)
    expect(networkAddress(ip, 26)).toBe('192.168.50.64')
    expect(isHostInCidr(ip, '192.168.50.64/26')).toBe(true)
    expect(isHostInCidr(ip, '192.168.50.0/24')).toBe(true)
    expect(isHostInCidr(ip, '10.0.0.0/8')).toBe(false)
    expect(sameSubnet('10.30.4.23', '10.30.4.1', 24)).toBe(true)
    expect(sameSubnet('10.30.4.23', '10.30.5.1', 24)).toBe(false)
  })

  it('trata redes /31 e /32 sem inventar hosts utilizáveis', () => {
    expect(analyzeSubnet('10.0.0.0', 31)?.usableHosts).toBe(2)
    expect(analyzeSubnet('10.0.0.0', 32)?.usableHosts).toBe(1)
    expect(analyzeSubnet('10.0.0.0', 30)?.usableHosts).toBe(2)
    expect(isValidHostAddress('10.0.0.0', 24)).toBe(false)
    expect(isValidHostAddress('10.0.0.255', 24)).toBe(false)
    expect(isValidHostAddress('10.0.0.1', 24)).toBe(true)
  })

  it('normaliza CIDR e rejeita entradas malformadas', () => {
    expect(normalizeCidr('10.30.4.23/24')).toBe('10.30.4.0/24')
    expect(analyzeCidr('10.30.4.23/33')).toBeNull()
    expect(analyzeCidr('10.30.4.23/24/8')).toBeNull()
    expect(analyzeCidr('10.30.4/24')).toBeNull()
  })

  it('reconhece faixas privadas', () => {
    expect(isPrivateIpv4('10.30.4.23')).toBe(true)
    expect(isPrivateIpv4('172.16.10.1')).toBe(true)
    expect(isPrivateIpv4('172.32.10.1')).toBe(false)
    expect(isPrivateIpv4('192.168.50.1')).toBe(true)
    expect(isPrivateIpv4('8.8.8.8')).toBe(false)
  })

  it('gera o mesmo desafio para a mesma semente e um host válido', () => {
    const first = generateSubnetChallenge(20260914)
    const second = generateSubnetChallenge(20260914)
    expect(first).toEqual(second)
    expect(first.usableHosts).toBeGreaterThan(0)
    expect(isValidHostAddress(first.ip, first.prefix)).toBe(true)
    expect(first.ip).not.toBe(first.network)
    expect(first.ip).not.toBe(first.broadcast)
  })
})
