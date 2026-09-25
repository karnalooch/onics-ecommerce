import crypto from "crypto"
import fs from "fs"
import path from "path"

export function resolveDbPath() {
  const configured = process.env.CELTRONICS_DB_PATH?.trim()
  if (!configured) {
    throw new Error("CELTRONICS_DB_PATH is required for storage maintenance commands.")
  }
  return path.resolve(configured)
}

export function resolveBackupDir(dbPath = resolveDbPath()) {
  const configured = process.env.CELTRONICS_DB_BACKUP_DIR?.trim()
  return configured
    ? path.resolve(configured)
    : path.join(path.dirname(dbPath), "backups")
}

export function readValidatedJson(filePath) {
  const absolutePath = path.resolve(filePath)
  const raw = fs.readFileSync(absolutePath)
  JSON.parse(raw.toString("utf-8"))
  return raw
}

export function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex")
}

export function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-")
}

export function writeExclusive(filePath, buffer) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, buffer, { flag: "wx", mode: 0o600 })
}

export function atomicReplace(filePath, buffer) {
  const directory = path.dirname(filePath)
  const tempPath = `${filePath}.${process.pid}.${crypto.randomUUID()}.restore.tmp`
  fs.mkdirSync(directory, { recursive: true })
  try {
    fs.writeFileSync(tempPath, buffer, { flag: "wx", mode: 0o600 })
    fs.renameSync(tempPath, filePath)
  } finally {
    fs.rmSync(tempPath, { force: true })
  }
}
