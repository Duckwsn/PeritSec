import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import pg from 'pg'
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
import { createIsolatedTestDatabase } from './test-utils.mjs'

const { Pool } = pg
const PASSWORD = 'SenhaLocal#2026'
const RECOVERY = 'ABCD-EFGH-JKLM'

test('identifica PostgreSQL indisponível sem expor a URL de conexão', async () => {
  const previousAttempts = process.env.PERITSEC_DB_CONNECT_ATTEMPTS
  const dataDir = mkdtempSync(join(tmpdir(), 'peritsec-pg-unavailable-'))
  process.env.PERITSEC_DB_CONNECT_ATTEMPTS = '1'
  try {
    await assert.rejects(
      openStore({
        connectionString: 'postgres://peritsec:test@127.0.0.1:1/peritsec',
        dataDir,
      }),
      (error) => error.code === 'DATABASE_UNAVAILABLE' && !error.message.includes('test'),
    )
  } finally {
    if (previousAttempts === undefined) delete process.env.PERITSEC_DB_CONNECT_ATTEMPTS
    else process.env.PERITSEC_DB_CONNECT_ATTEMPTS = previousAttempts
    rmSync(dataDir, { recursive: true, force: true })
  }
})

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

async function register(store, username, overrides = {}) {
  return store.registerAccount({
    displayName: overrides.displayName ?? `Pessoa ${username}`,
    username,
    passwordHash: hashPassword(overrides.password ?? PASSWORD),
    recoveryHash: hashRecoveryCode(overrides.recoveryCode ?? RECOVERY),
    expertise: overrides.expertise ?? 'iniciante',
    initialExpertise: overrides.initialExpertise ?? overrides.expertise ?? 'iniciante',
    onboardingStatus: overrides.onboardingStatus ?? 'pending',
    migrateAnonymous: overrides.migrateAnonymous ?? false,
    ...(overrides.session ? { session: overrides.session } : {}),
  })
}

async function withStore(run) {
  const database = await createIsolatedTestDatabase()
  const store = await database.openStore()
  try {
    await run({ database, store })
  } finally {
    await store.close()
    await database.cleanup()
  }
}

