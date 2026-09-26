import fs from "fs"
import { needsAdminBootstrap } from "@/lib/adminBootstrap"
import { getDbLockSettings } from "@/lib/jsonDb"
import { resolveKnowledgeUploadRoot } from "@/lib/knowledge/files"
import { resolvePersistentPath } from "@/lib/storageConfig"
import {
  PAYMENT_PROVIDER_IDS,
  paymentProviderOperationalStatus,
  type PaymentRuntimeOptions,
} from "@/lib/paymentProviders"
import {
  normalizePaymentControl,
  normalizePaymentMethods,
} from "@/store/serverStore"

type ReadinessOptions = {
  nodeEnv?: string
  dbPath?: string | null
  uploadRoot?: string | null
  authSecret?: string | null
  nextAuthSecret?: string | null
  adminBootstrapPassword?: string | null
  stripeSecretKey?: string | null
  stripeWebhookSecret?: string | null
  appUrl?: string | null
  bankTransferRecipient?: string | null
  bankTransferAccountNumber?: string | null
  p24MerchantId?: string | null
  p24PosId?: string | null
  p24ApiKey?: string | null
  p24Crc?: string | null
}

type ReadinessCheck = "ok" | "error"
type DatabaseRoot = Record<string, unknown>

export type ReadinessResult = {
  ready: boolean
  checks: {
    configuration: ReadinessCheck
    database: ReadinessCheck
    uploads: ReadinessCheck
    adminBootstrap: ReadinessCheck
    payments: ReadinessCheck
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

function readDatabaseRoot(options: ReadinessOptions): DatabaseRoot {
  const dbPath = resolveDatabasePath(options)
  fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK)
  const parsed: unknown = JSON.parse(fs.readFileSync(dbPath, "utf-8"))

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Database root must be a JSON object.")
  }

  return parsed as DatabaseRoot
}

function validateConfiguration(options: ReadinessOptions) {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV
  resolveDatabasePath(options)
  resolveUploadPath(options)
  getDbLockSettings()

  requireProductionSecret(nodeEnv, "AUTH_SECRET", options.authSecret ?? process.env.AUTH_SECRET)
  requireProductionSecret(nodeEnv, "NEXTAUTH_SECRET", options.nextAuthSecret ?? process.env.NEXTAUTH_SECRET)
}

function validateAdminBootstrap(options: ReadinessOptions) {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV
  if (nodeEnv !== "production") return

  const database = readDatabaseRoot(options)
  if (!needsAdminBootstrap(database.users)) return

  requireProductionSecret(
    nodeEnv,
    "ADMIN_BOOTSTRAP_PASSWORD",
    options.adminBootstrapPassword ?? process.env.ADMIN_BOOTSTRAP_PASSWORD
  )
}

function paymentRuntimeOptions(
  options: ReadinessOptions
): PaymentRuntimeOptions {
  return {
    nodeEnv: options.nodeEnv ?? process.env.NODE_ENV,
    stripeSecretKey:
      options.stripeSecretKey ?? process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret:
      options.stripeWebhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET,
    appUrl: options.appUrl ?? process.env.NEXT_PUBLIC_APP_URL,
    bankTransferRecipient:
      options.bankTransferRecipient ?? process.env.BANK_TRANSFER_RECIPIENT,
    bankTransferAccountNumber:
      options.bankTransferAccountNumber ??
      process.env.BANK_TRANSFER_ACCOUNT_NUMBER,
    p24MerchantId:
      options.p24MerchantId ?? process.env.P24_MERCHANT_ID,
    p24PosId:
      options.p24PosId ?? process.env.P24_POS_ID,
    p24ApiKey:
      options.p24ApiKey ?? process.env.P24_API_KEY,
    p24Crc:
      options.p24Crc ?? process.env.P24_CRC,
  }
}

function validatePayments(options: ReadinessOptions) {
  const database = readDatabaseRoot(options)
  const control = normalizePaymentControl(database.paymentControl)
  if (!control.enabled) return

  const methods = normalizePaymentMethods(database.paymentMethods)
  const runtime = paymentRuntimeOptions(options)

  for (const provider of PAYMENT_PROVIDER_IDS) {
    if (!methods[provider].enabled) continue

    const status = paymentProviderOperationalStatus(provider, runtime)
    if (!status.configured) {
      throw new Error(`PAYMENT_PROVIDER_NOT_READY:${provider}`)
    }
  }
}

function validateDatabase(options: ReadinessOptions) {
  readDatabaseRoot(options)
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
    adminBootstrap: check(() => validateAdminBootstrap(options)),
    payments: check(() => validatePayments(options)),
  }

  return {
    ready: Object.values(checks).every((value) => value === "ok"),
    checks,
  }
}
