import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import {
  ONBOARDING_STATUSES,
  SCHEMA_VERSION,
  openStore,
  validateProgress,
} from './db.mjs'
import {
  generateSessionToken,
  hashPassword,
  hashRecoveryCode,
  sessionExpiry,
  sessionTokenHash,
  verifyPassword,
  verifyRecoveryCode,
} from './auth.mjs'

const PASSWORD = 'SenhaLocal#2026'
const RECOVERY = 'ABCD-EFGH-JKLM'

function progressFixture(label = 'estado inicial') {
  return {
    version: 1,
    exercises: {},
    lessons: {
      'caminho-do-pacote': {
        completedAt: '2026-10-20T10:00:00.000Z',
        competency: 'redes',
        score: 100,
        label,
      },
    },
    labs: {},
    cases: {},
    activity: [
      {
        id: `evt-${label}`,
        at: '2026-10-20T10:00:00.000Z',
        type: 'sistema',
        label,
      },
    ],
  }
}

function createTempStore() {
  const dataDir = mkdtempSync(join(tmpdir(), 'peritsec-test-'))
  const store = openStore({ dataDir })
  return {
    dataDir,
    store,
    cleanup() {
      store.close()
      rmSync(dataDir, { recursive: true, force: true })
    },
  }
}

function register(store, username, overrides = {}) {
  return store.registerAccount({
    displayName: overrides.displayName ?? `Pessoa ${username}`,
    username,
    passwordHash: hashPassword(overrides.password ?? PASSWORD),
    recoveryHash: hashRecoveryCode(overrides.recoveryCode ?? RECOVERY),
    expertise: overrides.expertise ?? 'iniciante',
    initialExpertise: overrides.initialExpertise ?? overrides.expertise ?? 'iniciante',
    onboardingStatus: overrides.onboardingStatus ?? 'pending',
    migrateAnonymous: overrides.migrateAnonymous ?? false,
  })
}

test('aplica o esquema v3 e preserva o progresso legado após reabrir o banco', () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'peritsec-persist-'))
  const first = openStore({ dataDir })
  assert.equal(first.schemaVersion, SCHEMA_VERSION)
  assert.equal(first.schemaVersion, 3)
  const state = progressFixture()
  first.writeProgress(state)
  assert.deepEqual(first.readProgress().progress, state)
  assert.equal(first.hasAccounts(), false)
  first.close()

  const second = openStore({ dataDir })
  assert.equal(second.schemaVersion, 3)
  assert.deepEqual(second.readProgress().progress, state)
  assert.equal(second.hasAccounts(), false)
  second.close()
  rmSync(dataDir, { recursive: true, force: true })
})

test('rejeita payload inválido sem gravar estado parcial', () => {
  const { store, cleanup } = createTempStore()
  try {
    assert.equal(validateProgress({ version: 2 }).ok, false)
    assert.equal(validateProgress({ version: 1, exercises: {} }).ok, false)
    assert.throws(() => store.writeProgress({ version: 1 }), /objeto de registros|lista/)
    assert.equal(store.readProgress(), null)

    const state = progressFixture()
    store.writeProgress(state)
    assert.throws(() => store.writeProgress({ ...state, activity: 'invalida' }), /lista/)
    assert.deepEqual(store.readProgress().progress, state)
  } finally {
    cleanup()
  }
})

