import { createHash, randomUUID } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { effectiveExpertise, progressHasEvidence } from '../shared/progression.mjs'

const { Pool } = pg
const ROOT_DIR = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = join(ROOT_DIR, 'migrations')
const MIGRATION_LOCK = '73120486125201'
const ROLE_LOCK = '73120486125202'
const ANONYMOUS_PROGRESS_LOCK = '73120486125203'
const TRANSIENT_PG_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ETIMEDOUT',
  '57P01',
  '57P02',
  '57P03',
])

export const APP_NAME = 'PeritSec'
export const SCHEMA_VERSION = 3
export const MAX_PROGRESS_BYTES = 1_500_000
export const ONBOARDING_STATUSES = new Set(['pending', 'started', 'completed'])
export const EXPERTISE_VALUES = new Set(['iniciante', 'curioso', 'intermediario', 'avancado'])
export const ACCOUNT_ROLES = new Set(['admin', 'member'])

const IMPORT_META_KEY = 'sqlite_import_sha256'
const IMPORTABLE_TABLES = [
  'accounts',
  'sessions',
  'progress',
  'backups',
  'account_progress',
  'account_backups',
  'app_meta',
]

function domainError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function normalizePgError(error) {
  const message = String(error?.message ?? '').toLowerCase()
  if (
    TRANSIENT_PG_CODES.has(error?.code) ||
    (typeof error?.code === 'string' && error.code.startsWith('08')) ||
    message.includes('connection terminated unexpectedly') ||
    message.includes('server closed the connection unexpectedly') ||
    message.includes('connection timeout')
  ) {
    return domainError('DATABASE_UNAVAILABLE', 'PostgreSQL está indisponível.')
  }
  return error
}

async function query(queryable, text, values) {
  try {
    return await queryable.query(text, values)
  } catch (error) {
    throw normalizePgError(error)
  }
}

function readMigrations() {
  return [
    {
      version: 1,
      name: 'initial_progress_and_backups',
      fileName: '001_initial_progress_and_backups.sql',
    },
    {
      version: 2,
      name: 'accounts_sessions_and_account_data',
      fileName: '002_accounts_sessions_and_account_data.sql',
    },
    {
      version: 3,
      name: 'account_roles',
      fileName: '003_account_roles.sql',
    },
  ].map((migration) => ({
    ...migration,
    sql: readFileSync(join(MIGRATIONS_DIR, migration.fileName), 'utf8'),
  }))
}

function connectAttempts() {
  const parsed = Number(process.env.PERITSEC_DB_CONNECT_ATTEMPTS)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 60 ? parsed : 15
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function waitForPostgres(pool) {
  const attempts = connectAttempts()
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await query(pool, 'SELECT 1')
      return
    } catch (error) {
      lastError = error
      if (error?.code !== 'DATABASE_UNAVAILABLE' || attempt === attempts) break
      await wait(1000)
    }
  }
  if (lastError?.code === 'DATABASE_UNAVAILABLE') {
    const error = domainError(
      'DATABASE_UNAVAILABLE',
      `PostgreSQL não respondeu após ${attempts} tentativas. Inicie o serviço local e tente novamente.`,
    )
    error.cause = lastError
    throw error
  }
  throw lastError
}

async function applyMigrations(pool) {
  const client = await pool.connect()
  try {
    await query(client, 'SELECT pg_advisory_lock($1::bigint)', [MIGRATION_LOCK])
    await query(
      client,
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
    )
    const migrations = readMigrations()
    for (const migration of migrations) {
      const existing = await query(
        client,
        'SELECT version FROM schema_migrations WHERE version = $1',
        [migration.version],
      )
      if (existing.rowCount > 0) continue
      await query(client, 'BEGIN')
      try {
        await query(client, migration.sql)
        await query(
          client,
          'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
          [migration.version, migration.name],
        )
        await query(client, 'COMMIT')
      } catch (error) {
        try {
          await client.query('ROLLBACK')
        } catch {
          // Mantém o erro original da migration.
        }
        throw error
      }
    }
  } finally {
    try {
      await query(client, 'SELECT pg_advisory_unlock($1::bigint)', [MIGRATION_LOCK])
    } finally {
      client.release()
    }
  }
}

export function defaultDataDir() {
  if (process.env.PERITSEC_DATA_DIR) return process.env.PERITSEC_DATA_DIR
  const appData = process.env.APPDATA
  if (appData) return join(appData, 'PeritSec')
  return join(homedir(), '.local', 'share', 'peritsec')
}

function nowIso() {
  return new Date().toISOString()
}

