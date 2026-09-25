import crypto from "crypto"
import fs from "fs"
import path from "path"
import { resolvePersistentPath } from "@/lib/storageConfig"

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
