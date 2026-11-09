import { sanitizeProgress, type ProgressState } from './progress'

export type StorageMode = 'checking' | 'sqlite' | 'local'

export interface BackupSummary {
  id: number
  fileName: string
  sha256: string
  sizeBytes: number
  createdAt: string
}

export type RemoteProgressResult =
  | { status: 'ok'; progress: ProgressState; updatedAt: string; dataDir: string }
  | { status: 'empty'; dataDir: string }
  | { status: 'unavailable'; error: string }
  | { status: 'unauthorized'; error: string }

export type RemoteWriteResult =
  | { ok: true; updatedAt: string }
  | { ok: false; error: string; unauthorized?: boolean }

export type BackupCreateResult =
  | { ok: true; backup: BackupSummary }
  | { ok: false; error: string }

export type BackupRestoreResult =
  | { ok: true; progress: ProgressState; updatedAt: string; fileName: string }
  | { ok: false; error: string }

export const API_TIMEOUT_MS = 2500

async function requestJson(path: string, init?: RequestInit): Promise<Response | null> {
  if (typeof fetch !== 'function') return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  try {
    return await fetch(path, {
      ...init,
      credentials: 'include',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function parseError(data: unknown, fallback: string): string {
  const record = asRecord(data)
  return typeof record?.error === 'string' && record.error ? record.error : fallback
}

function parseBackup(value: unknown): BackupSummary | null {
  const record = asRecord(value)
  if (!record) return null
  if (
    typeof record.id !== 'number' ||
    typeof record.fileName !== 'string' ||
    typeof record.sha256 !== 'string' ||
    typeof record.sizeBytes !== 'number' ||
    typeof record.createdAt !== 'string'
  ) {
    return null
  }
  return {
    id: record.id,
    fileName: record.fileName,
    sha256: record.sha256,
    sizeBytes: record.sizeBytes,
    createdAt: record.createdAt,
  }
}

async function readData(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function fetchRemoteProgress(): Promise<RemoteProgressResult> {
  const response = await requestJson('/api/progress')
  if (!response) {
    return { status: 'unavailable', error: 'servidor local não respondeu' }
  }
  const data = await readData(response)
  if (response.status === 404) {
    const record = asRecord(data)
    return {
      status: 'empty',
      dataDir: typeof record?.dataDir === 'string' ? record.dataDir : '',
    }
  }
  if (response.status === 401) {
    return { status: 'unauthorized', error: parseError(data, 'sessão expirada') }
  }
  if (!response.ok) {
    return { status: 'unavailable', error: parseError(data, `HTTP ${response.status}`) }
  }
  const record = asRecord(data)
  const progress = sanitizeProgress(record?.progress)
  if (!record || !progress || typeof record.updatedAt !== 'string') {
    return { status: 'unavailable', error: 'resposta de progresso inválida' }
  }
  return {
    status: 'ok',
    progress,
    updatedAt: record.updatedAt,
    dataDir: typeof record.dataDir === 'string' ? record.dataDir : '',
  }
}

export async function saveRemoteProgress(
  progress: ProgressState,
  accountId: string,
): Promise<RemoteWriteResult> {
  const response = await requestJson('/api/progress', {
    method: 'PUT',
    body: JSON.stringify({ accountId, progress }),
  })
  if (!response) return { ok: false, error: 'servidor local não respondeu' }
  const data = await readData(response)
  if (!response.ok) {
    return {
      ok: false,
      error: parseError(data, `HTTP ${response.status}`),
      unauthorized: response.status === 401,
    }
  }
  const record = asRecord(data)
  return {
    ok: true,
    updatedAt:
      typeof record?.updatedAt === 'string' ? record.updatedAt : new Date().toISOString(),
  }
}

export async function createRemoteBackup(): Promise<BackupCreateResult> {
  const response = await requestJson('/api/backups', { method: 'POST', body: '{}' })
  if (!response) return { ok: false, error: 'servidor local não respondeu' }
  const data = await readData(response)
  if (!response.ok) {
    return { ok: false, error: parseError(data, `HTTP ${response.status}`) }
  }
  const record = asRecord(data)
  const backup = parseBackup(record?.backup)
  if (!backup) return { ok: false, error: 'resposta de backup inválida' }
  return { ok: true, backup }
}

export async function listRemoteBackups(): Promise<BackupSummary[]> {
  const response = await requestJson('/api/backups')
  if (!response?.ok) return []
  const data = await readData(response)
  const record = asRecord(data)
  if (!Array.isArray(record?.backups)) return []
  return record.backups
    .map(parseBackup)
    .filter((backup): backup is BackupSummary => backup !== null)
}

export async function restoreRemoteBackup(id: number): Promise<BackupRestoreResult> {
  const response = await requestJson(`/api/backups/${id}/restore`, {
    method: 'POST',
    body: '{}',
  })
  if (!response) return { ok: false, error: 'servidor local não respondeu' }
  const data = await readData(response)
  if (!response.ok) {
    return { ok: false, error: parseError(data, `HTTP ${response.status}`) }
  }
  const record = asRecord(data)
  const progress = sanitizeProgress(record?.progress)
  const restoredFrom = asRecord(record?.restoredFrom)
  if (!record || !progress || typeof record.updatedAt !== 'string') {
    return { ok: false, error: 'resposta de restauração inválida' }
  }
  return {
    ok: true,
    progress,
    updatedAt: record.updatedAt,
    fileName: typeof restoredFrom?.fileName === 'string' ? restoredFrom.fileName : 'backup',
  }
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