function stamp() {
  return nowIso().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Validação defensiva do payload. O servidor escuta apenas em loopback, mas
 * não deve persistir estruturas arbitrárias nem crescer sem limite.
 */
export function validateProgress(candidate) {
  if (!isPlainObject(candidate)) return { ok: false, error: 'progresso deve ser um objeto' }
  if (candidate.version !== 1) return { ok: false, error: 'versão de progresso não suportada' }
  for (const key of ['exercises', 'lessons', 'labs', 'cases']) {
    if (!isPlainObject(candidate[key])) {
      return { ok: false, error: `${key} deve ser um objeto de registros` }
    }
  }
  if (!Array.isArray(candidate.activity)) {
    return { ok: false, error: 'activity deve ser uma lista' }
  }
  if (candidate.activity.length > 5000) {
    return { ok: false, error: 'activity excede o limite de 5000 entradas' }
  }

  let serialized
  try {
    serialized = JSON.stringify(candidate)
  } catch {
    return { ok: false, error: 'progresso não é serializável' }
  }
  if (Buffer.byteLength(serialized, 'utf8') > MAX_PROGRESS_BYTES) {
    return { ok: false, error: 'progresso excede o limite de 1,5 MB' }
  }
  return { ok: true, payload: serialized }
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

function toIso(value) {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString()
}

function parsePayload(value) {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }
  return value ?? null
}

function mapAccount(row) {
  if (!row) return null
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    expertise: row.expertise,
    initialExpertise: row.initial_expertise,
    role: row.role ?? 'member',
    onboardingStatus: row.onboarding_status,
    onboardingStartedAt: toIso(row.onboarding_started_at),
    onboardingCompletedAt: toIso(row.onboarding_completed_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }
}

function mapBackup(row) {
  return {
    id: Number(row.id),
    fileName: row.file_name,
    sha256: row.sha256,
    sizeBytes: Number(row.size_bytes),
    createdAt: toIso(row.created_at),
  }
}

function throwIfInvalidProgress(candidate) {
  const result = validateProgress(candidate)
  if (!result.ok) throw domainError('INVALID_PROGRESS', result.error)
  return JSON.parse(result.payload)
}

function notFoundAccount() {
  return domainError('ACCOUNT_NOT_FOUND', 'conta não encontrada')
}

async function getCount(queryable, table) {
  const result = await query(queryable, `SELECT COUNT(*) AS count FROM ${table}`)
  return Number(result.rows[0].count)
}

export async function openStore({
  dataDir = defaultDataDir(),
  connectionString = process.env.DATABASE_URL,
  schema = process.env.PERITSEC_DB_SCHEMA,
} = {}) {
  if (!connectionString) {
    throw domainError(
      'DATABASE_URL_REQUIRED',
      'DATABASE_URL não está configurada. Copie .env.example para .env e configure a conexão local.',
    )
  }
  if (schema && !/^[a-z_][a-z0-9_]{0,62}$/.test(schema)) {
    throw new Error('Nome de schema de teste inválido.')
  }

  mkdirSync(join(dataDir, 'backups'), { recursive: true })
  const poolConfig = {
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 1_500,
    ...(schema ? { options: `-c search_path=${schema}` } : {}),
  }

  if (schema) {
    const adminPool = new Pool({
      connectionString,
      max: 1,
      connectionTimeoutMillis: 1_500,
    })
    try {
      await waitForPostgres(adminPool)
      await query(adminPool, `CREATE SCHEMA IF NOT EXISTS "${schema}"`)
    } finally {
      await adminPool.end()
    }
  }

  const pool = new Pool(poolConfig)
  pool.on('error', (error) => {
    const code = error?.code ?? 'UNKNOWN'
    console.error(`[peritsec] conexão ociosa do PostgreSQL indisponível (${code})`)
  })

  try {
    await waitForPostgres(pool)
    await applyMigrations(pool)
  } catch (error) {
    await pool.end()
    throw normalizePgError(error)
  }

  const backupDir = join(dataDir, 'backups')
  let schemaVersion
  try {
    const migrationRow = await query(
      pool,
      'SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations',
    )
    schemaVersion = Number(migrationRow.rows[0].version)
    if (schemaVersion !== SCHEMA_VERSION) {
      throw domainError(
        'SCHEMA_VERSION_MISMATCH',
        `Schema PostgreSQL v${schemaVersion} não corresponde ao v${SCHEMA_VERSION} desta aplicação.`,
      )
    }
  } catch (error) {
    await pool.end()
    throw normalizePgError(error)
  }

  async function withTransaction(work) {
    let client
    try {
      client = await pool.connect()
    } catch (error) {
      throw normalizePgError(error)
    }
    try {
      await query(client, 'BEGIN')
      const result = await work(client)
      await query(client, 'COMMIT')
      return result
    } catch (error) {
      try {
        await client.query('ROLLBACK')
      } catch {
        // Mantém o erro original e devolve a conexão ao pool.
      }
      throw normalizePgError(error)
    } finally {
      client.release()
    }
  }

  async function getMeta(key, queryable = pool) {
    const result = await query(queryable, 'SELECT value FROM app_meta WHERE key = $1', [key])
    return result.rows[0]?.value ?? null
  }

  async function setMeta(key, value, queryable = pool) {
    await query(
      queryable,
      `INSERT INTO app_meta (key, value) VALUES ($1, $2)
       ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value`,
      [key, value],
    )
  }

  async function readProgress(queryable = pool) {
    const result = await query(
      queryable,
      'SELECT payload, updated_at FROM progress WHERE id = 1',
    )
    const row = result.rows[0]
    if (!row) return null
    const progress = parsePayload(row.payload)
    if (!progress) return null
    return { progress, updatedAt: toIso(row.updated_at) }
  }

  async function writeProgress(candidate, queryable = pool) {
    const payload = throwIfInvalidProgress(candidate)
    const updatedAt = nowIso()
    await query(
      queryable,
      `INSERT INTO progress (id, payload, updated_at) VALUES (1, $1::jsonb, $2)
       ON CONFLICT(id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at`,
      [JSON.stringify(payload), updatedAt],
    )
    return { updatedAt }
  }

  async function readAccountProgress(accountId, queryable = pool) {
    const result = await query(
      queryable,
      'SELECT payload, updated_at FROM account_progress WHERE account_id = $1',
      [accountId],
    )
    const row = result.rows[0]
    if (!row) return null
    const progress = parsePayload(row.payload)
    if (!progress) return null
    return { progress, updatedAt: toIso(row.updated_at) }
  }

  async function writeAccountProgress(accountId, candidate, queryable = pool) {
    const payload = throwIfInvalidProgress(candidate)
    const updatedAt = nowIso()
    await query(
      queryable,
      `INSERT INTO account_progress (account_id, payload, updated_at)
       VALUES ($1, $2::jsonb, $3)
       ON CONFLICT(account_id)
       DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at`,
      [accountId, JSON.stringify(payload), updatedAt],
    )
    return { updatedAt }
  }

  async function saveAccountProgress(accountId, candidate, { completeOnboarding = false } = {}) {
    return withTransaction(async (client) => {
      const saved = await writeAccountProgress(accountId, candidate, client)
      if (completeOnboarding && progressHasEvidence(candidate)) {
        await query(
          client,
          `UPDATE accounts
           SET onboarding_status = 'completed',
               onboarding_completed_at = COALESCE(onboarding_completed_at, $1::timestamptz),
               updated_at = $1::timestamptz
           WHERE id = $2 AND onboarding_status <> 'completed'`,
          [saved.updatedAt, accountId],
        )
      }
      return saved
    })
  }

  async function listBackups() {
    const result = await query(
      pool,
      'SELECT id, file_name, sha256, size_bytes, created_at FROM backups ORDER BY id DESC',
    )
    return result.rows.map(mapBackup)
  }

  function prepareBackup({ progress, reason, accountId = null, username = null }) {
    const createdAt = nowIso()
    const safeUsername = String(username ?? accountId ?? '')
      .replace(/[^a-z0-9._-]/gi, '')
      .slice(0, 24)
    const fileName = accountId
      ? `peritsec-${safeUsername || 'conta'}-${stamp()}${reason === 'pre-restore' ? '-pre-restauracao' : ''}.json`
      : `peritsec-progresso-${stamp()}${reason === 'pre-restore' ? '-pre-restauracao' : ''}.json`
    const payload = JSON.stringify(
      {
        app: APP_NAME,
        schemaVersion: SCHEMA_VERSION,
        exportedAt: createdAt,
        reason,
        ...(accountId ? { accountId } : {}),
        progress,
      },
      null,
      2,
    )
    return {
      fileName,
      filePath: join(backupDir, fileName),
      payload,
      sha256: sha256(payload),
      sizeBytes: Buffer.byteLength(payload, 'utf8'),
      createdAt,
      reason,
      accountId,
    }
  }

  function writeBackupFile(backup) {
    writeFileSync(backup.filePath, backup.payload, { encoding: 'utf8', flag: 'wx' })
  }

  function removeBackupFile(backup) {
    if (backup) rmSync(backup.filePath, { force: true })
  }

  async function insertBackup(backup, queryable = pool) {
    const result = backup.accountId
      ? await query(
          queryable,
          `INSERT INTO account_backups (account_id, file_name, sha256, size_bytes, created_at)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [
            backup.accountId,
            backup.fileName,
            backup.sha256,
            backup.sizeBytes,
            backup.createdAt,
          ],
        )
      : await query(
          queryable,
          `INSERT INTO backups (file_name, sha256, size_bytes, created_at)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [backup.fileName, backup.sha256, backup.sizeBytes, backup.createdAt],
        )
    return {
      id: Number(result.rows[0].id),
      fileName: backup.fileName,
      sha256: backup.sha256,
      sizeBytes: backup.sizeBytes,
      createdAt: backup.createdAt,
      reason: backup.reason,
    }
  }

  async function createBackup(reason = 'manual') {
    const current = await readProgress()
    if (!current) throw domainError('EMPTY_PROGRESS', 'não há progresso para copiar')
    const backup = prepareBackup({ progress: current.progress, reason })
    writeBackupFile(backup)
    try {
      return await withTransaction((client) => insertBackup(backup, client))
    } catch (error) {
      removeBackupFile(backup)
      throw error
    }
  }

  async function readAndValidateBackup(row, accountId = null) {
    const filePath = join(backupDir, row.file_name)
    if (!existsSync(filePath)) {
      throw domainError('BACKUP_FILE_MISSING', 'arquivo de backup ausente no diretório de dados')
    }
    const raw = readFileSync(filePath, 'utf8')
    if (sha256(raw) !== row.sha256) {
      throw domainError('BACKUP_HASH_MISMATCH', 'hash do backup não confere')
    }
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw domainError('BACKUP_INVALID', 'backup ilegível')
    }
    if (
      !parsed ||
      parsed.app !== APP_NAME ||
      !parsed.progress ||
      (accountId && parsed.accountId !== accountId)
    ) {
      throw domainError('BACKUP_INVALID', 'backup não pertence à aplicação ou à conta')
    }
    throwIfInvalidProgress(parsed.progress)
    return parsed
  }

  async function restoreBackup(id) {
    const result = await query(
      pool,
      'SELECT id, file_name, sha256, created_at FROM backups WHERE id = $1',
      [id],
    )
    const row = result.rows[0]
    if (!row) throw domainError('BACKUP_NOT_FOUND', 'backup não encontrado')
    const parsed = await readAndValidateBackup(row)
    const safety = await readProgress()
    const safetyBackup = safety
      ? prepareBackup({ progress: safety.progress, reason: 'pre-restore' })
      : null
    if (safetyBackup) writeBackupFile(safetyBackup)
    try {
      return await withTransaction(async (client) => {
        const safetySummary = safetyBackup
          ? await insertBackup(safetyBackup, client)
          : null
        const { updatedAt } = await writeProgress(parsed.progress, client)
        return {
          progress: parsed.progress,
          updatedAt,
          restoredFrom: {
            id: Number(row.id),
            fileName: row.file_name,
            createdAt: toIso(row.created_at),
          },
          safetyBackup: safetySummary,
        }
      })
    } catch (error) {
      removeBackupFile(safetyBackup)
      throw error
    }
  }

  async function hasAccounts(queryable = pool) {
    const result = await query(queryable, 'SELECT EXISTS(SELECT 1 FROM accounts) AS present')
    return result.rows[0].present
  }

  async function listAccounts() {
    const result = await query(pool, 'SELECT * FROM accounts ORDER BY created_at ASC, id ASC')
    return result.rows.map(mapAccount)
  }

  async function getAccount(accountId, queryable = pool) {
    const result = await query(queryable, 'SELECT * FROM accounts WHERE id = $1', [accountId])
    return mapAccount(result.rows[0])
  }

  function countRecords(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? Object.keys(value).length
      : 0
  }

  /**
   * Visão administrativa: metadados e contagens agregadas por conta.
   * O conteúdo do progresso de outras contas não é devolvido nem copiado.
   */
  async function listAccountOverviews() {
    const result = await query(
      pool,
      `SELECT
         a.*,
         ap.payload AS progress_payload,
         ap.updated_at AS progress_updated_at,
         COALESCE(ab.backup_count, 0)::integer AS backup_count
       FROM accounts a
       LEFT JOIN account_progress ap ON ap.account_id = a.id
       LEFT JOIN (
         SELECT account_id, COUNT(*) AS backup_count
         FROM account_backups
         GROUP BY account_id
       ) ab ON ab.account_id = a.id
       ORDER BY a.created_at ASC, a.id ASC`,
    )
    return result.rows.map((row) => {
      const account = mapAccount(row)
      const progress = parsePayload(row.progress_payload)
      return {
        ...account,
        effectiveExpertise: effectiveExpertise(account.expertise, progress ?? {}),
        hasProgress: Boolean(progress && progressHasEvidence(progress)),
        progressUpdatedAt: toIso(row.progress_updated_at),
        counts: {
          lessons: countRecords(progress?.lessons),
          exercises: countRecords(progress?.exercises),
          labs: countRecords(progress?.labs),
          cases: countRecords(progress?.cases),
          activity: Array.isArray(progress?.activity) ? progress.activity.length : 0,
          backups: Number(row.backup_count),
        },
      }
    })
  }

  async function getAccountAuthByUsername(username) {
    const result = await query(
      pool,
      'SELECT * FROM accounts WHERE lower(username) = lower($1)',
      [username],
    )
    const row = result.rows[0]
    if (!row) return null
    return {
      ...mapAccount(row),
      passwordHash: row.password_hash,
      recoveryHash: row.recovery_hash,
    }
  }

  async function getAccountAuthById(accountId) {
    const result = await query(pool, 'SELECT * FROM accounts WHERE id = $1', [accountId])
    const row = result.rows[0]
    if (!row) return null
    return {
      ...mapAccount(row),
      passwordHash: row.password_hash,
      recoveryHash: row.recovery_hash,
    }
  }

  async function updateAccount(accountId, changes) {
    const current = await getAccount(accountId)
    if (!current) throw notFoundAccount()
    const result = await query(
      pool,
      `UPDATE accounts
       SET display_name = $1, expertise = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [
        changes.displayName ?? current.displayName,
        changes.expertise ?? current.expertise,
        accountId,
      ],
    )
    return mapAccount(result.rows[0])
  }

  /**
   * Altera o papel sem permitir rebaixar simultaneamente a última conta admin.
   * O advisory lock serializa alterações de papel entre processos.
   */
  async function setAccountRole(accountId, role) {
    if (!ACCOUNT_ROLES.has(role)) {
      throw domainError('INVALID_ROLE', 'papel de conta inválido')
    }
    return withTransaction(async (client) => {
      await query(client, 'SELECT pg_advisory_xact_lock($1::bigint)', [ROLE_LOCK])
      const selected = await query(
        client,
        'SELECT * FROM accounts WHERE id = $1 FOR UPDATE',
        [accountId],
      )
      const current = mapAccount(selected.rows[0])
      if (!current) throw notFoundAccount()
      if (current.role === role) return current
      if (current.role === 'admin' && role !== 'admin') {
        const count = await query(
          client,
          "SELECT COUNT(*) AS count FROM accounts WHERE role = 'admin'",
        )
        if (Number(count.rows[0].count) <= 1) {
          throw domainError(
            'LAST_ADMIN',
            'a instalação precisa de pelo menos uma conta administradora',
          )
        }
      }
      const updated = await query(
        client,
        'UPDATE accounts SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [role, accountId],
      )
      return mapAccount(updated.rows[0])
    })
  }

  async function updateAccountSecrets(accountId, { passwordHash, recoveryHash }) {
    if (!passwordHash || !recoveryHash) {
      throw domainError('INVALID_ACCOUNT', 'credenciais incompletas')
    }
    return withTransaction(async (client) => {
      const result = await query(
        client,
        `UPDATE accounts
         SET password_hash = $1, recovery_hash = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [passwordHash, recoveryHash, accountId],
      )
      if (result.rowCount === 0) throw notFoundAccount()
      await query(client, 'DELETE FROM sessions WHERE account_id = $1', [accountId])
      return mapAccount(result.rows[0])
    })
  }

  async function setRecoveryHash(accountId, recoveryHash) {
    const result = await query(
      pool,
      'UPDATE accounts SET recovery_hash = $1, updated_at = NOW() WHERE id = $2',
      [recoveryHash, accountId],
    )
    if (result.rowCount === 0) throw notFoundAccount()
  }

  async function setOnboardingStatus(accountId, status) {
    if (!ONBOARDING_STATUSES.has(status)) {
      throw domainError('INVALID_ONBOARDING', 'estado de onboarding inválido')
    }
    const timestamp = nowIso()
    const result = await query(
      pool,
      `UPDATE accounts
       SET onboarding_status = $2,
           onboarding_started_at = CASE
             WHEN $2 <> 'pending' THEN COALESCE(onboarding_started_at, $3::timestamptz)
             ELSE onboarding_started_at
           END,
           onboarding_completed_at = CASE
             WHEN $2 = 'completed' THEN COALESCE(onboarding_completed_at, $3::timestamptz)
             ELSE onboarding_completed_at
           END,
           updated_at = $3::timestamptz
       WHERE id = $1
       RETURNING *`,
      [accountId, status, timestamp],
    )
    if (result.rowCount === 0) throw notFoundAccount()
    return mapAccount(result.rows[0])
  }

  async function createSession(accountId, tokenHash, expiresAt) {
    return withTransaction(async (client) => {
      await query(client, 'DELETE FROM sessions WHERE expires_at <= NOW()')
      const result = await query(
        client,
        `INSERT INTO sessions (token_hash, account_id, created_at, last_seen_at, expires_at)
         VALUES ($1, $2, NOW(), NOW(), $3)
         RETURNING token_hash, account_id, created_at, last_seen_at, expires_at`,
        [tokenHash, accountId, expiresAt],
      )
      const row = result.rows[0]
      return {
        tokenHash: row.token_hash,
        accountId: row.account_id,
        createdAt: toIso(row.created_at),
        lastSeenAt: toIso(row.last_seen_at),
        expiresAt: toIso(row.expires_at),
      }
    })
  }

  async function findSession(tokenHash) {
    return withTransaction(async (client) => {
      const result = await query(
        client,
        `SELECT s.token_hash, s.created_at AS session_created_at, s.last_seen_at, s.expires_at, a.*
         FROM sessions s
         JOIN accounts a ON a.id = s.account_id
         WHERE s.token_hash = $1
         FOR UPDATE OF s`,
        [tokenHash],
      )
      const row = result.rows[0]
      if (!row) return null
      if (new Date(row.expires_at).getTime() <= Date.now()) {
        await query(client, 'DELETE FROM sessions WHERE token_hash = $1', [tokenHash])
        return null
      }
      await query(client, 'UPDATE sessions SET last_seen_at = NOW() WHERE token_hash = $1', [
        tokenHash,
      ])
      return {
        tokenHash: row.token_hash,
        account: mapAccount(row),
        createdAt: toIso(row.session_created_at),
        lastSeenAt: nowIso(),
        expiresAt: toIso(row.expires_at),
      }
    })
  }

  async function touchSession(tokenHash) {
    await query(pool, 'UPDATE sessions SET last_seen_at = NOW() WHERE token_hash = $1', [
      tokenHash,
    ])
  }

  async function deleteSession(tokenHash) {
    await query(pool, 'DELETE FROM sessions WHERE token_hash = $1', [tokenHash])
  }

  async function deleteAccountSessions(accountId) {
    await query(pool, 'DELETE FROM sessions WHERE account_id = $1', [accountId])
  }

  async function deleteExpiredSessions() {
    const result = await query(pool, 'DELETE FROM sessions WHERE expires_at <= NOW()')
    return result.rowCount
  }

  async function getAnonymousProgressStatus(queryable = pool) {
    const [current, migratedTo] = await Promise.all([
      readProgress(queryable),
      getMeta('anonymous_progress_migrated_to', queryable),
    ])
    return {
      hasAnonymousProgress: Boolean(current && !migratedTo),
      migrated: Boolean(migratedTo),
      migratedTo,
    }
  }

  async function claimAnonymousProgressInTransaction(client, accountId) {
    const migratedTo = await getMeta('anonymous_progress_migrated_to', client)
    if (migratedTo) {
      if (migratedTo === accountId) {
        const current = await readAccountProgress(accountId, client)
        if (current) return { ...current, alreadyMigrated: true }
      }
      throw domainError(
        'ANONYMOUS_ALREADY_MIGRATED',
        'o progresso anterior já foi associado a uma conta',
      )
    }
    const legacy = await readProgress(client)
    if (!legacy) {
      throw domainError('EMPTY_PROGRESS', 'não há progresso anterior para importar')
    }
    const payload = throwIfInvalidProgress(legacy.progress)
    if (await readAccountProgress(accountId, client)) {
      throw domainError('ACCOUNT_PROGRESS_EXISTS', 'a conta já possui progresso próprio')
    }
    const updatedAt = nowIso()
    await query(
      client,
      `INSERT INTO account_progress (account_id, payload, updated_at)
       VALUES ($1, $2::jsonb, $3)`,
      [accountId, JSON.stringify(payload), updatedAt],
    )
    await setMeta('anonymous_progress_migrated_to', accountId, client)
    const account = await getAccount(accountId, client)
    if (
      progressHasEvidence(legacy.progress) &&
      account &&
      account.onboardingStatus !== 'completed'
    ) {
      await query(
        client,
        `UPDATE accounts
         SET onboarding_status = 'completed',
             onboarding_completed_at = COALESCE(onboarding_completed_at, $1::timestamptz),
             updated_at = $1::timestamptz
         WHERE id = $2`,
        [updatedAt, accountId],
      )
    }
    return { progress: legacy.progress, updatedAt }
  }

  async function claimAnonymousProgress(accountId) {
    return withTransaction(async (client) => {
      await query(client, 'SELECT pg_advisory_xact_lock($1::bigint)', [
        ANONYMOUS_PROGRESS_LOCK,
      ])
      return claimAnonymousProgressInTransaction(client, accountId)
    })
  }

  async function registerAccount(input) {
    const {
      displayName,
      username,
      passwordHash,
      recoveryHash,
      expertise,
      initialExpertise = expertise,
      onboardingStatus = 'pending',
      migrateAnonymous = false,
      session = null,
    } = input
    if (!passwordHash || !recoveryHash) {
      throw domainError('INVALID_ACCOUNT', 'credenciais incompletas')
    }
    if (!EXPERTISE_VALUES.has(expertise) || !EXPERTISE_VALUES.has(initialExpertise)) {
      throw domainError('INVALID_EXPERTISE', 'nível de expertise inválido')
    }
    if (!ONBOARDING_STATUSES.has(onboardingStatus)) {
      throw domainError('INVALID_ONBOARDING', 'estado de onboarding inválido')
    }
    if (
      session &&
      (typeof session.tokenHash !== 'string' || typeof session.expiresAt !== 'string')
    ) {
      throw domainError('INVALID_ACCOUNT', 'sessão inicial inválida')
    }

    const accountId = randomUUID()
    const timestamp = nowIso()
    try {
      return await withTransaction(async (client) => {
        await query(client, 'SELECT pg_advisory_xact_lock($1::bigint)', [ROLE_LOCK])
        if (migrateAnonymous) {
          await query(client, 'SELECT pg_advisory_xact_lock($1::bigint)', [
            ANONYMOUS_PROGRESS_LOCK,
          ])
          const status = await getAnonymousProgressStatus(client)
          if (!status.hasAnonymousProgress) {
            throw domainError(
              'ANONYMOUS_PROGRESS_UNAVAILABLE',
              'não há progresso anterior disponível para importar',
            )
          }
        }
        const existingAccounts = await hasAccounts(client)
        const localInstall =
          process.env.NODE_ENV !== 'production' && process.env.RENDER !== 'true'
        const role = existingAccounts || !localInstall ? 'member' : 'admin'
        const result = await query(
          client,
          `INSERT INTO accounts (
             id, username, display_name, expertise, initial_expertise, password_hash, recovery_hash,
             role, onboarding_status, onboarding_started_at, onboarding_completed_at, created_at, updated_at
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9,
             CASE WHEN $9 = 'pending' THEN NULL ELSE $10::timestamptz END,
             CASE WHEN $9 = 'completed' THEN $10::timestamptz ELSE NULL END,
             $10::timestamptz, $10::timestamptz
           )
           RETURNING *`,
          [
            accountId,
            username,
            displayName,
            expertise,
            initialExpertise,
            passwordHash,
            recoveryHash,
            role,
            onboardingStatus,
            timestamp,
          ],
        )
        if (session) {
          await query(
            client,
            `INSERT INTO sessions (token_hash, account_id, created_at, last_seen_at, expires_at)
             VALUES ($1, $2, $3::timestamptz, $3::timestamptz, $4::timestamptz)`,
            [session.tokenHash, accountId, timestamp, session.expiresAt],
          )
        }
        if (migrateAnonymous) {
          await claimAnonymousProgressInTransaction(client, accountId)
        }
        return migrateAnonymous
          ? getAccount(accountId, client)
          : mapAccount(result.rows[0])
      })
    } catch (error) {
      if (
        error?.code === '23505' &&
        error?.constraint === 'accounts_username_lower_unique_idx'
      ) {
        throw domainError('USERNAME_TAKEN', 'nome de usuário já está em uso')
      }
      throw error
    }
  }

  async function createAccountBackup(accountId, reason = 'manual') {
    const current = await readAccountProgress(accountId)
    if (!current) throw domainError('EMPTY_PROGRESS', 'não há progresso para copiar')
    const account = await getAccount(accountId)
    if (!account) throw notFoundAccount()
    const safeUsername = account.username.replace(/[^a-z0-9._-]/gi, '').slice(0, 24) || 'conta'
    const createdAt = nowIso()
    const fileName = `peritsec-${safeUsername}-${stamp()}${
      reason === 'pre-restore' ? '-pre-restauracao' : ''
    }.json`
    const payload = JSON.stringify(
      {
        app: APP_NAME,
        schemaVersion: SCHEMA_VERSION,
        exportedAt: createdAt,
        reason,
        accountId,
        progress: current.progress,
      },
      null,
      2,
    )
    const backup = {
      fileName,
      filePath: join(backupDir, fileName),
      payload,
      sha256: sha256(payload),
      sizeBytes: Buffer.byteLength(payload, 'utf8'),
      createdAt,
      reason,
      accountId,
    }
    writeBackupFile(backup)
    try {
      return await withTransaction((client) => insertBackup(backup, client))
    } catch (error) {
      removeBackupFile(backup)
      throw error
    }
  }

  async function listAccountBackups(accountId) {
    const result = await query(
      pool,
      `SELECT id, file_name, sha256, size_bytes, created_at
       FROM account_backups WHERE account_id = $1 ORDER BY id DESC`,
      [accountId],
    )
    return result.rows.map(mapBackup)
  }

  async function restoreAccountBackup(accountId, id) {
    const result = await query(
      pool,
      `SELECT id, file_name, sha256, created_at FROM account_backups
       WHERE id = $1 AND account_id = $2`,
      [id, accountId],
    )
    const row = result.rows[0]
    if (!row) {
      throw domainError('BACKUP_NOT_FOUND', 'backup não encontrado para esta conta')
    }
    const parsed = await readAndValidateBackup(row, accountId)
    const safety = await readAccountProgress(accountId)
    const account = await getAccount(accountId)
    if (!account) throw notFoundAccount()
    const safetyBackup = safety
      ? prepareBackup({
          progress: safety.progress,
          reason: 'pre-restore',
          accountId,
          username: account.username,
        })
      : null
    if (safetyBackup) writeBackupFile(safetyBackup)
    try {
      return await withTransaction(async (client) => {
        const safetySummary = safetyBackup
          ? await insertBackup(safetyBackup, client)
          : null
        const { updatedAt } = await writeAccountProgress(accountId, parsed.progress, client)
        return {
          progress: parsed.progress,
          updatedAt,
          restoredFrom: {
            id: Number(row.id),
            fileName: row.file_name,
            createdAt: toIso(row.created_at),
          },
          safetyBackup: safetySummary,
        }
      })
    } catch (error) {
      removeBackupFile(safetyBackup)
      throw error
    }
  }

  async function checkConnection() {
    const result = await query(pool, 'SELECT current_setting($1) AS server_version', [
      'server_version',
    ])
    return result.rows[0].server_version
  }

  async function importSqliteSnapshot(snapshot, fingerprint) {
    if (!snapshot || typeof fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(fingerprint)) {
      throw domainError('INVALID_IMPORT', 'snapshot ou fingerprint SQLite inválido')
    }
    for (const table of IMPORTABLE_TABLES) {
      if (!Array.isArray(snapshot[table])) {
        throw domainError('INVALID_IMPORT', `snapshot sem dados válidos para ${table}`)
      }
    }
    return withTransaction(async (client) => {
      await query(client, 'SELECT pg_advisory_xact_lock($1::bigint)', [
        ANONYMOUS_PROGRESS_LOCK,
      ])
      const priorFingerprint = await getMeta(IMPORT_META_KEY, client)
      if (priorFingerprint) {
        if (priorFingerprint !== fingerprint) {
          throw domainError(
            'IMPORT_ALREADY_COMPLETED',
            'já existe uma importação SQLite diferente nesta base PostgreSQL',
          )
        }
        const counts = {}
        for (const table of IMPORTABLE_TABLES) counts[table] = await getCount(client, table)
        return { alreadyImported: true, counts }
      }
      for (const table of IMPORTABLE_TABLES) {
        if ((await getCount(client, table)) !== 0) {
          throw domainError(
            'IMPORT_TARGET_NOT_EMPTY',
            'a importação exige uma base PostgreSQL sem dados de aplicação',
          )
        }
      }

      for (const row of snapshot.accounts) {
        await query(
          client,
          `INSERT INTO accounts (
             id, username, display_name, expertise, initial_expertise, password_hash, recovery_hash,
             onboarding_status, onboarding_started_at, onboarding_completed_at, created_at, updated_at, role
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            row.id,
            row.username,
            row.display_name,
            row.expertise,
            row.initial_expertise,
            row.password_hash,
            row.recovery_hash,
            row.onboarding_status,
            row.onboarding_started_at,
            row.onboarding_completed_at,
            row.created_at,
            row.updated_at,
            row.role,
          ],
        )
      }
      for (const row of snapshot.sessions) {
        await query(
          client,
          `INSERT INTO sessions (token_hash, account_id, created_at, last_seen_at, expires_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [row.token_hash, row.account_id, row.created_at, row.last_seen_at, row.expires_at],
        )
      }
      for (const row of snapshot.progress) {
        await query(
          client,
          'INSERT INTO progress (id, payload, updated_at) VALUES ($1, $2::jsonb, $3)',
          [row.id, JSON.stringify(row.payload), row.updated_at],
        )
      }
      for (const row of snapshot.backups) {
        await query(
          client,
          `INSERT INTO backups (id, file_name, sha256, size_bytes, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [row.id, row.file_name, row.sha256, row.size_bytes, row.created_at],
        )
      }
      for (const row of snapshot.account_progress) {
        await query(
          client,
          `INSERT INTO account_progress (account_id, payload, updated_at)
           VALUES ($1, $2::jsonb, $3)`,
          [row.account_id, JSON.stringify(row.payload), row.updated_at],
        )
      }
      for (const row of snapshot.account_backups) {
        await query(
          client,
          `INSERT INTO account_backups (id, account_id, file_name, sha256, size_bytes, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [row.id, row.account_id, row.file_name, row.sha256, row.size_bytes, row.created_at],
        )
      }
      for (const row of snapshot.app_meta) {
        await query(
          client,
          'INSERT INTO app_meta (key, value) VALUES ($1, $2)',
          [row.key, row.value],
        )
      }

      await query(
        client,
        `SELECT setval(
           pg_get_serial_sequence('backups', 'id'),
           GREATEST(COALESCE(MAX(id), 1), 1),
           COUNT(*) > 0
         ) FROM backups`,
      )
      await query(
        client,
        `SELECT setval(
           pg_get_serial_sequence('account_backups', 'id'),
           GREATEST(COALESCE(MAX(id), 1), 1),
           COUNT(*) > 0
         ) FROM account_backups`,
      )
      await setMeta(IMPORT_META_KEY, fingerprint, client)

      const counts = {}
      for (const table of IMPORTABLE_TABLES) {
        counts[table] = await getCount(client, table)
        if (counts[table] !== snapshot[table].length + (table === 'app_meta' ? 1 : 0)) {
          throw domainError('IMPORT_INTEGRITY_FAILED', `contagem divergente após importar ${table}`)
        }
      }
      return { alreadyImported: false, counts }
    })
  }

  async function close() {
    await pool.end()
  }

  return {
    dataDir,
    backupDir,
    schemaVersion,
    readProgress,
    writeProgress,
    listBackups,
    createBackup,
    restoreBackup,
    hasAccounts,
    listAccounts,
    listAccountOverviews,
    getAccount,
    getAccountAuthByUsername,
    getAccountAuthById,
    registerAccount,
    updateAccount,
    setAccountRole,
    updateAccountSecrets,
    setRecoveryHash,
    setOnboardingStatus,
    createSession,
    findSession,
    touchSession,
    deleteSession,
    deleteAccountSessions,
    deleteExpiredSessions,
    readAccountProgress,
    writeAccountProgress,
    saveAccountProgress,
    getAnonymousProgressStatus,
    claimAnonymousProgress,
    createAccountBackup,
    listAccountBackups,
    restoreAccountBackup,
    getMeta,
    setMeta,
    checkConnection,
    importSqliteSnapshot,
    close,
  }
}
