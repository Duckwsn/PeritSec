import { DatabaseSync } from 'node:sqlite'
import { createHash, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { effectiveExpertise, progressHasEvidence } from '../shared/progression.mjs'

export const APP_NAME = 'PeritSec'
export const SCHEMA_VERSION = 3
export const MAX_PROGRESS_BYTES = 1_500_000
export const ONBOARDING_STATUSES = new Set(['pending', 'started', 'completed'])
export const EXPERTISE_VALUES = new Set(['iniciante', 'curioso', 'intermediario', 'avancado'])
export const ACCOUNT_ROLES = new Set(['admin', 'member'])

const MIGRATIONS = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS progress (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS backups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name TEXT NOT NULL,
        sha256 TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
    `,
  },
  {
    version: 2,
    sql: `
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL COLLATE NOCASE UNIQUE,
        display_name TEXT NOT NULL,
        expertise TEXT NOT NULL CHECK (expertise IN ('iniciante', 'curioso', 'intermediario', 'avancado')),
        initial_expertise TEXT NOT NULL CHECK (initial_expertise IN ('iniciante', 'curioso', 'intermediario', 'avancado')),
        password_hash TEXT NOT NULL,
        recovery_hash TEXT NOT NULL,
        onboarding_status TEXT NOT NULL DEFAULT 'pending'
          CHECK (onboarding_status IN ('pending', 'started', 'completed')),
        onboarding_started_at TEXT,
        onboarding_completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS sessions_account_idx ON sessions(account_id);
      CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);

      CREATE TABLE IF NOT EXISTS account_progress (
        account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS account_backups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        file_name TEXT NOT NULL,
        sha256 TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS account_backups_account_idx ON account_backups(account_id);

      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `,
  },
  {
    // Papel administrativo. Instalações que já possuem contas promovem a mais
    // antiga, garantindo que sempre exista ao menos um administrador local.
    version: 3,
    sql: `
      ALTER TABLE accounts ADD COLUMN role TEXT NOT NULL DEFAULT 'member'
        CHECK (role IN ('admin', 'member'));

      UPDATE accounts
         SET role = 'admin'
       WHERE id = (
         SELECT id FROM accounts ORDER BY created_at ASC, id ASC LIMIT 1
       )
         AND NOT EXISTS (SELECT 1 FROM accounts WHERE role = 'admin');
    `,
  },
]

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
    onboardingStartedAt: row.onboarding_started_at ?? null,
    onboardingCompletedAt: row.onboarding_completed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapBackup(row) {
  return {
    id: row.id,
    fileName: row.file_name,
    sha256: row.sha256,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  }
}

export function openStore({ dataDir = defaultDataDir() } = {}) {
  mkdirSync(dataDir, { recursive: true })
  const backupDir = join(dataDir, 'backups')
  mkdirSync(backupDir, { recursive: true })
  const dbPath = join(dataDir, 'peritsec.db')
  const db = new DatabaseSync(dbPath)

  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA busy_timeout = 3000;')
  db.exec('PRAGMA foreign_keys = ON;')

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `)

  for (const migration of MIGRATIONS) {
    const row = db.prepare('SELECT version FROM schema_migrations WHERE version = ?').get(migration.version)
    if (row) continue
    db.exec('BEGIN IMMEDIATE;')
    try {
      db.exec(migration.sql)
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(
        migration.version,
        nowIso(),
      )
      db.exec('COMMIT;')
    } catch (error) {
      db.exec('ROLLBACK;')
      throw error
    }
  }

  const schemaRow = db.prepare('SELECT MAX(version) AS version FROM schema_migrations').get()

  function getMeta(key) {
    const row = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(key)
    return row?.value ?? null
  }

  function setMeta(key, value) {
    db.prepare(
      `INSERT INTO app_meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ).run(key, value)
  }

  function readProgress() {
    const row = db.prepare('SELECT payload, updated_at FROM progress WHERE id = 1').get()
    if (!row) return null
    try {
      return { progress: JSON.parse(row.payload), updatedAt: row.updated_at }
    } catch {
      return null
    }
  }

  function writeProgress(candidate) {
    const result = validateProgress(candidate)
    if (!result.ok) {
      const error = new Error(result.error)
      error.code = 'INVALID_PROGRESS'
      throw error
    }
    const updatedAt = nowIso()
    db.prepare(
      `INSERT INTO progress (id, payload, updated_at) VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
    ).run(result.payload, updatedAt)
    return { updatedAt }
  }

  function listBackups() {
    return db
      .prepare('SELECT id, file_name, sha256, size_bytes, created_at FROM backups ORDER BY id DESC')
      .all()
      .map(mapBackup)
  }

  function createBackup(reason = 'manual') {
    const current = readProgress()
    if (!current) {
      const error = new Error('não há progresso para copiar')
      error.code = 'EMPTY_PROGRESS'
      throw error
    }
    const createdAt = nowIso()
    const fileName = `peritsec-progresso-${stamp()}${reason === 'pre-restore' ? '-pre-restauracao' : ''}.json`
    const filePath = join(backupDir, fileName)
    const payload = JSON.stringify(
      {
        app: APP_NAME,
        schemaVersion: SCHEMA_VERSION,
        exportedAt: createdAt,
        reason,
        progress: current.progress,
      },
      null,
      2,
    )
    writeFileSync(filePath, payload, 'utf8')
    const bytes = Buffer.byteLength(payload, 'utf8')
    const hash = sha256(payload)
    const info = db
      .prepare('INSERT INTO backups (file_name, sha256, size_bytes, created_at) VALUES (?, ?, ?, ?)')
      .run(fileName, hash, bytes, createdAt)
    return {
      id: Number(info.lastInsertRowid),
      fileName,
      sha256: hash,
      sizeBytes: bytes,
      createdAt,
      reason,
    }
  }

  function restoreBackup(id) {
    const row = db
      .prepare('SELECT id, file_name, sha256, created_at FROM backups WHERE id = ?')
      .get(id)
    if (!row) {
      const error = new Error('backup não encontrado')
      error.code = 'BACKUP_NOT_FOUND'
      throw error
    }
    const filePath = join(backupDir, row.file_name)
    if (!existsSync(filePath)) {
      const error = new Error('arquivo de backup ausente no disco')
      error.code = 'BACKUP_FILE_MISSING'
      throw error
    }
    const raw = readFileSync(filePath, 'utf8')
    if (sha256(raw) !== row.sha256) {
      const error = new Error('hash do backup não confere; restauração recusada')
      error.code = 'BACKUP_HASH_MISMATCH'
      throw error
    }
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      const error = new Error('backup ilegível')
      error.code = 'BACKUP_INVALID'
      throw error
    }
    if (!parsed || parsed.app !== APP_NAME || !parsed.progress) {
      const error = new Error('backup não pertence a esta aplicação')
      error.code = 'BACKUP_INVALID'
      throw error
    }
    const safety = readProgress()
    let safetyBackup = null
    if (safety) safetyBackup = createBackup('pre-restore')
    const { updatedAt } = writeProgress(parsed.progress)
    return {
      progress: parsed.progress,
      updatedAt,
      restoredFrom: { id: row.id, fileName: row.file_name, createdAt: row.created_at },
      safetyBackup,
    }
  }

  function hasAccounts() {
    return Boolean(db.prepare('SELECT 1 AS present FROM accounts LIMIT 1').get())
  }

  function listAccounts() {
    return db
      .prepare('SELECT * FROM accounts ORDER BY created_at ASC')
      .all()
      .map(mapAccount)
  }

  function getAccount(accountId) {
    return mapAccount(db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId))
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
  function listAccountOverviews() {
    return listAccounts().map((account) => {
      const row = db
        .prepare('SELECT payload, updated_at FROM account_progress WHERE account_id = ?')
        .get(account.id)
      let progress = null
      if (row) {
        try {
          progress = JSON.parse(row.payload)
        } catch {
          progress = null
        }
      }
      const backupRow = db
        .prepare('SELECT COUNT(*) AS count FROM account_backups WHERE account_id = ?')
        .get(account.id)
      return {
        ...account,
        effectiveExpertise: effectiveExpertise(account.expertise, progress ?? {}),
        hasProgress: Boolean(progress && progressHasEvidence(progress)),
        progressUpdatedAt: row?.updated_at ?? null,
        counts: {
          lessons: countRecords(progress?.lessons),
          exercises: countRecords(progress?.exercises),
          labs: countRecords(progress?.labs),
          cases: countRecords(progress?.cases),
          activity: Array.isArray(progress?.activity) ? progress.activity.length : 0,
          backups: Number(backupRow?.count ?? 0),
        },
      }
    })
  }

  function getAccountAuthByUsername(username) {
    const row = db.prepare('SELECT * FROM accounts WHERE username = ? COLLATE NOCASE').get(username)
    if (!row) return null
    return {
      ...mapAccount(row),
      passwordHash: row.password_hash,
      recoveryHash: row.recovery_hash,
    }
  }

  function getAccountAuthById(accountId) {
    const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId)
    if (!row) return null
    return {
      ...mapAccount(row),
      passwordHash: row.password_hash,
      recoveryHash: row.recovery_hash,
    }
  }

  function updateAccount(accountId, changes) {
    const current = getAccount(accountId)
    if (!current) {
      const error = new Error('conta não encontrada')
      error.code = 'ACCOUNT_NOT_FOUND'
      throw error
    }
    const displayName = changes.displayName ?? current.displayName
    const expertise = changes.expertise ?? current.expertise
    db.prepare(
      `UPDATE accounts
       SET display_name = ?, expertise = ?, updated_at = ?
       WHERE id = ?`,
    ).run(displayName, expertise, nowIso(), accountId)
    return getAccount(accountId)
  }

  /**
   * Altera o papel de uma conta. A última administradora não pode ser rebaixada:
   * sem isso, a instalação ficaria sem acesso administrativo.
   */
  function setAccountRole(accountId, role) {
    if (!ACCOUNT_ROLES.has(role)) {
      const error = new Error('papel de conta inválido')
      error.code = 'INVALID_ROLE'
      throw error
    }
    const current = getAccount(accountId)
    if (!current) {
      const error = new Error('conta não encontrada')
      error.code = 'ACCOUNT_NOT_FOUND'
      throw error
    }
    if (current.role === role) return current
    if (current.role === 'admin' && role !== 'admin') {
      const row = db.prepare("SELECT COUNT(*) AS count FROM accounts WHERE role = 'admin'").get()
      if (Number(row?.count ?? 0) <= 1) {
        const error = new Error('a instalação precisa de pelo menos uma conta administradora')
        error.code = 'LAST_ADMIN'
        throw error
      }
    }
    db.prepare('UPDATE accounts SET role = ?, updated_at = ? WHERE id = ?').run(
      role,
      nowIso(),
      accountId,
    )
    return getAccount(accountId)
  }

  function updateAccountSecrets(accountId, { passwordHash, recoveryHash }) {
    if (!passwordHash || !recoveryHash) {
      const error = new Error('credenciais incompletas')
      error.code = 'INVALID_ACCOUNT'
      throw error
    }
    const result = db
      .prepare(
        `UPDATE accounts
         SET password_hash = ?, recovery_hash = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(passwordHash, recoveryHash, nowIso(), accountId)
    if (Number(result.changes) === 0) {
      const error = new Error('conta não encontrada')
      error.code = 'ACCOUNT_NOT_FOUND'
      throw error
    }
    return getAccount(accountId)
  }

  function setRecoveryHash(accountId, recoveryHash) {
    const result = db
      .prepare('UPDATE accounts SET recovery_hash = ?, updated_at = ? WHERE id = ?')
      .run(recoveryHash, nowIso(), accountId)
    if (Number(result.changes) === 0) {
      const error = new Error('conta não encontrada')
      error.code = 'ACCOUNT_NOT_FOUND'
      throw error
    }
  }

  function setOnboardingStatus(accountId, status) {
    if (!ONBOARDING_STATUSES.has(status)) {
      const error = new Error('estado de onboarding inválido')
      error.code = 'INVALID_ONBOARDING'
      throw error
    }
    const current = getAccount(accountId)
    if (!current) {
      const error = new Error('conta não encontrada')
      error.code = 'ACCOUNT_NOT_FOUND'
      throw error
    }
    const timestamp = nowIso()
    const startedAt =
      status !== 'pending' ? current.onboardingStartedAt ?? timestamp : current.onboardingStartedAt
    const completedAt =
      status === 'completed' ? current.onboardingCompletedAt ?? timestamp : current.onboardingCompletedAt
    db.prepare(
      `UPDATE accounts
       SET onboarding_status = ?, onboarding_started_at = ?, onboarding_completed_at = ?, updated_at = ?
       WHERE id = ?`,
    ).run(status, startedAt, completedAt, timestamp, accountId)
    return getAccount(accountId)
  }

  function createSession(accountId, tokenHash, expiresAt) {
    const createdAt = nowIso()
    db.prepare(
      `INSERT INTO sessions (token_hash, account_id, created_at, last_seen_at, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(tokenHash, accountId, createdAt, createdAt, expiresAt)
    return { tokenHash, accountId, createdAt, lastSeenAt: createdAt, expiresAt }
  }

  function findSession(tokenHash) {
    const row = db
      .prepare(
        `SELECT s.token_hash, s.created_at AS session_created_at, s.last_seen_at, s.expires_at, a.*
         FROM sessions s
         JOIN accounts a ON a.id = s.account_id
         WHERE s.token_hash = ?`,
      )
      .get(tokenHash)
    if (!row) return null
    if (Date.parse(row.expires_at) <= Date.now()) {
      deleteSession(tokenHash)
      return null
    }
    return {
      tokenHash: row.token_hash,
      account: mapAccount(row),
      createdAt: row.session_created_at,
      lastSeenAt: row.last_seen_at,
      expiresAt: row.expires_at,
    }
  }

  function touchSession(tokenHash) {
    db.prepare('UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?').run(nowIso(), tokenHash)
  }

  function deleteSession(tokenHash) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash)
  }

  function deleteAccountSessions(accountId) {
    db.prepare('DELETE FROM sessions WHERE account_id = ?').run(accountId)
  }

  function deleteExpiredSessions() {
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(nowIso())
  }

  function readAccountProgress(accountId) {
    const row = db
      .prepare('SELECT payload, updated_at FROM account_progress WHERE account_id = ?')
      .get(accountId)
    if (!row) return null
    try {
      return { progress: JSON.parse(row.payload), updatedAt: row.updated_at }
    } catch {
      return null
    }
  }

  function writeAccountProgress(accountId, candidate) {
    const result = validateProgress(candidate)
    if (!result.ok) {
      const error = new Error(result.error)
      error.code = 'INVALID_PROGRESS'
      throw error
    }
    const updatedAt = nowIso()
    db.prepare(
      `INSERT INTO account_progress (account_id, payload, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(account_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
    ).run(accountId, result.payload, updatedAt)
    return { updatedAt }
  }

  function getAnonymousProgressStatus() {
    const current = readProgress()
    const migratedTo = getMeta('anonymous_progress_migrated_to')
    return {
      hasAnonymousProgress: Boolean(current && !migratedTo),
      migrated: Boolean(migratedTo),
      migratedTo: migratedTo ?? null,
    }
  }

  function claimAnonymousProgressInTransaction(accountId) {
    const migratedTo = getMeta('anonymous_progress_migrated_to')
    if (migratedTo) {
      if (migratedTo === accountId) {
        const current = readAccountProgress(accountId)
        if (current) return { ...current, alreadyMigrated: true }
      }
      const error = new Error('o progresso anterior já foi associado a uma conta')
      error.code = 'ANONYMOUS_ALREADY_MIGRATED'
      throw error
    }
    const legacy = readProgress()
    if (!legacy) {
      const error = new Error('não há progresso anterior para importar')
      error.code = 'EMPTY_PROGRESS'
      throw error
    }
    const valid = validateProgress(legacy.progress)
    if (!valid.ok) {
      const error = new Error(valid.error)
      error.code = 'INVALID_PROGRESS'
      throw error
    }
    if (readAccountProgress(accountId)) {
      const error = new Error('a conta já possui progresso próprio')
      error.code = 'ACCOUNT_PROGRESS_EXISTS'
      throw error
    }
    const updatedAt = nowIso()
    db.prepare(
      'INSERT INTO account_progress (account_id, payload, updated_at) VALUES (?, ?, ?)',
    ).run(accountId, valid.payload, updatedAt)
    setMeta('anonymous_progress_migrated_to', accountId)
    const hasEvidence = progressHasEvidence(legacy.progress)
    const account = getAccount(accountId)
    if (hasEvidence && account && account.onboardingStatus !== 'completed') {
      db.prepare(
        `UPDATE accounts
         SET onboarding_status = 'completed', onboarding_completed_at = COALESCE(onboarding_completed_at, ?), updated_at = ?
         WHERE id = ?`,
      ).run(updatedAt, updatedAt, accountId)
    }
    return { progress: legacy.progress, updatedAt }
  }

  function claimAnonymousProgress(accountId) {
    db.exec('BEGIN IMMEDIATE;')
    try {
      const result = claimAnonymousProgressInTransaction(accountId)
      db.exec('COMMIT;')
      return result
    } catch (error) {
      db.exec('ROLLBACK;')
      throw error
    }
  }

  function registerAccount(input) {
    const {
      displayName,
      username,
      passwordHash,
      recoveryHash,
      expertise,
      initialExpertise = expertise,
      onboardingStatus = 'pending',
      migrateAnonymous = false,
    } = input
    if (!passwordHash || !recoveryHash) {
      const error = new Error('credenciais incompletas')
      error.code = 'INVALID_ACCOUNT'
      throw error
    }
    if (!EXPERTISE_VALUES.has(expertise) || !EXPERTISE_VALUES.has(initialExpertise)) {
      const error = new Error('nível de expertise inválido')
      error.code = 'INVALID_EXPERTISE'
      throw error
    }
    if (migrateAnonymous) {
      const status = getAnonymousProgressStatus()
      if (!status.hasAnonymousProgress) {
        const error = new Error('não há progresso anterior disponível para importar')
        error.code = 'ANONYMOUS_PROGRESS_UNAVAILABLE'
        throw error
      }
    }

    const accountId = randomUUID()
    const timestamp = nowIso()

    db.exec('BEGIN IMMEDIATE;')
    try {
      // Em uma instalação nova, a primeira conta criada administra o aplicativo.
      const role = hasAccounts() ? 'member' : 'admin'
      db.prepare(
        `INSERT INTO accounts (
          id, username, display_name, expertise, initial_expertise, password_hash, recovery_hash,
          role, onboarding_status, onboarding_started_at, onboarding_completed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        accountId,
        username,
        displayName,
        expertise,
        initialExpertise,
        passwordHash,
        recoveryHash,
        role,
        onboardingStatus,
        onboardingStatus === 'pending' ? null : timestamp,
        onboardingStatus === 'completed' ? timestamp : null,
        timestamp,
        timestamp,
      )
      if (migrateAnonymous) claimAnonymousProgressInTransaction(accountId)
      db.exec('COMMIT;')
    } catch (error) {
      db.exec('ROLLBACK;')
      if (String(error?.message ?? '').includes('UNIQUE constraint failed')) {
        const conflict = new Error('nome de usuário já está em uso')
        conflict.code = 'USERNAME_TAKEN'
        throw conflict
      }
      throw error
    }
    return getAccount(accountId)
  }

  function createAccountBackup(accountId, reason = 'manual') {
    const current = readAccountProgress(accountId)
    if (!current) {
      const error = new Error('não há progresso para copiar')
      error.code = 'EMPTY_PROGRESS'
      throw error
    }
    const account = getAccount(accountId)
    if (!account) {
      const error = new Error('conta não encontrada')
      error.code = 'ACCOUNT_NOT_FOUND'
      throw error
    }
    const createdAt = nowIso()
    const suffix = account.username.replace(/[^a-z0-9._-]/gi, '').slice(0, 24) || 'conta'
    const fileName = `peritsec-${suffix}-${stamp()}${reason === 'pre-restore' ? '-pre-restauracao' : ''}.json`
    const filePath = join(backupDir, fileName)
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
    writeFileSync(filePath, payload, 'utf8')
    const bytes = Buffer.byteLength(payload, 'utf8')
    const hash = sha256(payload)
    const info = db
      .prepare(
        `INSERT INTO account_backups (account_id, file_name, sha256, size_bytes, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(accountId, fileName, hash, bytes, createdAt)
    return {
      id: Number(info.lastInsertRowid),
      fileName,
      sha256: hash,
      sizeBytes: bytes,
      createdAt,
      reason,
    }
  }

  function listAccountBackups(accountId) {
    return db
      .prepare(
        `SELECT id, file_name, sha256, size_bytes, created_at
         FROM account_backups WHERE account_id = ? ORDER BY id DESC`,
      )
      .all(accountId)
      .map(mapBackup)
  }

  function restoreAccountBackup(accountId, id) {
    const row = db
      .prepare(
        `SELECT id, file_name, sha256, created_at FROM account_backups
         WHERE id = ? AND account_id = ?`,
      )
      .get(id, accountId)
    if (!row) {
      const error = new Error('backup não encontrado para esta conta')
      error.code = 'BACKUP_NOT_FOUND'
      throw error
    }
    const filePath = join(backupDir, row.file_name)
    if (!existsSync(filePath)) {
      const error = new Error('arquivo de backup ausente no disco')
      error.code = 'BACKUP_FILE_MISSING'
      throw error
    }
    const raw = readFileSync(filePath, 'utf8')
    if (sha256(raw) !== row.sha256) {
      const error = new Error('hash do backup não confere; restauração recusada')
      error.code = 'BACKUP_HASH_MISMATCH'
      throw error
    }
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      const error = new Error('backup ilegível')
      error.code = 'BACKUP_INVALID'
      throw error
    }
    if (!parsed || parsed.app !== APP_NAME || parsed.accountId !== accountId || !parsed.progress) {
      const error = new Error('backup não pertence a esta conta')
      error.code = 'BACKUP_INVALID'
      throw error
    }
    const valid = validateProgress(parsed.progress)
    if (!valid.ok) {
      const error = new Error(valid.error)
      error.code = 'INVALID_PROGRESS'
      throw error
    }
    const safety = readAccountProgress(accountId)
    let safetyBackup = null
    if (safety) safetyBackup = createAccountBackup(accountId, 'pre-restore')
    const { updatedAt } = writeAccountProgress(accountId, parsed.progress)
    return {
      progress: parsed.progress,
      updatedAt,
      restoredFrom: { id: row.id, fileName: row.file_name, createdAt: row.created_at },
      safetyBackup,
    }
  }

  function close() {
    try {
      db.close()
    } catch {
      // Encerramento idempotente.
    }
  }

  return {
    dataDir,
    dbPath,
    backupDir,
    schemaVersion: Number(schemaRow?.version ?? SCHEMA_VERSION),
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
    getAnonymousProgressStatus,
    claimAnonymousProgress,
    createAccountBackup,
    listAccountBackups,
    restoreAccountBackup,
    getMeta,
    setMeta,
    close,
  }
}
