import bcrypt from "bcrypt"
import fs from "fs"
import os from "os"
import path from "path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  needsAdminBootstrap,
  sealAdminBootstrapPassword,
} from "@/lib/adminBootstrap"

const originalDbPath = process.env.CELTRONICS_DB_PATH
let tempDir = ""
let dbPath = ""

function writeUsers(users: unknown[]) {
  fs.writeFileSync(
    dbPath,
    JSON.stringify({
      users,
      orders: [],
      repairs: [],
      categories: [],
      manufacturers: [],
      products: [],
      knowledgeMeta: {
        sources: [],
        processedSources: [],
        lastUpdated: null,
      },
    })
  )
}

describe("admin bootstrap sealing", () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "celtronics-bootstrap-"))
    dbPath = path.join(tempDir, "db.json")
    process.env.CELTRONICS_DB_PATH = dbPath
  })

  afterEach(() => {
    if (originalDbPath === undefined) delete process.env.CELTRONICS_DB_PATH
    else process.env.CELTRONICS_DB_PATH = originalDbPath
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it("detects only active admins without a password hash", () => {
    expect(
      needsAdminBootstrap([
        { roleType: "ADMIN", isBlocked: false },
        { roleType: "BIZ", isBlocked: false },
      ])
    ).toBe(true)

    expect(
      needsAdminBootstrap([
        { roleType: "ADMIN", isBlocked: false, passwordHash: "sealed" },
        { roleType: "ADMIN", isBlocked: true },
      ])
    ).toBe(false)
  })

  it("persists a bcrypt hash for the bootstrap admin", async () => {
    writeUsers([
      {
        id: "u_admin",
        email: "admin@example.test",
        roleType: "ADMIN",
        isBlocked: false,
      },
    ])

    const sealedHash = await sealAdminBootstrapPassword({
      userId: "u_admin",
      email: "admin@example.test",
      password: "bootstrap-secret",
    })
    const persisted = JSON.parse(fs.readFileSync(dbPath, "utf-8"))

    expect(await bcrypt.compare("bootstrap-secret", sealedHash)).toBe(true)
    expect(persisted.users[0].passwordHash).toBe(sealedHash)
  })

  it("does not overwrite a password hash sealed by another request", async () => {
    const existingHash = await bcrypt.hash("already-sealed", 12)
    writeUsers([
      {
        id: "u_admin",
        email: "admin@example.test",
        roleType: "ADMIN",
        isBlocked: false,
        passwordHash: existingHash,
      },
    ])

    const resolvedHash = await sealAdminBootstrapPassword({
      userId: "u_admin",
      email: "admin@example.test",
      password: "bootstrap-secret",
    })

    expect(resolvedHash).toBe(existingHash)
    expect(await bcrypt.compare("bootstrap-secret", resolvedHash)).toBe(false)
  })
})
