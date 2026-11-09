/**
 * Fonte única das regras educacionais do PeritSec.
 *
 * Este módulo é consumido pelo frontend (Vite) e pelo servidor local (Node).
 * Ele não contém JSX, DOM, SQLite ou qualquer dependência de interface.
 *
 * Vocabulário:
 * - nível inicial: escolha feita no cadastro, que orienta o ponto de partida;
 * - nível demonstrado: conquistado por competências registradas no progresso;
 * - nível efetivo: o maior entre inicial e demonstrado. Assim, um iniciante não
 *   fica preso no nível 1 e um avançado não recebe dispensa de pré-requisitos.
 * - pré-requisitos: conteúdos concluídos e competências demonstradas exigidos.
 */

export const EXPERTISE_LEVELS = [
  {
    id: 'iniciante',
    label: 'Iniciante',
    rank: 1,
    description:
      'Para quem está começando do zero ou ainda precisa compreender os conceitos fundamentais de redes e sistemas.',
  },
  {
    id: 'curioso',
    label: 'Curioso',
    rank: 2,
    description:
      'Para quem já possui alguma familiaridade, explora assuntos por interesse e deseja aprender com orientação, experimentação e desafios acessíveis.',
  },
  {
    id: 'intermediario',
    label: 'Intermediário',
    rank: 3,
    description:
      'Para quem já entende os fundamentos e deseja desenvolver capacidade de diagnóstico, análise técnica e resolução de problemas.',
  },
  {
    id: 'avancado',
    label: 'Avançado',
    rank: 4,
    description:
      'Para quem possui conhecimentos sólidos e deseja trabalhar com investigações complexas, correlação de evidências, cenários multidisciplinares e procedimentos técnicos mais exigentes.',
  },
]

export const EXPERTISE_IDS = EXPERTISE_LEVELS.map((level) => level.id)

export const SKILLS = [
  {
    id: 'fundamentos-redes',
    label: 'Fundamentos de redes',
    description: 'Explicar encapsulamento, endereçamento e caminho de um pacote.',
  },
  {
    id: 'enderecamento',
    label: 'Endereçamento IPv4',
    description: 'Interpretar máscaras, CIDR, rede, broadcast e faixa de hosts.',
  },
  {
    id: 'diagnostico-redes',
    label: 'Diagnóstico de conectividade',
    description: 'Formular hipóteses e executar testes em ordem coerente.',
  },
  {
    id: 'protocolos-servicos',
    label: 'Protocolos e serviços',
    description: 'Relacionar TCP, UDP, DNS e DHCP ao comportamento observado.',
  },
  {
    id: 'segmentacao',
    label: 'Segmentação e firewall',
    description: 'Distinguir VLAN, roteamento, filtragem e TLS em um cenário.',
  },
  {
    id: 'metodo-investigativo',
    label: 'Método investigativo',
    description: 'Delimitar problema, registrar intervenções e separar fato de inferência.',
  },
  {
    id: 'analise-logs',
    label: 'Leitura de logs',
    description: 'Identificar eventos relevantes, horários e lacunas de visibilidade.',
  },
  {
    id: 'custodia-integridade',
    label: 'Custódia e integridade',
    description: 'Preservar evidências e reconhecer o que um hash pode e não pode provar.',
  },
  {
    id: 'correlacao-evidencias',
    label: 'Correlação de evidências',
    description: 'Cruzar fontes distintas e normalizar tempo sem confundir correlação com causa.',
  },
  {
    id: 'cripto-aplicada',
    label: 'Criptografia aplicada',
    description: 'Diferenciar codificação, hash e cifra, calculando transformações verificáveis.',
  },
]

export const SKILLS_BY_ID = Object.fromEntries(SKILLS.map((skill) => [skill.id, skill]))

/**
 * Competências que promovem o nível demonstrado. A progressão é cumulativa.
 * O nível inicial nunca é reduzido por esta tabela; ele é um piso.
 */
