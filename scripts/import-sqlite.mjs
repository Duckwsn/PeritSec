import { createHash } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import {
  copyFileSync,
  existsSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { APP_NAME, openStore, validateProgress } from '../server/db.mjs'

function argument(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : null
}

function fail(code, message) {
  const error = new Error(message)
  error.code = code
  throw error
}

function parsePayload(value, label) {
  let payload
  try {
    payload = JSON.parse(value)
  } catch {
    fail('INVALID_IMPORT', `O payload de ${label} não é um JSON válido.`)
  }
  const validation = validateProgress(payload)
  if (!validation.ok) {
    fail('INVALID_IMPORT', `O progresso de ${label} é inválido: ${validation.error}.`)
  }
  return payload
}

function checksum(value) {
  return createHash('sha256').update(value).digest('hex')
}

function checkReferences(snapshot) {
  const accountIds = new Set(snapshot.accounts.map((row) => row.id))
  const usernames = new Set()
  for (const row of snapshot.accounts) {
    const normalized = String(row.username).toLowerCase()
    if (usernames.has(normalized)) {
      fail('INVALID_IMPORT', 'Foram encontrados usernames duplicados sem diferenciar maiúsculas.')
    }
    usernames.add(normalized)
    if (
      typeof row.password_hash !== 'string' ||
      !row.password_hash.startsWith('scrypt$') ||
      typeof row.recovery_hash !== 'string' ||
      !row.recovery_hash.startsWith('scrypt$')
    ) {
      fail('INVALID_IMPORT', 'Uma conta não contém os hashes scrypt esperados.')
    }
  }
  for (const row of snapshot.sessions) {
    if (!accountIds.has(row.account_id) || !/^[a-f0-9]{64}$/.test(row.token_hash)) {
      fail('INVALID_IMPORT', 'Foi encontrada uma sessão sem conta ou com hash inválido.')
    }
  }
  for (const row of snapshot.account_progress) {
    if (!accountIds.has(row.account_id)) {
      fail('INVALID_IMPORT', 'Foi encontrado progresso sem conta correspondente.')
    }
  }
  for (const row of snapshot.account_backups) {
    if (!accountIds.has(row.account_id)) {
      fail('INVALID_IMPORT', 'Foi encontrado backup sem conta correspondente.')
    }
  }
  if (snapshot.app_meta.some((row) => row.key === 'sqlite_import_sha256')) {
    fail('INVALID_IMPORT', 'A base SQLite já contém uma chave reservada para migração.')
  }
}

function extractSnapshot(sqlite) {
  const migrations = sqlite.prepare('SELECT MAX(version) AS version FROM schema_migrations').get()
  if (Number(migrations?.version ?? 0) !== 3) {
    fail('UNSUPPORTED_SQLITE_SCHEMA', 'A importação exige o schema SQLite PeritSec v3.')
  }

  const snapshot = {
    accounts: sqlite
      .prepare(
        `SELECT id, username, display_name, expertise, initial_expertise, password_hash,
                recovery_hash, onboarding_status, onboarding_started_at, onboarding_completed_at,
                created_at, updated_at, role
         FROM accounts ORDER BY created_at, id`,
      )
      .all(),
    sessions: sqlite
      .prepare(
        `SELECT token_hash, account_id, created_at, last_seen_at, expires_at
         FROM sessions ORDER BY token_hash`,
      )
      .all(),
    progress: sqlite
      .prepare('SELECT id, payload, updated_at FROM progress ORDER BY id')
      .all()
      .map((row) => ({ ...row, payload: parsePayload(row.payload, 'progresso anônimo') })),
    backups: sqlite
      .prepare('SELECT id, file_name, sha256, size_bytes, created_at FROM backups ORDER BY id')
      .all(),
    account_progress: sqlite
      .prepare(
        `SELECT account_id, payload, updated_at FROM account_progress ORDER BY account_id`,
      )
      .all()
      .map((row) => ({
        ...row,
        payload: parsePayload(row.payload, `progresso da conta ${row.account_id}`),
      })),
    account_backups: sqlite
      .prepare(
        `SELECT id, account_id, file_name, sha256, size_bytes, created_at
         FROM account_backups ORDER BY id`,
      )
      .all(),
    app_meta: sqlite.prepare('SELECT key, value FROM app_meta ORDER BY key').all(),
  }
  checkReferences(snapshot)
  return snapshot
}

function verifyBackupFiles(snapshot, sourceBackupDir) {
  const referenced = [
    ...snapshot.backups.map((row) => ({ ...row, accountId: null })),
    ...snapshot.account_backups.map((row) => ({ ...row, accountId: row.account_id })),
  ]
  const files = new Map()
  for (const backup of referenced) {
    if (
      typeof backup.file_name !== 'string' ||
      basename(backup.file_name) !== backup.file_name ||
      backup.file_name.includes('..')
    ) {
      fail('INVALID_IMPORT', 'Foi encontrado um nome de arquivo de backup inválido.')
    }
    const sourcePath = join(sourceBackupDir, backup.file_name)
    if (!existsSync(sourcePath)) {
      fail('BACKUP_FILE_MISSING', 'Há um registro de backup cujo arquivo não existe.')
    }
    const raw = readFileSync(sourcePath)
    if (
      checksum(raw) !== backup.sha256 ||
      Number(backup.size_bytes) !== raw.byteLength
    ) {
      fail('BACKUP_HASH_MISMATCH', 'Um arquivo de backup não confere com seu registro SQLite.')
    }
    let parsed
    try {
      parsed = JSON.parse(raw.toString('utf8'))
    } catch {
      fail('BACKUP_INVALID', 'Um arquivo de backup não contém JSON válido.')
    }
    if (
      parsed?.app !== APP_NAME ||
      !parsed.progress ||
      (backup.accountId && parsed.accountId !== backup.accountId) ||
      !validateProgress(parsed.progress).ok
    ) {
      fail('BACKUP_INVALID', 'Um backup não corresponde à conta ou ao formato esperado.')
    }
    files.set(backup.file_name, { sourcePath, checksum: backup.sha256 })
  }
  return [...files.entries()].map(([fileName, file]) => ({ fileName, ...file }))
}

function copyBackupFiles(files, destinationDir, sourceDir, copied) {
  for (const file of files) {
    const destinationPath = join(destinationDir, file.fileName)
    if (resolve(file.sourcePath) === resolve(destinationPath) || resolve(sourceDir) === resolve(destinationDir)) {
      continue
    }
    if (existsSync(destinationPath)) {
      const existingHash = checksum(readFileSync(destinationPath))
      if (existingHash !== file.checksum) {
        fail('BACKUP_DESTINATION_CONFLICT', 'Já existe um arquivo de backup diferente no destino.')
      }
      continue
    }
    copied.push(destinationPath)
    try {
      copyFileSync(file.sourcePath, destinationPath)
    } catch (error) {
      if (existsSync(destinationPath)) rmSync(destinationPath, { force: true })
      throw error
    }
  }
}

function countSummary(counts) {
  return Object.entries(counts)
    .map(([table, count]) => `${table}=${count}`)
    .join(', ')
}

const sourceArgument = argument('--source')
if (!sourceArgument) {
  console.error(
    'Uso: npm run db:import-sqlite -- --source <caminho/peritsec.db> [--backup-dir <diretório>]',
  )
  process.exit(2)
}

const sourcePath = resolve(sourceArgument)
const sourceBackupDir = resolve(argument('--backup-dir') ?? join(dirname(sourcePath), 'backups'))
if (!existsSync(sourcePath) || !statSync(sourcePath).isFile()) {
  console.error('[peritsec] arquivo SQLite de origem não encontrado.')
  process.exit(1)
}

let sqlite
let store
let copiedFiles = []
let imported = false
try {
  sqlite = new DatabaseSync(sourcePath, { readOnly: true })
  const integrity = sqlite.prepare('PRAGMA integrity_check').get()?.integrity_check
  const foreignKeyErrors = sqlite.prepare('PRAGMA foreign_key_check').all()
  if (integrity !== 'ok' || foreignKeyErrors.length > 0) {
    fail('SQLITE_INTEGRITY_FAILED', 'A integridade da base SQLite não passou na verificação.')
  }
  const snapshot = extractSnapshot(sqlite)
  const sourceFingerprint = checksum(JSON.stringify(snapshot))
  const backupFiles = verifyBackupFiles(snapshot, sourceBackupDir)

  store = await openStore()
  copyBackupFiles(backupFiles, store.backupDir, sourceBackupDir, copiedFiles)
  const result = await store.importSqliteSnapshot(snapshot, sourceFingerprint)
  imported = true
  console.log(
    `[peritsec] ${
      result.alreadyImported ? 'importação já aplicada' : 'importação concluída'
    }: ${countSummary(result.counts)}`,
  )
  console.log('[peritsec] a origem SQLite foi aberta somente para leitura e não foi alterada.')
} catch (error) {
  if (!imported) {
    for (const path of copiedFiles) rmSync(path, { force: true })
  }
  console.error(
    `[peritsec] importação interrompida (${error?.code ?? 'IMPORT_ERROR'}): ${
      error?.message ?? 'erro desconhecido'
    }`,
  )
  process.exitCode = 1
} finally {
  sqlite?.close()
  if (store) await store.close()
}
