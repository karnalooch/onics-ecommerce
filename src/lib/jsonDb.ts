import crypto from "crypto"
import fs from "fs"
import path from "path"
import { resolvePersistentPath } from "@/lib/storageConfig"

const DEFAULT_DB_LOCK_RETRY_MS = 25
const DEFAULT_DB_LOCK_TIMEOUT_MS = 15_000
const DEFAULT_DB_LOCK_STALE_MS = 10_000
const DEFAULT_DB_LOCK_HEARTBEAT_MS = 2_000
const DEFAULT_DB_LOCK_WARN_WAIT_MS = 500
const DEFAULT_DB_SLOW_TX_MS = 1_000

function readDurationEnv(
  name: string,
  fallback: number,
  min: number,
  max: number
) {
  const raw = process.env[name]?.trim()
  if (!raw) return fallback

  const value = Number(raw)
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(
      `${name} musi być liczbą całkowitą z zakresu ${min}-${max} ms.`
    )
  }

  return value
}

export function getDbLockSettings() {
  const settings = {
    retryMs: readDurationEnv(
      "CELTRONICS_DB_LOCK_RETRY_MS",
      DEFAULT_DB_LOCK_RETRY_MS,
      5,
      1_000
    ),
    timeoutMs: readDurationEnv(
      "CELTRONICS_DB_LOCK_TIMEOUT_MS",
      DEFAULT_DB_LOCK_TIMEOUT_MS,
      100,
      120_000
    ),
    staleMs: readDurationEnv(
      "CELTRONICS_DB_LOCK_STALE_MS",
      DEFAULT_DB_LOCK_STALE_MS,
      1_000,
      300_000
    ),
    heartbeatMs: readDurationEnv(
      "CELTRONICS_DB_LOCK_HEARTBEAT_MS",
      DEFAULT_DB_LOCK_HEARTBEAT_MS,
      250,
      60_000
    ),
    warnWaitMs: readDurationEnv(
      "CELTRONICS_DB_LOCK_WARN_WAIT_MS",
      DEFAULT_DB_LOCK_WARN_WAIT_MS,
      50,
      60_000
    ),
    slowTxMs: readDurationEnv(
      "CELTRONICS_DB_SLOW_TX_MS",
      DEFAULT_DB_SLOW_TX_MS,
      50,
      120_000
    ),
  }

  if (settings.heartbeatMs >= settings.staleMs) {
    throw new Error(
      "CELTRONICS_DB_LOCK_HEARTBEAT_MS musi być mniejsze niż CELTRONICS_DB_LOCK_STALE_MS."
    )
  }

  return settings
}

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

export function readDbStrict() {
  try {
    return readDbFile()
  } catch (error) {
    console.error("Krytyczny błąd odczytu bazy danych:", error)
    throw new Error("Nie udało się bezpiecznie odczytać bazy danych.")
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
function syncDirectoryBestEffort(directory: string) {
  if (process.platform === "win32") return

  let directoryHandle: number | null = null
  try {
    directoryHandle = fs.openSync(directory, "r")
    fs.fsyncSync(directoryHandle)
  } catch (error) {
    console.warn(
      "[DB_WRITE] Nie udało się zsynchronizować metadanych katalogu po rename:",
      error
    )
  } finally {
    if (directoryHandle !== null) {
      try {
        fs.closeSync(directoryHandle)
      } catch {
        // Best-effort directory durability must not invalidate a completed rename.
      }
    }
  }
}

export function writeDb(data: unknown) {
  const dbPath = getDbPath()
  const directory = path.dirname(dbPath)
  const tempPath = `${dbPath}.${process.pid}.${crypto.randomUUID()}.tmp`
  let tempHandle: number | null = null

  try {
    fs.mkdirSync(directory, { recursive: true })
    tempHandle = fs.openSync(tempPath, "wx", 0o600)
    fs.writeFileSync(tempHandle, JSON.stringify(data, null, 2), {
      encoding: "utf-8",
    })
    fs.fsyncSync(tempHandle)
    fs.closeSync(tempHandle)
    tempHandle = null

    fs.renameSync(tempPath, dbPath)
    syncDirectoryBestEffort(directory)
    return true
  } catch (error) {
    console.error("Błąd zapisu bazy danych:", error)

    if (tempHandle !== null) {
      try {
        fs.closeSync(tempHandle)
      } catch {
        // Cleanup failure must not hide the original persistence error.
      }
    }

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

async function acquireDbLock(settings: ReturnType<typeof getDbLockSettings>) {
  const dbPath = getDbPath()
  const lockPath = `${dbPath}.lock`
  const waitStartedAt = Date.now()
  const deadline = waitStartedAt + settings.timeoutMs
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
      }, settings.heartbeatMs)
      heartbeat.unref()

      return {
        waitedMs: Date.now() - waitStartedAt,
        release: () => {
          clearInterval(heartbeat)
          try {
            fs.closeSync(handle)
          } finally {
            if (ownsLock(lockPath, owner)) {
              fs.rmSync(lockPath, { force: true })
            }
          }
        },
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code !== "EEXIST") throw error

      try {
        const stat = fs.statSync(lockPath)
        if (Date.now() - stat.mtimeMs > settings.staleMs) {
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

      await sleep(settings.retryMs)
    }
  }

  throw new Error(
    `Przekroczono czas oczekiwania na blokadę bazy danych (${settings.timeoutMs} ms).`
  )
}

export async function withDbWriteLock<T>(
  operation: () => Promise<T> | T
): Promise<T> {
  const settings = getDbLockSettings()
  const lease = await acquireDbLock(settings)
  const transactionStartedAt = Date.now()

  try {
    return await operation()
  } finally {
    const heldMs = Date.now() - transactionStartedAt
    lease.release()

    if (lease.waitedMs >= settings.warnWaitMs) {
      console.warn(
        `[DB_LOCK] Oczekiwanie na lock trwało ${lease.waitedMs} ms (limit ${settings.timeoutMs} ms).`
      )
    }
    if (heldMs >= settings.slowTxMs) {
      console.warn(
        `[DB_LOCK] Transakcja trzymała lock przez ${heldMs} ms.`
      )
    }
  }
}