export const DEMONSTRATED_LEVELS = [
  {
    rank: 2,
    skills: ['fundamentos-redes', 'enderecamento'],
  },
  {
    rank: 3,
    skills: ['protocolos-servicos', 'diagnostico-redes'],
  },
  {
    rank: 4,
    skills: ['analise-logs', 'custodia-integridade', 'correlacao-evidencias'],
  },
]

export const TRACK_RULES = {
  redes: { minLevel: 'iniciante', order: 1 },
  administracao: { minLevel: 'intermediario', order: 2 },
  seguranca: { minLevel: 'curioso', order: 3 },
  pericia: { minLevel: 'intermediario', order: 4 },
  criptografia: { minLevel: 'curioso', order: 5 },
}

const lesson = (id, title, summary, minLevel, requires, requiresSkills, teaches, order, href) => ({
  id,
  type: 'lesson',
  title,
  summary,
  minLevel,
  requires,
  requiresSkills,
  teaches,
  order,
  href,
})

const lab = (id, title, summary, minLevel, requires, requiresSkills, teaches, order, href, completion) => ({
  id,
  type: 'lab',
  title,
  summary,
  minLevel,
  requires,
  requiresSkills,
  teaches,
  order,
  href,
  completion,
})

const caseNode = (id, title, summary, minLevel, requires, requiresSkills, teaches, order, href) => ({
  id,
  type: 'case',
  title,
  summary,
  minLevel,
  requires,
  requiresSkills,
  teaches,
  order,
  href,
})

