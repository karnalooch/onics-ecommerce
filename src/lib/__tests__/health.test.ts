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

function readyOptions() {
  return {
    nodeEnv: "production",
    dbPath: path.join(tempDir, "db.json"),
    uploadRoot: path.join(tempDir, "uploads"),
    authSecret: "test-auth-secret",
    nextAuthSecret: "test-nextauth-secret",
    adminBootstrapPassword: "test-admin-password",
  }
}

describe("production readiness", () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "celtronics-health-"))
    fs.writeFileSync(path.join(tempDir, "db.json"), JSON.stringify({ users: [] }))
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
      },
    })
  })

  it("reports database failure for malformed persisted JSON", () => {
    fs.writeFileSync(path.join(tempDir, "db.json"), "{broken-json")

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
})