test('cadastra conta sem expor segredos e mantém hash scrypt verificável', () => {
  const { store, cleanup } = createTempStore()
  try {
    const account = register(store, 'ana.local', { expertise: 'intermediario' })
    assert.equal(account.username, 'ana.local')
    assert.equal(account.expertise, 'intermediario')
    assert.equal(account.initialExpertise, 'intermediario')
    assert.equal(account.role, 'admin')
    assert.equal(account.onboardingStatus, 'pending')
    assert.equal(ONBOARDING_STATUSES.has(account.onboardingStatus), true)
    assert.equal('passwordHash' in account, false)
    assert.equal('recoveryHash' in account, false)

    const listed = store.listAccounts()
    assert.equal(listed.length, 1)
    assert.equal('passwordHash' in listed[0], false)

    const secrets = store.getAccountAuthByUsername('ANA.LOCAL')
    assert.match(secrets.passwordHash, /^scrypt\$16384\$8\$1\$/)
    assert.notEqual(secrets.passwordHash, PASSWORD)
    assert.equal(verifyPassword(PASSWORD, secrets.passwordHash), true)
    assert.equal(verifyPassword('senha-errada', secrets.passwordHash), false)
    assert.equal(verifyRecoveryCode(RECOVERY, secrets.recoveryHash), true)

    const reader = new DatabaseSync(store.dbPath, { readOnly: true })
    const row = reader
      .prepare('SELECT password_hash, recovery_hash FROM accounts WHERE username = ?')
      .get('ana.local')
    reader.close()
    assert.equal(row.password_hash, secrets.passwordHash)
    assert.equal(row.recovery_hash, secrets.recoveryHash)
    assert.equal(row.password_hash.includes(PASSWORD), false)
    assert.equal(row.recovery_hash.includes(RECOVERY.replace(/-/g, '')), false)
  } finally {
    cleanup()
  }
})

test('isola progresso, backups e sessões entre contas', () => {
  const { store, cleanup } = createTempStore()
  try {
    const ana = register(store, 'ana')
    const bruno = register(store, 'bruno', { expertise: 'avancado' })
    const anaState = progressFixture('progresso da Ana')
    const brunoState = progressFixture('progresso do Bruno')
    store.writeAccountProgress(ana.id, anaState)
    store.writeAccountProgress(bruno.id, brunoState)

    assert.deepEqual(store.readAccountProgress(ana.id).progress, anaState)
    assert.deepEqual(store.readAccountProgress(bruno.id).progress, brunoState)
    assert.equal(store.readProgress(), null)

    const backup = store.createAccountBackup(ana.id, 'manual')
    assert.match(backup.fileName, /^peritsec-ana-/)
    assert.equal(store.listAccountBackups(ana.id).length, 1)
    assert.equal(store.listAccountBackups(bruno.id).length, 0)
    assert.throws(
      () => store.restoreAccountBackup(bruno.id, backup.id),
      (error) => error.code === 'BACKUP_NOT_FOUND',
    )

    const token = generateSessionToken()
    const tokenHash = sessionTokenHash(token)
    store.createSession(ana.id, tokenHash, sessionExpiry(30))
    const found = store.findSession(tokenHash)
    assert.equal(found.account.id, ana.id)
    assert.equal(found.account.username, 'ana')
    assert.equal(found.tokenHash, tokenHash)

    store.deleteAccountSessions(bruno.id)
    assert.ok(store.findSession(tokenHash))
    store.deleteAccountSessions(ana.id)
    assert.equal(store.findSession(tokenHash), null)

    store.updateAccount(ana.id, { expertise: 'avancado' })
    assert.equal(store.getAccount(ana.id).expertise, 'avancado')
    assert.deepEqual(store.readAccountProgress(ana.id).progress, anaState)
    assert.equal(store.listAccountBackups(ana.id).length, 1)
  } finally {
    cleanup()
  }
})

test('sessão expirada é removida e não autentica', () => {
  const { store, cleanup } = createTempStore()
  try {
    const account = register(store, 'sessao')
    const token = generateSessionToken()
    const tokenHash = sessionTokenHash(token)
    store.createSession(account.id, tokenHash, new Date(Date.now() - 1000).toISOString())
    assert.equal(store.findSession(tokenHash), null)
    assert.equal(store.findSession(tokenHash), null)
  } finally {
    cleanup()
  }
})