export const CONTENT_RULES = {
  'caminho-do-pacote': lesson(
    'caminho-do-pacote',
    'O caminho de um pacote',
    'Encapsulamento, endereços e o trajeto básico de uma requisição.',
    'iniciante',
    [],
    [],
    ['fundamentos-redes', 'diagnostico-redes'],
    1,
    '/licoes/caminho-do-pacote',
  ),
  'ipv4-cidr': lesson(
    'ipv4-cidr',
    'IPv4, máscaras e CIDR sem decoreba',
    'Endereçamento, máscara, rede, broadcast e faixa de hosts.',
    'iniciante',
    [],
    [],
    ['enderecamento'],
    2,
    '/licoes/ipv4-cidr',
  ),
  'lab-redes': lab(
    'lab-redes',
    'Simulador de rede · Filial Aurora',
    'Topologia com VLAN, roteamento, DNS e servidor para diagnosticar falhas.',
    'iniciante',
    [],
    [],
    ['diagnostico-redes'],
    3,
    '/laboratorio/redes',
    { kind: 'prefix', prefix: 'lab-redes:', count: 4 },
  ),
  'arp-gateway-rota': lesson(
    'arp-gateway-rota',
    'ARP, gateway e o trajeto até o destino',
    'Como o host encontra o gateway e por onde o pacote segue.',
    'curioso',
    ['ipv4-cidr'],
    [],
    ['diagnostico-redes', 'enderecamento'],
    4,
    '/licoes/arp-gateway-rota',
  ),
  'tcp-udp-dns-dhcp': lesson(
    'tcp-udp-dns-dhcp',
    'TCP, UDP, DNS e DHCP',
    'Serviços, portas, resolução de nomes e concessão de endereços.',
    'curioso',
    ['arp-gateway-rota'],
    [],
    ['protocolos-servicos'],
    5,
    '/licoes/tcp-udp-dns-dhcp',
  ),
  'vlans-firewall-tls': lesson(
    'vlans-firewall-tls',
    'VLANs, firewall e TLS',
    'Segmentação, regras de filtragem e proteção do transporte.',
    'curioso',
    ['tcp-udp-dns-dhcp'],
    [],
    ['segmentacao'],
    6,
    '/licoes/vlans-firewall-tls',
  ),
  'metodo-troubleshooting': lesson(
    'metodo-troubleshooting',
    'Um método para não trocar tudo de uma vez',
    'Hipóteses, testes, intervenção mínima e registro do diagnóstico.',
    'curioso',
    [],
    [],
    ['metodo-investigativo'],
    7,
    '/licoes/metodo-troubleshooting',
  ),
  'codificacao-hash-cifra': lesson(
    'codificacao-hash-cifra',
    'Codificação, hash e cifra não são a mesma coisa',
    'Transformações, integridade e limites de recuperação.',
    'curioso',
    [],
    [],
    ['cripto-aplicada'],
    8,
    '/licoes/codificacao-hash-cifra',
  ),
  'lab-cripto': lab(
    'lab-cripto',
    'Laboratório criptográfico',
    'César, Vigenère, Base64 e SHA-256 com resultados calculados.',
    'curioso',
    [],
    [],
    ['cripto-aplicada'],
    9,
    '/laboratorio/cripto',
  ),
  'log-a-incidente': lesson(
    'log-a-incidente',
    'Do log ao incidente',
    'Eventos, horários, lacunas e o que os registros permitem afirmar.',
    'intermediario',
    [],
    [],
    ['analise-logs', 'correlacao-evidencias'],
    10,
    '/licoes/log-a-incidente',
  ),
  'custodia-integridade': lesson(
    'custodia-integridade',
    'Custódia, integridade e o que um hash prova',
    'Preservação, cadeia de custódia e limites da verificação criptográfica.',
    'intermediario',
    [],
    [],
    ['custodia-integridade', 'correlacao-evidencias'],
    11,
    '/licoes/custodia-integridade',
  ),
  'lab-trafego': lab(
    'lab-trafego',
    'Análise de tráfego · Consulta externa',
    'Filtros e leitura de campos em uma captura sintética de DNS.',
    'curioso',
    ['tcp-udp-dns-dhcp', 'log-a-incidente'],
    [],
    ['analise-logs', 'correlacao-evidencias'],
    12,
    '/laboratorio/trafego',
  ),
  'portal-fora-do-ar': caseNode(
    'portal-fora-do-ar',
    'Portal fora do ar',
    'Caso pericial completo com DHCP, DNS, firewall, servidor e captura.',
    'avancado',
    [
      'tcp-udp-dns-dhcp',
      'log-a-incidente',
      'custodia-integridade',
      'lab-trafego',
      'metodo-troubleshooting',
    ],
    [
      'protocolos-servicos',
      'analise-logs',
      'custodia-integridade',
      'correlacao-evidencias',
      'metodo-investigativo',
    ],
    ['correlacao-evidencias', 'metodo-investigativo'],
    13,
    '/casos/portal-fora-do-ar',
  ),
}

/**
 * Ordem editorial de recomendação por nível inicial. A ordem não concede
 * acesso: cada item ainda passa por nível efetivo e pré-requisitos.
 */
export const RECOMMENDATION_ORDER = {
  iniciante: [
    'caminho-do-pacote',
    'ipv4-cidr',
    'lab-redes',
    'arp-gateway-rota',
    'tcp-udp-dns-dhcp',
    'vlans-firewall-tls',
    'metodo-troubleshooting',
    'codificacao-hash-cifra',
    'lab-cripto',
    'log-a-incidente',
    'custodia-integridade',
    'lab-trafego',
    'portal-fora-do-ar',
  ],
  curioso: [
    'ipv4-cidr',
    'lab-redes',
    'caminho-do-pacote',
    'arp-gateway-rota',
    'tcp-udp-dns-dhcp',
    'vlans-firewall-tls',
    'metodo-troubleshooting',
    'codificacao-hash-cifra',
    'lab-cripto',
    'log-a-incidente',
    'custodia-integridade',
    'lab-trafego',
    'portal-fora-do-ar',
  ],
  intermediario: [
    'metodo-troubleshooting',
    'tcp-udp-dns-dhcp',
    'arp-gateway-rota',
    'ipv4-cidr',
    'caminho-do-pacote',
    'vlans-firewall-tls',
    'lab-redes',
    'codificacao-hash-cifra',
    'lab-cripto',
    'log-a-incidente',
    'custodia-integridade',
    'lab-trafego',
    'portal-fora-do-ar',
  ],
  avancado: [
    'log-a-incidente',
    'custodia-integridade',
    'metodo-troubleshooting',
    'lab-trafego',
    'tcp-udp-dns-dhcp',
    'arp-gateway-rota',
    'ipv4-cidr',
    'caminho-do-pacote',
    'vlans-firewall-tls',
    'codificacao-hash-cifra',
    'lab-redes',
    'lab-cripto',
    'portal-fora-do-ar',
  ],
}

