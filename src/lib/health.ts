import fs from "fs"
import { getDbLockSettings } from "@/lib/jsonDb"
import { resolveKnowledgeUploadRoot } from "@/lib/knowledge/files"
import { resolvePersistentPath } from "@/lib/storageConfig"

type ReadinessOptions = {
  nodeEnv?: string
  dbPath?: string | null
  uploadRoot?: string | null
  authSecret?: string | null
  nextAuthSecret?: string | null
  adminBootstrapPassword?: string | null
}

type ReadinessCheck = "ok" | "error"

export type ReadinessResult = {
  ready: boolean
  checks: {
    configuration: ReadinessCheck
    database: ReadinessCheck
    uploads: ReadinessCheck
  }
}

function resolveDatabasePath(options: ReadinessOptions) {
  return resolvePersistentPath({
    envName: "CELTRONICS_DB_PATH",
    configuredPath: options.dbPath ?? process.env.CELTRONICS_DB_PATH,
    developmentFallback: "./src/data/db.json",
    nodeEnv: options.nodeEnv ?? process.env.NODE_ENV,
  })
}

function resolveUploadPath(options: ReadinessOptions) {
  return resolveKnowledgeUploadRoot({
    configuredPath: options.uploadRoot ?? process.env.CELTRONICS_UPLOAD_ROOT,
    nodeEnv: options.nodeEnv ?? process.env.NODE_ENV,
  })
}

function requireProductionSecret(
  nodeEnv: string | undefined,
  name: string,
  value: string | null | undefined
) {
  if (nodeEnv === "production" && !value?.trim()) {
    throw new Error(`${name} is required in production.`)
  }
}

function validateConfiguration(options: ReadinessOptions) {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV
  resolveDatabasePath(options)
  resolveUploadPath(options)
  getDbLockSettings()

  requireProductionSecret(nodeEnv, "AUTH_SECRET", options.authSecret ?? process.env.AUTH_SECRET)
  requireProductionSecret(nodeEnv, "NEXTAUTH_SECRET", options.nextAuthSecret ?? process.env.NEXTAUTH_SECRET)
  requireProductionSecret(
    nodeEnv,
    "ADMIN_BOOTSTRAP_PASSWORD",
    options.adminBootstrapPassword ?? process.env.ADMIN_BOOTSTRAP_PASSWORD
  )
}

function validateDatabase(options: ReadinessOptions) {
  const dbPath = resolveDatabasePath(options)
  fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK)
  const parsed: unknown = JSON.parse(fs.readFileSync(dbPath, "utf-8"))

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Database root must be a JSON object.")
  }
}

function validateUploads(options: ReadinessOptions) {
  const uploadRoot = resolveUploadPath(options)
  const stat = fs.statSync(uploadRoot)

  if (!stat.isDirectory()) {
    throw new Error("Upload root must be a directory.")
  }

  fs.accessSync(uploadRoot, fs.constants.R_OK | fs.constants.W_OK)
}

function check(operation: () => void): ReadinessCheck {
  try {
    operation()
    return "ok"
  } catch {
    return "error"
  }
}

export function evaluateReadiness(
  options: ReadinessOptions = {}
): ReadinessResult {
  const checks = {
    configuration: check(() => validateConfiguration(options)),
    database: check(() => validateDatabase(options)),
    uploads: check(() => validateUploads(options)),
  }

  return {
    ready: Object.values(checks).every((value) => value === "ok"),
    checks,
  }
}
