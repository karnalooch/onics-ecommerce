import crypto from "crypto"
import fs from "fs"
import path from "path"
import { resolvePersistentPath } from "@/lib/storageConfig"

const DB_LOCK_RETRY_MS = 25
const DB_LOCK_TIMEOUT_MS = 5_000
const DB_LOCK_STALE_MS = 30_000
const DB_LOCK_HEARTBEAT_MS = 5_000

type DbLockMetadata = {
  owner: string
  pid: number
  acquiredAt: string
}

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

function readDbFile() {
  const dbPath = getDbPath()
  const data = fs.readFileSync(dbPath, "utf-8")
  return JSON.parse(data)
}

export function readDb() {
  try {
    return readDbFile()
  } catch (error) {
    console.error("Błąd odczytu bazy danych:", error)
    return null
  }
}

/**
 * W ścieżkach zapisu błąd odczytu nie może zostać zinterpretowany jako
 * "pusta baza". W przeciwnym razie uszkodzony/nieczytelny plik mógłby zostać
 * nadpisany poprawnym JSON-em pozbawionym istniejących danych.
 */
export function readDbOrThrow() {
  try {
    return readDbFile()
  } catch (error) {
    console.error("Krytyczny błąd odczytu bazy przed mutacją:", error)
    throw new Error("Nie udało się bezpiecznie odczytać bazy danych przed zapisem.")
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

function readLockMetadata(lockPath: string): DbLockMetadata | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(lockPath, "utf-8")) as Partial<DbLockMetadata>
    if (
      typeof parsed.owner !== "string" ||
      typeof parsed.pid !== "number" ||
      typeof parsed.acquiredAt !== "string"
    ) {
      return null
    }
    return parsed as DbLockMetadata
  } catch {
    return null
  }
}

function isProcessAlive(pid: number) {
  if (!Number.isInteger(pid) || pid <= 0) return false

  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    return code !== "ESRCH"
  }
}

function ownsLock(lockPath: string, owner: string) {
  return readLockMetadata(lockPath)?.owner === owner
}

async function acquireDbLock() {
  const dbPath = getDbPath()
  const lockPath = `${dbPath}.lock`
  const deadline = Date.now() + DB_LOCK_TIMEOUT_MS
  const owner = crypto.randomUUID()

  fs.mkdirSync(path.dirname(dbPath), { recursive: true })

  while (Date.now() < deadline) {
    try {
      const handle = fs.openSync(lockPath, "wx", 0o600)
      const metadata: DbLockMetadata = {
        owner,
        pid: process.pid,
        acquiredAt: new Date().toISOString(),
      }
      fs.writeFileSync(handle, JSON.stringify(metadata))

      const heartbeat = setInterval(() => {
        try {
          if (!ownsLock(lockPath, owner)) return
          const now = new Date()
          fs.utimesSync(lockPath, now, now)
        } catch {
          // The lock may already be released or replaced.
        }
      }, DB_LOCK_HEARTBEAT_MS)
      heartbeat.unref()

      return () => {
        clearInterval(heartbeat)
        try {
          fs.closeSync(handle)
        } finally {
          if (ownsLock(lockPath, owner)) {
            fs.rmSync(lockPath, { force: true })
          }
        }
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code !== "EEXIST") throw error

      try {
        const stat = fs.statSync(lockPath)
        if (Date.now() - stat.mtimeMs > DB_LOCK_STALE_MS) {
          const observed = readLockMetadata(lockPath)
          if (
            observed &&
            !isProcessAlive(observed.pid) &&
            ownsLock(lockPath, observed.owner)
          ) {
            fs.rmSync(lockPath, { force: true })
            continue
          }
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