export function getExpertise(id) {
  return EXPERTISE_LEVELS.find((level) => level.id === id) ?? null
}

export function getExpertiseRank(id) {
  return getExpertise(id)?.rank ?? 0
}

function recordObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

export function hasContentRecord(progress, contentId) {
  const rule = CONTENT_RULES[contentId]
  if (!rule) return false
  const state = progress ?? {}
  if (rule.type === 'lesson') return Boolean(recordObject(state.lessons)[contentId])
  if (rule.type === 'case') return Boolean(recordObject(state.cases)[contentId])
  if (rule.type === 'lab') {
    if (rule.completion?.kind === 'prefix') {
      const prefix = rule.completion.prefix
      return Object.keys(recordObject(state.labs)).some((key) => key.startsWith(prefix))
    }
    return Boolean(recordObject(state.labs)[contentId])
  }
  return false
}

export function isContentComplete(progress, contentId) {
  const rule = CONTENT_RULES[contentId]
  if (!rule) return false
  const state = progress ?? {}
  if (rule.type === 'lesson') return Boolean(recordObject(state.lessons)[contentId])
  if (rule.type === 'case') {
    const record = recordObject(state.cases)[contentId]
    return Boolean(record && typeof record === 'object' && record.submitted?.passed)
  }
  if (rule.type === 'lab') {
    const labs = recordObject(state.labs)
    if (rule.completion?.kind === 'prefix') {
      const count = Object.keys(labs).filter((key) => key.startsWith(rule.completion.prefix)).length
      return count >= rule.completion.count
    }
    return Boolean(labs[contentId])
  }
  return false
}

export function isContentInProgress(progress, contentId) {
  if (isContentComplete(progress, contentId)) return false
  const rule = CONTENT_RULES[contentId]
  if (!rule) return false
  const state = progress ?? {}
  if (rule.type === 'lesson') {
    return Object.values(recordObject(state.exercises)).some(
      (record) => record && record.lessonId === contentId,
    )
  }
  if (rule.type === 'case') {
    const record = recordObject(state.cases)[contentId]
    if (!record) return false
    return Boolean(
      (Array.isArray(record.evidenceOpened) && record.evidenceOpened.length > 0) ||
        (Array.isArray(record.actions) && record.actions.length > 0) ||
        record.submitted,
    )
  }
  if (rule.type === 'lab') {
    const labs = recordObject(state.labs)
    if (rule.completion?.kind === 'prefix') {
      return Object.keys(labs).some((key) => key.startsWith(rule.completion.prefix))
    }
    return Boolean(labs[contentId])
  }
  return false
}

export function demonstratedSkills(progress) {
  const skills = new Set()
  const state = progress ?? {}
  for (const [contentId, rule] of Object.entries(CONTENT_RULES)) {
    if (!isContentComplete(state, contentId)) continue
    for (const skill of rule.teaches) skills.add(skill)
  }
  return skills
}

export function demonstratedExpertise(progress) {
  const skills = demonstratedSkills(progress)
  let rank = 1
  for (const milestone of DEMONSTRATED_LEVELS) {
    if (milestone.skills.every((skill) => skills.has(skill))) rank = milestone.rank
  }
  return EXPERTISE_LEVELS.find((level) => level.rank === rank) ?? EXPERTISE_LEVELS[0]
}

