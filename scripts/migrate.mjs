import { openStore } from '../server/db.mjs'

let store
try {
  store = await openStore()
  console.log(`[peritsec] migrations PostgreSQL aplicadas; schema v${store.schemaVersion}`)
} catch (error) {
  console.error(
    `[peritsec] falha nas migrations PostgreSQL (${error?.code ?? 'MIGRATION_ERROR'}): ${
      error?.message ?? 'erro desconhecido'
    }`,
  )
  process.exitCode = 1
} finally {
  if (store) await store.close()
}
