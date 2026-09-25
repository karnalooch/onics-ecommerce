import crypto from "crypto"
import fs from "fs"
import path from "path"
import { resolvePersistentPath } from "@/lib/storageConfig"

const DB_LOCK_RETRY_MS = 25
const DB_LOCK_TIMEOUT_MS = 5_000
const DB_LOCK_STALE_MS = 30_000

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getDbPath() {
  return resolvePersistentPath({
    envName: "CELTRONICS_DB_PATH",
    configuredPath: process.env.CELTRONICS_DB_PATH,
    developmentFallback: path.join(process.cwd(), "src", "data", "db.json"),
  })
}

export function readDb() {
  const dbPath = getDbPath()

  try {
    const data = fs.readFileSync(dbPath, "utf-8")
    return JSON.parse(data)
  } catch (error) {
    console.error("Błąd odczytu bazy danych:", error)
    return null
  }
}

/**
 * Zapis przez plik tymczasowy + rename ogranicza ryzyko pozostawienia
 * częściowo zapisanego JSON-a po przerwaniu procesu. W produkcji
 * CELTRONICS_DB_PATH jest wymagane i musi wskazywać trwały, zapisywalny wolumen.
 */
export function writeDb(data: unknown) {
  const dbPath = getDbPath()
  const directory = path.dirname(dbPath)
  const tempPath = `${dbPath}.${process.pid}.${crypto.randomUUID()}.tmp`

  try {
    fs.mkdirSync(directory, { recursive: true })
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), {
      encoding: "utf-8",
      mode: 0o600,
      flag: "wx",
    })
    fs.renameSync(tempPath, dbPath)
    return true
  } catch (error) {
    console.error("Błąd zapisu bazy danych:", error)

    try {
      fs.rmSync(tempPath, { force: true })
    } catch {
      // Cleanup failure must not hide the original persistence error.
    }

    return false
  }
}

async function acquireDbLock() {
  const dbPath = getDbPath()
  const lockPath = `${dbPath}.lock`
  const deadline = Date.now() + DB_LOCK_TIMEOUT_MS

  fs.mkdirSync(path.dirname(dbPath), { recursive: true })

  while (Date.now() < deadline) {
    try {
      const handle = fs.openSync(lockPath, "wx", 0o600)
      fs.writeFileSync(
        handle,
        JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString() })
      )

      return () => {
        try {
          fs.closeSync(handle)
        } finally {
          fs.rmSync(lockPath, { force: true })
        }
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code !== "EEXIST") throw error

      try {
        const stat = fs.statSync(lockPath)
        if (Date.now() - stat.mtimeMs > DB_LOCK_STALE_MS) {
          fs.rmSync(lockPath, { force: true })
          continue
        }
      } catch (statError) {
        const statCode = (statError as NodeJS.ErrnoException).code
        if (statCode !== "ENOENT") throw statError
      }

      await sleep(DB_LOCK_RETRY_MS)
    }
  }

  throw new Error("Przekroczono czas oczekiwania na blokadę bazy danych.")
}

export async function withDbWriteLock<T>(
  operation: () => Promise<T> | T
): Promise<T> {
  const release = await acquireDbLock()
  try {
    return await operation()
  } finally {
    release()
  }
}