export function effectiveExpertise(initialExpertise, progress) {
  const initial = getExpertise(initialExpertise) ?? EXPERTISE_LEVELS[0]
  const demonstrated = demonstratedExpertise(progress)
  return demonstrated.rank > initial.rank ? demonstrated : initial
}

export function missingSkillLabels(skillIds) {
  return skillIds.map((id) => SKILLS_BY_ID[id]?.label ?? id)
}

/**
 * Avalia um conteúdo. Histórico não é apagado por mudança de nível: um item
 * com registro continua acessível para consulta, mesmo que não possa ser
 * iniciado novamente em condições normais.
 */
export function evaluateContentAccess(contentId, expertise, progress, options = {}) {
  const rule = CONTENT_RULES[contentId]
  if (!rule) {
    return {
      id: contentId,
      available: false,
      accessible: false,
      allowed: false,
      canStart: false,
      completed: false,
      inProgress: false,
      historical: false,
      levelAllowed: false,
      effectiveLevel: effectiveExpertise(expertise, progress),
      missingContent: [],
      missingSkills: [],
      adminBypass: false,
      reason: 'conteudo-inexistente',
    }
  }

  const effective = effectiveExpertise(expertise, progress)
  const requiredRank = getExpertiseRank(rule.minLevel)
  const levelAllowedByRule = effective.rank >= requiredRank
  const completed = isContentComplete(progress, contentId)
  const inProgress = isContentInProgress(progress, contentId)
  const historical = options.ignoreHistory ? false : hasContentRecord(progress, contentId)
  const missingContentByRule = rule.requires.filter((id) => !isContentComplete(progress, id))
  const skillSet = demonstratedSkills(progress)
  const missingSkillsByRule = rule.requiresSkills.filter((id) => !skillSet.has(id))
  // O acesso administrativo ignora nível e pré-requisitos, mas não inventa
  // conclusões: o conteúdo continua aparecendo como não concluído.
  const adminBypass =
    Boolean(options.admin) &&
    (!levelAllowedByRule || missingContentByRule.length > 0 || missingSkillsByRule.length > 0)
  const levelAllowed = Boolean(options.admin) || levelAllowedByRule
  const missingContent = options.admin ? [] : missingContentByRule
  const missingSkills = options.admin ? [] : missingSkillsByRule
  const allowed = levelAllowed && missingContent.length === 0 && missingSkills.length === 0

  let reason = 'disponivel'
  if (completed) reason = 'concluido'
  else if (!levelAllowed) reason = 'nivel'
  else if (missingContent.length > 0 || missingSkills.length > 0) reason = 'prerequisito'
  else if (inProgress) reason = 'em-andamento'

  return {
    id: contentId,
    title: rule.title,
    type: rule.type,
    href: rule.href,
    minLevel: rule.minLevel,
    requiredRank,
    effectiveLevel: effective,
    levelAllowed,
    adminBypass,
    completed,
    inProgress,
    historical,
    allowed,
    accessible: allowed || historical,
    canStart: allowed && !completed,
    missingContent: missingContent.map((id) => ({
      id,
      title: CONTENT_RULES[id]?.title ?? id,
      type: CONTENT_RULES[id]?.type ?? 'lesson',
      href: CONTENT_RULES[id]?.href ?? null,
    })),
    missingSkills: missingSkills.map((id) => ({
      id,
      label: SKILLS_BY_ID[id]?.label ?? id,
    })),
    reason,
  }
}

export function getTrackAccess(trackId, expertise, progress, options = {}) {
  const rule = TRACK_RULES[trackId]
  if (!rule) return { trackId, available: false, accessible: false, allowed: false, reason: 'trilha-inexistente' }
  const effective = effectiveExpertise(expertise, progress)
  const requiredRank = getExpertiseRank(rule.minLevel)
  const allowed = Boolean(options.admin) || effective.rank >= requiredRank
  return {
    trackId,
    minLevel: rule.minLevel,
    requiredRank,
    effectiveLevel: effective,
    allowed,
    accessible: allowed,
    reason: allowed ? 'disponivel' : 'nivel',
  }
}

