import { describe, expect, it } from 'vitest'
import {
  CONTENT_RULES,
  EXPERTISE_LEVELS,
  accessForContent,
  accessForTrack,
  accessValidation,
  effectiveLevel,
  explainBlock,
  hasEvidence,
  nextActivity,
  skillEvidence,
} from './progression'
import {
  createEmptyCaseProgress,
  createEmptyProgress,
  type ExerciseRecord,
  type ProgressState,
} from './progress'

const at = '2026-10-20T10:00:00.000Z'

function complete(state: ProgressState, contentId: string): ProgressState {
  const rule = CONTENT_RULES[contentId]
  if (!rule) throw new Error(`conteúdo desconhecido: ${contentId}`)
  if (rule.type === 'lesson') {
    return {
      ...state,
      lessons: {
        ...state.lessons,
        [contentId]: { competency: 'redes', completedAt: at, score: 100 },
      },
    }
  }
  if (rule.type === 'case') {
    return {
      ...state,
      cases: {
        ...state.cases,
        [contentId]: {
          ...createEmptyCaseProgress(),
          submitted: { score: 100, passed: true, at, breakdown: [] },
        },
      },
    }
  }
  if (rule.completion?.kind === 'prefix') {
    const labs = { ...state.labs }
    for (let index = 1; index <= rule.completion.count; index += 1) {
      labs[`${rule.completion.prefix}${index}`] = {
        competency: 'diagnostico',
        completedAt: at,
        score: 100,
        label: `${rule.title} ${index}`,
      }
    }
    return { ...state, labs }
  }
  return {
    ...state,
    labs: {
      ...state.labs,
      [contentId]: {
        competency: 'diagnostico',
        completedAt: at,
        score: 100,
        label: rule.title,
      },
    },
  }
}

function completeAll(state: ProgressState, contentIds: string[]): ProgressState {
  return contentIds.reduce(complete, state)
}

function exerciseFor(lessonId: string): ExerciseRecord {
  return {
    lessonId,
    competency: 'redes',
    passed: false,
    attempts: 1,
    bestScore: 40,
    hintsUsed: 0,
    lastAt: at,
  }
}