test('transições de onboarding preservam datas e não reabrem estado concluído', () => {
  const { store, cleanup } = createTempStore()
  try {
    const account = register(store, 'onboarding')
    const started = store.setOnboardingStatus(account.id, 'started')
    assert.equal(started.onboardingStatus, 'started')
    assert.ok(started.onboardingStartedAt)
    assert.equal(started.onboardingCompletedAt, null)
    const completed = store.setOnboardingStatus(account.id, 'completed')
    assert.equal(completed.onboardingStatus, 'completed')
    assert.equal(completed.onboardingStartedAt, started.onboardingStartedAt)
    assert.ok(completed.onboardingCompletedAt)
    assert.throws(
      () => store.setOnboardingStatus(account.id, 'pendente'),
      (error) => error.code === 'INVALID_ONBOARDING',
    )
  } finally {
    cleanup()
  }
})

test('papel administrativo protege o último admin da instalação', () => {
  const { store, cleanup } = createTempStore()
  try {
    const ana = register(store, 'ana')
    const bruno = register(store, 'bruno')
    assert.equal(ana.role, 'admin')
    assert.equal(bruno.role, 'member')
    assert.throws(
      () => store.setAccountRole(ana.id, 'member'),
      (error) => error.code === 'LAST_ADMIN',
    )

    const promoted = store.setAccountRole(bruno.id, 'admin')
    assert.equal(promoted.role, 'admin')
    const demoted = store.setAccountRole(ana.id, 'member')
    assert.equal(demoted.role, 'member')
    assert.throws(
      () => store.setAccountRole(bruno.id, 'member'),
      (error) => error.code === 'LAST_ADMIN',
    )
    assert.throws(
      () => store.setAccountRole(ana.id, 'proprietario'),
      (error) => error.code === 'INVALID_ROLE',
    )
  } finally {
    cleanup()
  }
})

test('visão administrativa expõe metadados e contagens, sem segredos', () => {
  const { store, cleanup } = createTempStore()
  try {
    const ana = register(store, 'ana')
    const bruno = register(store, 'bruno', { expertise: 'avancado' })
    store.writeAccountProgress(ana.id, progressFixture('progresso da Ana'))
    store.createAccountBackup(ana.id, 'manual')

    const overview = store.listAccountOverviews()
    const anaView = overview.find((account) => account.id === ana.id)
    const brunoView = overview.find((account) => account.id === bruno.id)

    assert.equal(anaView.role, 'admin')
    assert.equal(anaView.counts.lessons, 1)
    assert.equal(anaView.counts.backups, 1)
    assert.equal(anaView.hasProgress, true)
    assert.equal(typeof anaView.effectiveExpertise.label, 'string')
    assert.equal(brunoView.role, 'member')
    assert.equal(brunoView.counts.lessons, 0)
    assert.equal(brunoView.hasProgress, false)

    const serialized = JSON.stringify(overview)
    assert.equal(serialized.includes('passwordHash'), false)
    assert.equal(serialized.includes('recoveryHash'), false)
    assert.equal(serialized.includes('scrypt$'), false)
  } finally {
    cleanup()
  }
})

test('migra o progresso anônimo uma única vez e de forma idempotente', () => {
  const { store, cleanup } = createTempStore()
  try {
    const legacy = progressFixture('progresso anterior')
    store.writeProgress(legacy)
    assert.deepEqual(store.getAnonymousProgressStatus(), {
      hasAnonymousProgress: true,
      migrated: false,
      migratedTo: null,
    })

    const ana = register(store, 'ana', { migrateAnonymous: true })
    assert.equal(ana.onboardingStatus, 'completed')
    assert.ok(ana.onboardingCompletedAt)
    assert.deepEqual(store.readAccountProgress(ana.id).progress, legacy)
    assert.deepEqual(store.getAnonymousProgressStatus(), {
      hasAnonymousProgress: false,
      migrated: true,
      migratedTo: ana.id,
    })

    const repeated = store.claimAnonymousProgress(ana.id)
    assert.equal(repeated.alreadyMigrated, true)
    assert.deepEqual(repeated.progress, legacy)
    assert.deepEqual(store.readAccountProgress(ana.id).progress, legacy)

    const bruno = register(store, 'bruno')
    assert.throws(
      () => store.claimAnonymousProgress(bruno.id),
      (error) => error.code === 'ANONYMOUS_ALREADY_MIGRATED',
    )
    assert.throws(
      () => register(store, 'carla', { migrateAnonymous: true }),
      (error) => error.code === 'ANONYMOUS_PROGRESS_UNAVAILABLE',
    )
    assert.equal(store.readAccountProgress(bruno.id), null)
    assert.equal(store.listAccounts().length, 2)
  } finally {
    cleanup()
  }
})