export function recommendNextActivity(expertise, progress, options = {}) {
  const initial = getExpertise(expertise) ?? EXPERTISE_LEVELS[0]
  const order = RECOMMENDATION_ORDER[initial.id] ?? RECOMMENDATION_ORDER.iniciante

  // Retomar uma atividade já iniciada tem prioridade sobre abrir outra.
  for (const contentId of order) {
    const access = evaluateContentAccess(contentId, expertise, progress, options)
    if (access.accessible && access.inProgress && !access.completed) {
      return { ...access, recommendation: 'retomar' }
    }
  }

  for (const contentId of order) {
    const access = evaluateContentAccess(contentId, expertise, progress, options)
    if (access.allowed && !access.completed) {
      return { ...access, recommendation: access.inProgress ? 'retomar' : 'proximo' }
    }
  }

  for (const contentId of order) {
    const access = evaluateContentAccess(contentId, expertise, progress, options)
    if (access.accessible) return { ...access, recommendation: 'revisar' }
  }

  return null
}

export function progressHasEvidence(progress) {
  const state = progress ?? {}
  return (
    Object.keys(recordObject(state.exercises)).length > 0 ||
    Object.keys(recordObject(state.lessons)).length > 0 ||
    Object.keys(recordObject(state.labs)).length > 0 ||
    Object.keys(recordObject(state.cases)).length > 0 ||
    (Array.isArray(state.activity) && state.activity.length > 0)
  )
}

export function contentRuleSummary(contentId) {
  const rule = CONTENT_RULES[contentId]
  if (!rule) return null
  return {
    id: rule.id,
    type: rule.type,
    title: rule.title,
    summary: rule.summary,
    minLevel: rule.minLevel,
    href: rule.href,
    requires: rule.requires.map((id) => ({
      id,
      title: CONTENT_RULES[id]?.title ?? id,
      type: CONTENT_RULES[id]?.type ?? 'lesson',
      href: CONTENT_RULES[id]?.href ?? null,
    })),
    requiresSkills: rule.requiresSkills.map((id) => ({
      id,
      label: SKILLS_BY_ID[id]?.label ?? id,
    })),
  }
}

/**
 * Barreira do servidor: nenhum registro novo de conteúdo pode ser gravado sem
 * nível efetivo e pré-requisitos. Registros históricos continuam atualizáveis.
 * O papel administrativo ignora as barreiras, mas apenas quando o servidor
 * confirma esse papel na sessão.
 */
export function validateProgressAccess(previous, next, expertise, options = {}) {
  if (options.admin) return []
  const previousState = previous ?? {}
  const nextState = next ?? {}
  const violations = []

  const checkNew = (contentId) => {
    if (!CONTENT_RULES[contentId]) return
    if (hasContentRecord(previousState, contentId)) return
    // A elegibilidade é avaliada contra o estado já persistido. Um mesmo envio
    // não pode declarar o pré-requisito e o conteúdo dependente ao mesmo tempo.
    const access = evaluateContentAccess(contentId, expertise, previousState, {
      ignoreHistory: true,
    })
    if (!access.allowed) {
      violations.push({
        contentId,
        reason: access.reason,
        missingContent: access.missingContent.map((item) => item.id),
        missingSkills: access.missingSkills.map((item) => item.id),
      })
    }
  }

  for (const lessonId of Object.keys(recordObject(nextState.lessons))) checkNew(lessonId)
  for (const caseId of Object.keys(recordObject(nextState.cases))) checkNew(caseId)
  for (const labId of Object.keys(recordObject(nextState.labs))) {
    checkNew(labId.startsWith('lab-redes:') ? 'lab-redes' : labId)
  }
  for (const record of Object.values(recordObject(nextState.exercises))) {
    if (record && typeof record.lessonId === 'string') checkNew(record.lessonId)
  }

  return violations
}
