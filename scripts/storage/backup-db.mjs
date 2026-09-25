import path from "path"
import {
  readValidatedJson,
  resolveBackupDir,
  resolveDbPath,
  sha256,
  timestampSlug,
  writeExclusive,
} from "./db-file-utils.mjs"

const dbPath = resolveDbPath()
const backupDir = resolveBackupDir(dbPath)
const contents = readValidatedJson(dbPath)
const backupPath = path.join(
  backupDir,
  `db-${timestampSlug()}.json`
)

writeExclusive(backupPath, contents)

console.log(JSON.stringify({
  ok: true,
  source: dbPath,
  backup: backupPath,
  bytes: contents.length,
  sha256: sha256(contents),
}))
