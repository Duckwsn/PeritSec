import { spawn } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const children = new Set()
let shuttingDown = false

function start(label, scriptPath, args = []) {
  const child = spawn(process.execPath, [scriptPath, ...args], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' },
  })
  children.add(child)
  child.on('exit', (code, signal) => {
    children.delete(child)
    if (shuttingDown) return
    console.error(`[peritsec] ${label} encerrou (${signal ?? code})`)
    shutdown(code ?? 1)
  })
  return child
}

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    try {
      child.kill()
    } catch {
      // Processo já encerrado.
    }
  }
  setTimeout(() => process.exit(code), 300)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

start('servidor local', join(ROOT_DIR, 'server', 'index.mjs'))
start('vite', join(ROOT_DIR, 'node_modules', 'vite', 'bin', 'vite.js'))

console.log('[peritsec] desenvolvimento: interface em http://localhost:5173 e API em http://127.0.0.1:4317')