describe('progressão efetiva e recomendações', () => {
  it('recomenda o primeiro passo real de cada nível sem liberar o caso avançado', () => {
    const empty = createEmptyProgress()

    expect(nextActivity('iniciante', empty)).toMatchObject({
      id: 'caminho-do-pacote',
      recommendation: 'proximo',
    })
    expect(nextActivity('curioso', empty)).toMatchObject({
      id: 'ipv4-cidr',
      recommendation: 'proximo',
    })
    expect(nextActivity('intermediario', empty)).toMatchObject({
      id: 'metodo-troubleshooting',
      recommendation: 'proximo',
    })
    expect(nextActivity('avancado', empty)).toMatchObject({
      id: 'log-a-incidente',
      recommendation: 'proximo',
    })

    const advancedCase = accessForContent('portal-fora-do-ar', 'avancado', empty)
    expect(advancedCase.levelAllowed).toBe(true)
    expect(advancedCase.allowed).toBe(false)
    expect(advancedCase.reason).toBe('prerequisito')
    expect(advancedCase.missingContent.map((item) => item.id)).toEqual(
      expect.arrayContaining(['tcp-udp-dns-dhcp', 'log-a-incidente', 'lab-trafego']),
    )
  })

  it('prioriza retomar uma lição já iniciada', () => {
    const started: ProgressState = {
      ...createEmptyProgress(),
      exercises: { 'ex-caminho-1': exerciseFor('caminho-do-pacote') },
    }
    const recommendation = nextActivity('iniciante', started)
    expect(recommendation).toMatchObject({
      id: 'caminho-do-pacote',
      inProgress: true,
      recommendation: 'retomar',
    })
  })

  it('sobe o nível demonstrado por competências e mantém o nível escolhido como piso', () => {
    const empty = createEmptyProgress()
    expect(effectiveLevel('iniciante', empty).id).toBe('iniciante')
    expect(effectiveLevel('avancado', empty).id).toBe('avancado')

    let state = completeAll(empty, ['caminho-do-pacote', 'ipv4-cidr'])
    expect(effectiveLevel('iniciante', state).id).toBe('curioso')
    expect([...skillEvidence(state)]).toEqual(
      expect.arrayContaining(['fundamentos-redes', 'enderecamento']),
    )

    state = completeAll(state, ['arp-gateway-rota', 'tcp-udp-dns-dhcp'])
    expect(effectiveLevel('iniciante', state).id).toBe('intermediario')

    state = completeAll(state, ['log-a-incidente', 'custodia-integridade'])
    expect(effectiveLevel('iniciante', state).id).toBe('avancado')
    expect(effectiveLevel('iniciante', state).rank).toBe(4)
  })

  it('mantém trilhas e pré-requisitos coerentes com o nível efetivo', () => {
    const empty = createEmptyProgress()

    expect(accessForTrack('redes', 'iniciante', empty).allowed).toBe(true)
    expect(accessForTrack('administracao', 'iniciante', empty).allowed).toBe(false)
    expect(accessForTrack('seguranca', 'curioso', empty).allowed).toBe(true)
    expect(accessForTrack('criptografia', 'curioso', empty).allowed).toBe(true)
    expect(accessForTrack('pericia', 'intermediario', empty).allowed).toBe(true)
    expect(accessForTrack('administracao', 'intermediario', empty).allowed).toBe(true)

    const curiousWithoutIpv4 = accessForContent('arp-gateway-rota', 'curioso', empty)
    expect(curiousWithoutIpv4.levelAllowed).toBe(true)
    expect(curiousWithoutIpv4.allowed).toBe(false)
    expect(curiousWithoutIpv4.missingContent.map((item) => item.id)).toEqual(['ipv4-cidr'])
    expect(curiousWithoutIpv4.reason).toBe('prerequisito')

    const beginner = accessForContent('arp-gateway-rota', 'iniciante', empty)
    expect(beginner.reason).toBe('nivel')
    expect(beginner.effectiveLevel.id).toBe('iniciante')
  })

  it('preserva acesso histórico sem transformar histórico em conclusão', () => {
    const historical = complete(createEmptyProgress(), 'portal-fora-do-ar')
    const access = accessForContent('portal-fora-do-ar', 'iniciante', historical)
    expect(access.completed).toBe(true)
    expect(access.historical).toBe(true)
    expect(access.allowed).toBe(false)
    expect(access.accessible).toBe(true)
    expect(access.canStart).toBe(false)
  })

  it('explica bloqueios com requisitos reais, sem respostas ou gabaritos', () => {
    const empty = createEmptyProgress()
    const access = accessForContent('portal-fora-do-ar', 'avancado', empty)
    const recommendation = nextActivity('avancado', empty)
    const reason = explainBlock(access, recommendation)

    expect(reason.title).toBe('Pré-requisitos pendentes')
    expect(reason.requirements).toEqual(
      expect.arrayContaining([
        'Competência: Leitura de logs',
        'Concluir: Análise de tráfego · Consulta externa',
      ]),
    )
    expect(reason.text).toContain('ainda não foram demonstrados')
    expect(reason.next?.label).toMatch(/^Próximo passo:/)
    expect(reason.text.toLowerCase()).not.toContain('resposta correta')
  })

  it('reconhece evidência de progresso sem contar estruturas vazias', () => {
    expect(hasEvidence(createEmptyProgress())).toBe(false)
    expect(
      hasEvidence({
        ...createEmptyProgress(),
        activity: [{ id: 'evt-1', at, type: 'sistema', label: 'início' }],
      }),
    ).toBe(true)
    expect(hasEvidence(complete(createEmptyProgress(), 'caminho-do-pacote'))).toBe(true)
  })
})

