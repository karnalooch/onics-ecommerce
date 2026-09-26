import fs from "fs"
import os from "os"
import path from "path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { evaluateReadiness } from "@/lib/health"

const lockEnvNames = [
  "CELTRONICS_DB_LOCK_RETRY_MS",
  "CELTRONICS_DB_LOCK_TIMEOUT_MS",
  "CELTRONICS_DB_LOCK_STALE_MS",
  "CELTRONICS_DB_LOCK_HEARTBEAT_MS",
  "CELTRONICS_DB_LOCK_WARN_WAIT_MS",
  "CELTRONICS_DB_SLOW_TX_MS",
] as const

const originalLockEnv = Object.fromEntries(
  lockEnvNames.map((name) => [name, process.env[name]])
)

let tempDir = ""

function dbPath() {
  return path.join(tempDir, "db.json")
}

function writeDb(users: unknown[] = []) {
  fs.writeFileSync(dbPath(), JSON.stringify({ users }))
}

function readyOptions() {
  return {
    nodeEnv: "production",
    dbPath: dbPath(),
    uploadRoot: path.join(tempDir, "uploads"),
    authSecret: "test-auth-secret",
    nextAuthSecret: "test-nextauth-secret",
    adminBootstrapPassword: "test-admin-password",
    stripeSecretKey: "",
    stripeWebhookSecret: "",
    appUrl: "",
  }
}

describe("production readiness", () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "celtronics-health-"))
    writeDb()
    fs.mkdirSync(path.join(tempDir, "uploads"))
    for (const name of lockEnvNames) delete process.env[name]
  })

  afterEach(() => {
    for (const name of lockEnvNames) {
      const value = originalLockEnv[name]
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it("reports ready when production dependencies are usable", () => {
    expect(evaluateReadiness(readyOptions())).toEqual({
      ready: true,
      checks: {
        configuration: "ok",
        database: "ok",
        uploads: "ok",
        adminBootstrap: "ok",
        payments: "ok",
      },
    })
  })

  it("reports database failure for malformed persisted JSON", () => {
    fs.writeFileSync(dbPath(), "{broken-json")

    expect(evaluateReadiness(readyOptions())).toMatchObject({
      ready: false,
      checks: { database: "error" },
    })
  })

  it("reports upload failure when the private upload root is missing", () => {
    fs.rmSync(path.join(tempDir, "uploads"), { recursive: true, force: true })

    expect(evaluateReadiness(readyOptions())).toMatchObject({
      ready: false,
      checks: { uploads: "error" },
    })
  })

  it("reports configuration failure when a required secret is missing", () => {
    expect(
      evaluateReadiness({
        ...readyOptions(),
        authSecret: "",
      })
    ).toMatchObject({
      ready: false,
      checks: { configuration: "error" },
    })
  })

  it("requires the bootstrap secret while an active admin is unsealed", () => {
    writeDb([
      {
        id: "u_admin",
        roleType: "ADMIN",
        isBlocked: false,
      },
    ])

    expect(
      evaluateReadiness({
        ...readyOptions(),
        adminBootstrapPassword: "",
      })
    ).toMatchObject({
      ready: false,
      checks: { adminBootstrap: "error" },
    })
  })

  it("does not require the bootstrap secret after the admin is sealed", () => {
    writeDb([
      {
        id: "u_admin",
        roleType: "ADMIN",
        isBlocked: false,
        passwordHash: "sealed-hash",
      },
    ])

    expect(
      evaluateReadiness({
        ...readyOptions(),
        adminBootstrapPassword: "",
      })
    ).toMatchObject({
      ready: true,
      checks: { adminBootstrap: "ok" },
    })
  })
  it("reports payment failure for incomplete production Stripe configuration", () => {
    expect(
      evaluateReadiness({
        ...readyOptions(),
        stripeSecretKey: "sk_test",
        stripeWebhookSecret: "",
        appUrl: "https://shop.example.com",
      })
    ).toMatchObject({
      ready: false,
      checks: { payments: "error" },
    })
  })

  it("reports payment failure for a non-HTTPS production app URL", () => {
    expect(
      evaluateReadiness({
        ...readyOptions(),
        stripeSecretKey: "sk_test",
        stripeWebhookSecret: "whsec_test",
        appUrl: "http://shop.example.com",
      })
    ).toMatchObject({
      ready: false,
      checks: { payments: "error" },
    })
  })

  it("accepts complete production Stripe configuration", () => {
    expect(
      evaluateReadiness({
        ...readyOptions(),
        stripeSecretKey: "sk_test",
        stripeWebhookSecret: "whsec_test",
        appUrl: "https://shop.example.com",
      })
    ).toMatchObject({
      ready: true,
      checks: { payments: "ok" },
    })
  })
})
