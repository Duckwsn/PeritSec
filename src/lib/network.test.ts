import { describe, expect, it } from 'vitest'
import {
  INTERNAL_DNS_IP,
  LAB_GATEWAY,
  PORTAL_IP,
  PORTAL_NAME,
  assessReach,
  createLabState,
  findDuplicatesOf,
  getDevice,
  getPcs,
  getScenario,
  resolveName,
  runTerminalCommand,
  updatePcConfig,
  updateSwitchPortVlan,
  validatePcConfig,
  type LabState,
  type PcDevice,
} from './network'

function pc(state: LabState, id = 'pc-lab'): PcDevice {
  const device = getDevice(state, id)
  if (!device || device.kind !== 'pc') throw new Error(`PC ${id} ausente no cenário.`)
  return device
}

function fixedGatewayState(): LabState {
  const state = createLabState('gateway-ausente')
  return updatePcConfig(state, 'pc-lab', { ...pc(state).config, gateway: LAB_GATEWAY })
}

describe('cenários de rede', () => {
  it('gateway ausente: falha externa, configuração local válida e conclusão após corrigir', () => {
    const state = createLabState('gateway-ausente')
    expect(pc(state).config.gateway).toBe('')
    expect(assessReach(state, 'pc-lab', PORTAL_IP)).toMatchObject({
      ok: false,
      code: 'no-gateway',
    })
    expect(getScenario('gateway-ausente').isComplete(state)).toBe(false)
    expect(validatePcConfig(state, 'pc-lab', pc(state).config).warnings.join(' ')).toContain(
      'Sem gateway',
    )

    const fixed = fixedGatewayState()
    expect(assessReach(fixed, 'pc-lab', PORTAL_IP).ok).toBe(true)
    expect(resolveName(fixed, 'pc-lab', PORTAL_NAME).ok).toBe(true)
    expect(getScenario('gateway-ausente').isComplete(fixed)).toBe(true)
  })

  it('DNS externo: IP alcançável, nome interno não resolve e correção restaura o nome', () => {
    const state = createLabState('dns-externo')
    expect(pc(state).config.dns).toBe('8.8.8.8')
    expect(assessReach(state, 'pc-lab', PORTAL_IP).ok).toBe(true)
    const failed = resolveName(state, 'pc-lab', PORTAL_NAME)
    expect(failed.ok).toBe(false)
    expect(failed.code).toBe('nxdomain')

    const fixed = updatePcConfig(state, 'pc-lab', {
      ...pc(state).config,
      dns: INTERNAL_DNS_IP,
    })
    expect(resolveName(fixed, 'pc-lab', PORTAL_NAME)).toMatchObject({
      ok: true,
      ip: PORTAL_IP,
      resolverKind: 'internal',
    })
    expect(getScenario('dns-externo').isComplete(fixed)).toBe(true)
  })

  it('IP duplicado: detecta conflito e exige unicidade dos dois hosts', () => {
    const state = createLabState('ip-duplicado')
    expect(findDuplicatesOf(state, '10.30.4.23', 'pc-lab').map((device) => device.id)).toContain(
      'pc-rec',
    )
    expect(assessReach(state, 'pc-lab', PORTAL_IP).code).toBe('duplicate-ip')
    expect(getScenario('ip-duplicado').isComplete(state)).toBe(false)

    const fixed = updatePcConfig(state, 'pc-rec', {
      ...pc(state, 'pc-rec').config,
      ip: '10.30.4.40',
    })
    expect(assessReach(fixed, 'pc-lab', PORTAL_IP).ok).toBe(true)
    expect(assessReach(fixed, 'pc-rec', PORTAL_IP).ok).toBe(true)
    expect(getScenario('ip-duplicado').isComplete(fixed)).toBe(true)
  })

  it('VLAN incorreta: identifica camada 2 e conclui ao devolver a porta à VLAN 30', () => {
    const state = createLabState('vlan-porta')
    expect(assessReach(state, 'pc-lab', LAB_GATEWAY).code).toBe('vlan-mismatch')
    expect(getScenario('vlan-porta').isComplete(state)).toBe(false)
    const fixed = updateSwitchPortVlan(state, 'switch', 'fa01', 30)
    expect(assessReach(fixed, 'pc-lab', LAB_GATEWAY).ok).toBe(true)
    expect(resolveName(fixed, 'pc-lab', PORTAL_NAME).ok).toBe(true)
    expect(getScenario('vlan-porta').isComplete(fixed)).toBe(true)
  })
})