test('não importa progresso anônimo sobre conta que já possui histórico', () => {
  const { store, cleanup } = createTempStore()
  try {
    store.writeProgress(progressFixture('anterior'))
    const account = register(store, 'com-historico')
    store.writeAccountProgress(account.id, progressFixture('próprio'))
    assert.throws(
      () => store.claimAnonymousProgress(account.id),
      (error) => error.code === 'ACCOUNT_PROGRESS_EXISTS',
    )
    assert.equal(store.getAnonymousProgressStatus().migrated, false)
    assert.equal(store.readAccountProgress(account.id).progress.activity[0].label, 'próprio')
  } finally {
    cleanup()
  }
})

test('cria backup por conta, restaura com segurança prévia e detecta adulteração', () => {
  const { store, cleanup } = createTempStore()
  try {
    const account = register(store, 'backup')
    const original = progressFixture('versão original')
    store.writeAccountProgress(account.id, original)
    const backup = store.createAccountBackup(account.id, 'manual')
    assert.ok(backup.id > 0)
    assert.equal(backup.sha256.length, 64)
    assert.match(backup.fileName, /^peritsec-backup-/)

    const onDisk = JSON.parse(readFileSync(join(store.backupDir, backup.fileName), 'utf8'))
    assert.equal(onDisk.app, 'PeritSec')
    assert.equal(onDisk.accountId, account.id)
    assert.deepEqual(onDisk.progress, original)

    store.writeAccountProgress(account.id, progressFixture('versão alterada'))
    assert.equal(
      store.readAccountProgress(account.id).progress.activity[0].label,
      'versão alterada',
    )

    const restored = store.restoreAccountBackup(account.id, backup.id)
    assert.deepEqual(restored.progress, original)
    assert.equal(restored.restoredFrom.id, backup.id)
    assert.ok(restored.safetyBackup)
    assert.match(restored.safetyBackup.fileName, /pre-restauracao/)
    assert.equal(store.listAccountBackups(account.id).length, 2)
    assert.deepEqual(store.readAccountProgress(account.id).progress, original)

    const filePath = join(store.backupDir, backup.fileName)
    const tampered = readFileSync(filePath, 'utf8').replace('versão original', 'versão adulterada')
    writeFileSync(filePath, tampered, 'utf8')
    assert.throws(
      () => store.restoreAccountBackup(account.id, backup.id),
      (error) => error.code === 'BACKUP_HASH_MISMATCH',
    )
  } finally {
    cleanup()
  }
})

test('informa ausência de progresso de conta e de backup', () => {
  const { store, cleanup } = createTempStore()
  try {
    const account = register(store, 'vazia')
    assert.throws(
      () => store.createAccountBackup(account.id, 'manual'),
      (error) => error.code === 'EMPTY_PROGRESS',
    )
    assert.throws(
      () => store.restoreAccountBackup(account.id, 999),
      (error) => error.code === 'BACKUP_NOT_FOUND',
    )
    assert.deepEqual(store.listAccountBackups(account.id), [])
    assert.equal(store.getAccount('inexistente'), null)
  } finally {
    cleanup()
  }
})