test('conecta ao PostgreSQL e aplica migrations versionadas com constraints e índices', async () => {
  await withStore(async ({ database, store }) => {
    assert.equal(await store.checkConnection().then(Boolean), true)
    assert.equal(store.schemaVersion, SCHEMA_VERSION)
    assert.equal(store.schemaVersion, 3)

    const pool = new Pool({
      connectionString: database.connectionString,
      options: `-c search_path=${database.schema}`,
    })
    try {
      const migrations = await pool.query(
        'SELECT version, name FROM schema_migrations ORDER BY version',
      )
      assert.deepEqual(
        migrations.rows.map((row) => Number(row.version)),
        [1, 2, 3],
      )
      const tables = await pool.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = $1 AND table_type = 'BASE TABLE'
         ORDER BY table_name`,
        [database.schema],
      )
      assert.deepEqual(
        tables.rows.map((row) => row.table_name),
        [
          'account_backups',
          'account_progress',
          'accounts',
          'app_meta',
          'backups',
          'progress',
          'schema_migrations',
          'sessions',
        ],
      )
      const indexes = await pool.query(
        `SELECT indexname FROM pg_indexes WHERE schemaname = $1`,
        [database.schema],
      )
      assert.ok(indexes.rows.some((row) => row.indexname === 'accounts_username_lower_unique_idx'))
      assert.ok(indexes.rows.some((row) => row.indexname === 'sessions_expires_idx'))
      const constraints = await pool.query(
        `SELECT COUNT(*) AS count FROM pg_constraint c
         JOIN pg_namespace n ON n.oid = c.connamespace
         WHERE n.nspname = $1 AND c.contype = 'f'`,
        [database.schema],
      )
      assert.equal(Number(constraints.rows[0].count), 3)
    } finally {
      await pool.end()
    }
  })
})

test('mantém progresso no PostgreSQL após fechar e reabrir o repositório', async () => {
  const database = await createIsolatedTestDatabase()
  const first = await database.openStore()
  const state = progressFixture()
  await first.writeProgress(state)
  assert.deepEqual((await first.readProgress()).progress, state)
  await first.close()

  const second = await database.openStore()
  try {
    assert.equal(second.schemaVersion, 3)
    assert.deepEqual((await second.readProgress()).progress, state)
    assert.equal(await second.hasAccounts(), false)
  } finally {
    await second.close()
    await database.cleanup()
  }
})

test('rejeita progresso inválido sem gravar estado parcial', async () => {
  await withStore(async ({ store }) => {
    assert.equal(validateProgress({ version: 2 }).ok, false)
    assert.equal(validateProgress({ version: 1, exercises: {} }).ok, false)
    await assert.rejects(store.writeProgress({ version: 1 }), { code: 'INVALID_PROGRESS' })
    assert.equal(await store.readProgress(), null)

    const state = progressFixture()
    await store.writeProgress(state)
    await assert.rejects(
      store.writeProgress({ ...state, activity: 'invalida' }),
      { code: 'INVALID_PROGRESS' },
    )
    assert.deepEqual((await store.readProgress()).progress, state)
  })
})

test('cria conta sem e-mail, aplica username case-insensitive e armazena hashes scrypt', async () => {
  await withStore(async ({ store, database }) => {
    const account = await register(store, 'ana.local', { expertise: 'intermediario' })
    assert.equal(account.username, 'ana.local')
    assert.equal(account.expertise, 'intermediario')
    assert.equal(account.initialExpertise, 'intermediario')
    assert.equal(account.role, 'admin')
    assert.equal(account.onboardingStatus, 'pending')
    assert.equal('passwordHash' in account, false)
    assert.equal('recoveryHash' in account, false)
    assert.equal('email' in account, false)
    assert.equal(ONBOARDING_STATUSES.has(account.onboardingStatus), true)

    await assert.rejects(register(store, 'ANA.LOCAL'), { code: 'USERNAME_TAKEN' })
    assert.equal((await store.listAccounts()).length, 1)

    const secrets = await store.getAccountAuthByUsername('ANA.LOCAL')
    assert.match(secrets.passwordHash, /^scrypt\$16384\$8\$1\$/)
    assert.notEqual(secrets.passwordHash, PASSWORD)
    assert.equal(verifyPassword(PASSWORD, secrets.passwordHash), true)
    assert.equal(verifyPassword('senha-errada', secrets.passwordHash), false)
    assert.equal(verifyRecoveryCode(RECOVERY, secrets.recoveryHash), true)

    const pool = new Pool({
      connectionString: database.connectionString,
      options: `-c search_path=${database.schema}`,
    })
    try {
      const row = (
        await pool.query(
          'SELECT password_hash, recovery_hash FROM accounts WHERE username = $1',
          ['ana.local'],
        )
      ).rows[0]
      assert.equal(row.password_hash, secrets.passwordHash)
      assert.equal(row.recovery_hash, secrets.recoveryHash)
      assert.equal(row.password_hash.includes(PASSWORD), false)
      assert.equal(row.recovery_hash.includes(RECOVERY.replace(/-/g, '')), false)
    } finally {
      await pool.end()
    }
  })
})

test('não promove automaticamente a primeira conta quando NODE_ENV é production', async () => {
  const previousNodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'production'
  try {
    await withStore(async ({ store }) => {
      const account = await register(store, 'production')
      assert.equal(account.role, 'member')
    })
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = previousNodeEnv
  }
})

test('isola progresso, sessões e backups entre contas; restauração é transacional', async () => {
  await withStore(async ({ store }) => {
    const ana = await register(store, 'ana')
    const bruno = await register(store, 'bruno', { expertise: 'avancado' })
    const anaState = progressFixture('progresso da Ana')
    const brunoState = progressFixture('progresso do Bruno')
    await store.writeAccountProgress(ana.id, anaState)
    await store.writeAccountProgress(bruno.id, brunoState)

    assert.deepEqual((await store.readAccountProgress(ana.id)).progress, anaState)
    assert.deepEqual((await store.readAccountProgress(bruno.id)).progress, brunoState)
    assert.equal(await store.readProgress(), null)

    const backup = await store.createAccountBackup(ana.id, 'manual')
    assert.match(backup.fileName, /^peritsec-ana-/)
    assert.equal((await store.listAccountBackups(ana.id)).length, 1)
    assert.equal((await store.listAccountBackups(bruno.id)).length, 0)
    await assert.rejects(store.restoreAccountBackup(bruno.id, backup.id), {
      code: 'BACKUP_NOT_FOUND',
    })

    const token = generateSessionToken()
    const tokenHash = sessionTokenHash(token)
    await store.createSession(ana.id, tokenHash, sessionExpiry(30))
    const found = await store.findSession(tokenHash)
    assert.equal(found.account.id, ana.id)
    assert.equal(found.account.username, 'ana')
    assert.equal(found.tokenHash, tokenHash)

    await store.deleteAccountSessions(bruno.id)
    assert.ok(await store.findSession(tokenHash))
    await store.deleteAccountSessions(ana.id)
    assert.equal(await store.findSession(tokenHash), null)

    await store.writeAccountProgress(ana.id, progressFixture('versão alterada'))
    const restored = await store.restoreAccountBackup(ana.id, backup.id)
    assert.deepEqual(restored.progress, anaState)
    assert.ok(restored.safetyBackup)
    assert.match(restored.safetyBackup.fileName, /pre-restauracao/)
    assert.equal((await store.listAccountBackups(ana.id)).length, 2)
    assert.deepEqual((await store.readAccountProgress(ana.id)).progress, anaState)
    assert.deepEqual((await store.readAccountProgress(bruno.id)).progress, brunoState)
  })
})

test('remove sessões expiradas e recusa acesso a uma conta excluída por FK', async () => {
  await withStore(async ({ store, database }) => {
    const account = await register(store, 'sessao')
    const tokenHash = sessionTokenHash(generateSessionToken())
    await store.createSession(account.id, tokenHash, new Date(Date.now() - 1000).toISOString())
    assert.equal(await store.findSession(tokenHash), null)
    assert.equal(await store.findSession(tokenHash), null)

    const pool = new Pool({
      connectionString: database.connectionString,
      options: `-c search_path=${database.schema}`,
    })
    try {
      await assert.rejects(
        pool.query(
          `INSERT INTO sessions (token_hash, account_id, created_at, last_seen_at, expires_at)
           VALUES ($1, $2, NOW(), NOW(), NOW() + INTERVAL '1 day')`,
          [sessionTokenHash(generateSessionToken()), 'conta-inexistente'],
        ),
        (error) => error.code === '23503',
      )
    } finally {
      await pool.end()
    }
  })
})

test('preserva transições de onboarding e impede rebaixar o último admin', async () => {
  await withStore(async ({ store }) => {
    const ana = await register(store, 'ana')
    const bruno = await register(store, 'bruno')
    assert.equal(ana.role, 'admin')
    assert.equal(bruno.role, 'member')
    await assert.rejects(store.setAccountRole(ana.id, 'member'), { code: 'LAST_ADMIN' })

    const promoted = await store.setAccountRole(bruno.id, 'admin')
    assert.equal(promoted.role, 'admin')
    const demoted = await store.setAccountRole(ana.id, 'member')
    assert.equal(demoted.role, 'member')
    await assert.rejects(store.setAccountRole(bruno.id, 'member'), { code: 'LAST_ADMIN' })
    await assert.rejects(store.setAccountRole(ana.id, 'proprietario'), {
      code: 'INVALID_ROLE',
    })

    const started = await store.setOnboardingStatus(bruno.id, 'started')
    assert.ok(started.onboardingStartedAt)
    assert.equal(started.onboardingCompletedAt, null)
    const completed = await store.setOnboardingStatus(bruno.id, 'completed')
    assert.equal(completed.onboardingStartedAt, started.onboardingStartedAt)
    assert.ok(completed.onboardingCompletedAt)
    await assert.rejects(store.setOnboardingStatus(bruno.id, 'pendente'), {
      code: 'INVALID_ONBOARDING',
    })
  })
})

test('visão administrativa inclui contagens sem hashes ou payload de progresso', async () => {
  await withStore(async ({ store }) => {
    const ana = await register(store, 'ana')
    const bruno = await register(store, 'bruno', { expertise: 'avancado' })
    await store.writeAccountProgress(ana.id, progressFixture('progresso da Ana'))
    await store.createAccountBackup(ana.id, 'manual')

    const overview = await store.listAccountOverviews()
    const anaView = overview.find((account) => account.id === ana.id)
    const brunoView = overview.find((account) => account.id === bruno.id)
    assert.equal(anaView.role, 'admin')
    assert.equal(anaView.counts.lessons, 1)
    assert.equal(anaView.counts.backups, 1)
    assert.equal(anaView.hasProgress, true)
    assert.equal(brunoView.role, 'member')
    assert.equal(brunoView.counts.lessons, 0)
    assert.equal(brunoView.hasProgress, false)

    const serialized = JSON.stringify(overview)
    assert.equal(serialized.includes('passwordHash'), false)
    assert.equal(serialized.includes('recoveryHash'), false)
    assert.equal(serialized.includes('scrypt$'), false)
    assert.equal(serialized.includes('progresso da Ana'), false)
  })
})

test('importa snapshot SQLite uma vez, preserva identificadores e recusa destinos ocupados', async () => {
  await withStore(async ({ store }) => {
    const accountId = randomUUID()
    const passwordHash = hashPassword(PASSWORD)
    const recoveryHash = hashRecoveryCode(RECOVERY)
    const progress = progressFixture('importado')
    const snapshot = {
      accounts: [
        {
          id: accountId,
          username: 'importado',
          display_name: 'Conta Importada',
          expertise: 'iniciante',
          initial_expertise: 'iniciante',
          password_hash: passwordHash,
          recovery_hash: recoveryHash,
          onboarding_status: 'started',
          onboarding_started_at: '2026-10-20T10:00:00.000Z',
          onboarding_completed_at: null,
          created_at: '2026-10-20T10:00:00.000Z',
          updated_at: '2026-10-20T10:00:00.000Z',
          role: 'admin',
        },
      ],
      sessions: [],
      progress: [],
      backups: [],
      account_progress: [
        {
          account_id: accountId,
          payload: progress,
          updated_at: '2026-10-20T10:00:00.000Z',
        },
      ],
      account_backups: [],
      app_meta: [{ key: 'legacy', value: 'preserved' }],
    }
    const fingerprint = createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')
    const imported = await store.importSqliteSnapshot(snapshot, fingerprint)
    assert.equal(imported.alreadyImported, false)
    assert.equal(imported.counts.accounts, 1)
    assert.equal(imported.counts.app_meta, 2)
    assert.equal((await store.getAccount(accountId)).username, 'importado')
    assert.deepEqual((await store.readAccountProgress(accountId)).progress, progress)
    assert.equal(verifyPassword(PASSWORD, (await store.getAccountAuthById(accountId)).passwordHash), true)

    const repeated = await store.importSqliteSnapshot(snapshot, fingerprint)
    assert.equal(repeated.alreadyImported, true)
    await assert.rejects(
      store.importSqliteSnapshot(snapshot, '0'.repeat(64)),
      { code: 'IMPORT_ALREADY_COMPLETED' },
    )
  })
})

test('não importa um snapshot SQLite por cima de dados PostgreSQL existentes', async () => {
  await withStore(async ({ store }) => {
    await register(store, 'existente')
    const snapshot = {
      accounts: [],
      sessions: [],
      progress: [],
      backups: [],
      account_progress: [],
      account_backups: [],
      app_meta: [],
    }
    const fingerprint = createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')
    await assert.rejects(store.importSqliteSnapshot(snapshot, fingerprint), {
      code: 'IMPORT_TARGET_NOT_EMPTY',
    })
    assert.equal((await store.listAccounts()).length, 1)
  })
})

test('migra progresso anônimo uma única vez e recusa sobrescrever histórico próprio', async () => {
  await withStore(async ({ store }) => {
    const legacy = progressFixture('progresso anterior')
    await store.writeProgress(legacy)
    const withOwnProgress = await register(store, 'com-historico')
    await store.writeAccountProgress(withOwnProgress.id, progressFixture('próprio'))
    await assert.rejects(store.claimAnonymousProgress(withOwnProgress.id), {
      code: 'ACCOUNT_PROGRESS_EXISTS',
    })
    assert.deepEqual(await store.getAnonymousProgressStatus(), {
      hasAnonymousProgress: true,
      migrated: false,
      migratedTo: null,
    })

    const ana = await register(store, 'ana', { migrateAnonymous: true })
    assert.equal(ana.onboardingStatus, 'completed')
    assert.ok(ana.onboardingCompletedAt)
    assert.deepEqual((await store.readAccountProgress(ana.id)).progress, legacy)
    assert.deepEqual(await store.getAnonymousProgressStatus(), {
      hasAnonymousProgress: false,
      migrated: true,
      migratedTo: ana.id,
    })

    const repeated = await store.claimAnonymousProgress(ana.id)
    assert.equal(repeated.alreadyMigrated, true)
    const bruno = await register(store, 'bruno')
    await assert.rejects(store.claimAnonymousProgress(bruno.id), {
      code: 'ANONYMOUS_ALREADY_MIGRATED',
    })
    await assert.rejects(register(store, 'carla', { migrateAnonymous: true }), {
      code: 'ANONYMOUS_PROGRESS_UNAVAILABLE',
    })
    assert.equal(await store.readAccountProgress(bruno.id), null)
  })
})