describe('terminal didático', () => {
  it('produz saída determinística e eventos derivados da topologia', () => {
    const state = fixedGatewayState()
    const first = runTerminalCommand(state, 'pc-lab', `ping ${PORTAL_NAME}`)
    const second = runTerminalCommand(state, 'pc-lab', `ping ${PORTAL_NAME}`)
    expect(first.ok).toBe(true)
    expect(first.output).toContain(`Resposta de ${PORTAL_IP}`)
    expect(first.output).toBe(second.output)
    expect(first.events.length).toBeGreaterThan(0)
    expect(first.events.some((event) => event.protocol === 'DNS')).toBe(true)
    expect(first.events.some((event) => event.protocol === 'ICMP')).toBe(true)
  })

  it('explica a falha de ping sem executar comandos do sistema hospedeiro', () => {
    const state = createLabState('gateway-ausente')
    const result = runTerminalCommand(state, 'pc-lab', `ping ${PORTAL_IP}`)
    expect(result.ok).toBe(false)
    expect(result.output).toContain('rede de destino inacessível')
    const unknown = runTerminalCommand(state, 'pc-lab', 'whoami')
    expect(unknown.ok).toBe(false)
    expect(unknown.output).toContain('não reconhecido')
    expect(unknown.events).toHaveLength(0)
  })

  it('responde aos comandos documentados de configuração e diagnóstico', () => {
    const state = fixedGatewayState()
    expect(runTerminalCommand(state, 'pc-lab', 'ipconfig').output).toContain('10.30.4.23')
    expect(runTerminalCommand(state, 'pc-lab', 'ip addr').output).toContain('inet 10.30.4.23/24')
    expect(runTerminalCommand(state, 'pc-lab', 'ip route').output).toContain('0.0.0.0/0')
    expect(runTerminalCommand(state, 'pc-lab', 'arp -a').output).toContain('10.30.4.31')
    expect(runTerminalCommand(state, 'pc-lab', 'netstat -an').output).toContain('LISTENING')
    expect(runTerminalCommand(state, 'pc-lab', 'ss').output).toContain('LISTEN')
    expect(runTerminalCommand(state, 'pc-lab', `nslookup ${PORTAL_NAME}`).output).toContain(
      PORTAL_IP,
    )
    expect(runTerminalCommand(state, 'pc-lab', `dig ${PORTAL_NAME} +short`).output).toBe(
      PORTAL_IP,
    )
    const trace = runTerminalCommand(state, 'pc-lab', `tracert ${PORTAL_IP}`)
    expect(trace.ok).toBe(true)
    expect(trace.output).toContain('Rastreamento concluído')
  })

  it('restaura o comportamento do cenário de VLAN e não aceita host não-PC', () => {
    const state = updateSwitchPortVlan(createLabState('vlan-porta'), 'switch', 'fa01', 30)
    expect(runTerminalCommand(state, 'pc-lab', `ping ${PORTAL_NAME}`).ok).toBe(true)
    const invalid = runTerminalCommand(state, 'switch', 'ipconfig')
    expect(invalid.ok).toBe(false)
    expect(invalid.output).toContain('apenas para estações')
  })

  it('lista o inventário de PCs do cenário', () => {
    const state = createLabState('gateway-ausente')
    expect(getPcs(state).map((device) => device.id).sort()).toEqual(['pc-lab', 'pc-rec'])
  })
})
