import fs from "fs"
import path from "path"
import {
  atomicReplace,
  readValidatedJson,
  resolveBackupDir,
  resolveDbPath,
  sha256,
  timestampSlug,
  writeExclusive,
} from "./db-file-utils.mjs"

function argumentValue(name) {
  const index = process.argv.indexOf(name)
  return index === -1 ? null : process.argv[index + 1] || null
}

const sourceArg = argumentValue("--from")
const confirmed = process.argv.includes("--confirm")

if (!sourceArg) {
  throw new Error("Usage: npm run db:restore -- --from /path/to/backup.json --confirm")
}
if (!confirmed) {
  throw new Error("Restore requires explicit --confirm.")
}

const dbPath = resolveDbPath()
const restoreSource = path.resolve(sourceArg)
const lockPath = `${dbPath}.lock`

if (fs.existsSync(lockPath)) {
  throw new Error(
    `Database lock exists at ${lockPath}. Stop application writers before restore.`
  )
}

if (restoreSource === dbPath) {
  throw new Error("Restore source must be different from CELTRONICS_DB_PATH.")
}

const restoredContents = readValidatedJson(restoreSource)
const backupDir = resolveBackupDir(dbPath)

let safetyCopy = null
if (fs.existsSync(dbPath)) {
  const currentContents = fs.readFileSync(dbPath)
  safetyCopy = path.join(
    backupDir,
    `pre-restore-${timestampSlug()}.json`
  )
  writeExclusive(safetyCopy, currentContents)
}

atomicReplace(dbPath, restoredContents)

const finalContents = readValidatedJson(dbPath)
const expectedHash = sha256(restoredContents)
const finalHash = sha256(finalContents)
if (expectedHash !== finalHash) {
  throw new Error("Post-restore checksum mismatch.")
}

console.log(JSON.stringify({
  ok: true,
  restoredFrom: restoreSource,
  restoredTo: dbPath,
  safetyCopy,
  bytes: finalContents.length,
  sha256: finalHash,
}))