describe('barreira de acesso do servidor no frontend compartilhado', () => {
  it('recusa pré-requisito e conteúdo dependente no mesmo envio', () => {
    const previous = createEmptyProgress()
    const next = completeAll(previous, ['ipv4-cidr', 'arp-gateway-rota'])
    const violations = accessValidation(previous, next, 'curioso')

    expect(violations).toHaveLength(1)
    expect(violations[0]).toMatchObject({
      contentId: 'arp-gateway-rota',
      reason: 'prerequisito',
    })
    expect(violations[0].missingContent).toContain('ipv4-cidr')
  })

  it('aceita conteúdo novo quando o pré-requisito já está persistido', () => {
    const previous = complete(createEmptyProgress(), 'ipv4-cidr')
    const next = complete(previous, 'arp-gateway-rota')
    expect(accessValidation(previous, next, 'curioso')).toEqual([])
  })

  it('não libera caso avançado apenas pelo nível selecionado', () => {
    const previous = createEmptyProgress()
    const next = complete(previous, 'portal-fora-do-ar')
    const violations = accessValidation(previous, next, 'avancado')

    expect(violations).toHaveLength(1)
    expect(violations[0].contentId).toBe('portal-fora-do-ar')
    expect(violations[0].reason).toBe('prerequisito')
    expect(violations[0].missingContent).toEqual(
      expect.arrayContaining(['tcp-udp-dns-dhcp', 'log-a-incidente', 'lab-trafego']),
    )
  })

  it('tolera registros históricos e identificadores legados desconhecidos', () => {
    const historical = complete(createEmptyProgress(), 'arp-gateway-rota')
    const updated: ProgressState = {
      ...historical,
      lessons: {
        ...historical.lessons,
        'arp-gateway-rota': { competency: 'redes', completedAt: at, score: 90 },
        'lcao-legada-sem-regra': { competency: 'redes', completedAt: at, score: 100 },
      },
    }
    expect(accessValidation(historical, updated, 'iniciante')).toEqual([])
  })

  it('libera nível e pré-requisitos apenas com a opção administrativa', () => {
    const progress = createEmptyProgress()
    const normal = accessForContent('portal-fora-do-ar', 'iniciante', progress)
    expect(normal.allowed).toBe(false)
    expect(normal.adminBypass).toBe(false)

    const admin = accessForContent('portal-fora-do-ar', 'iniciante', progress, {
      admin: true,
    })
    expect(admin.allowed).toBe(true)
    expect(admin.accessible).toBe(true)
    expect(admin.canStart).toBe(true)
    expect(admin.adminBypass).toBe(true)
    expect(admin.missingContent).toEqual([])
    expect(admin.missingSkills).toEqual([])
    expect(admin.completed).toBe(false)

    expect(accessForTrack('pericia', 'iniciante', progress).allowed).toBe(false)
    expect(accessForTrack('pericia', 'iniciante', progress, { admin: true }).allowed).toBe(true)

    expect(
      accessValidation(
        progress,
        complete(progress, 'portal-fora-do-ar'),
        'iniciante',
        { admin: true },
      ),
    ).toEqual([])
  })

  it('não marca conteúdo como concluído por causa do modo administrativo', () => {
    const progress = complete(createEmptyProgress(), 'caminho-do-pacote')
    const admin = accessForContent('caminho-do-pacote', 'iniciante', progress, { admin: true })
    expect(admin.completed).toBe(true)
    expect(admin.canStart).toBe(false)
    expect(admin.adminBypass).toBe(false)

    const untouched = accessForContent('portal-fora-do-ar', 'iniciante', progress, {
      admin: true,
    })
    expect(untouched.completed).toBe(false)
    expect(untouched.adminBypass).toBe(true)
  })

  it('mantém os rótulos dos níveis estáveis', () => {
    expect(EXPERTISE_LEVELS.map((level) => level.label)).toEqual([
      'Iniciante',
      'Curioso',
      'Intermediário',
      'Avançado',
    ])
  })
})
