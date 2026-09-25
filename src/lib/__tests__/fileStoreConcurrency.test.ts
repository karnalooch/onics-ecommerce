import fs from "fs"
import os from "os"
import path from "path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { readDb, writeDb } from "@/lib/jsonDb"
import { mutateMockData } from "@/store/serverStore"

const originalDbPath = process.env.CELTRONICS_DB_PATH
let tempDir = ""

function emptyDb() {
  return {
    users: [],
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
  }
}

function lockPath() {
  return `${process.env.CELTRONICS_DB_PATH}.lock`
}

describe("file store concurrency", () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "celtronics-store-"))
    process.env.CELTRONICS_DB_PATH = path.join(tempDir, "db.json")
    expect(writeDb(emptyDb())).toBe(true)
  })

  afterEach(() => {
    if (originalDbPath === undefined) {
      delete process.env.CELTRONICS_DB_PATH
    } else {
      process.env.CELTRONICS_DB_PATH = originalDbPath
    }
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it("preserves both concurrent mutations instead of losing the slower update", async () => {
    await Promise.all([
      mutateMockData(async (db) => {
        await new Promise((resolve) => setTimeout(resolve, 50))
        db.orders.push({ id: "ORD-SLOW" })
      }),
      mutateMockData(async (db) => {
        db.orders.push({ id: "ORD-FAST" })
      }),
    ])

    const db = readDb()
    expect(db.orders.map((order: { id: string }) => order.id).sort()).toEqual([
      "ORD-FAST",
      "ORD-SLOW",
    ])
  })

  it("does not overwrite the database when the current file is malformed", async () => {
    const dbPath = process.env.CELTRONICS_DB_PATH!
    fs.writeFileSync(dbPath, "{ definitely-not-json", "utf-8")

    await expect(
      mutateMockData((db) => {
        db.orders.push({ id: "ORD-MUST-NOT-PERSIST" })
      })
    ).rejects.toThrow("Nie udało się bezpiecznie odczytać bazy danych przed zapisem.")

    expect(fs.readFileSync(dbPath, "utf-8")).toBe("{ definitely-not-json")
  })

  it("does not persist a mutation when the transaction throws", async () => {
    await expect(
      mutateMockData((db) => {
        db.orders.push({ id: "ORD-ROLLBACK" })
        throw new Error("abort")
      })
    ).rejects.toThrow("abort")

    expect(readDb().orders).toEqual([])
  })

  it("reclaims a stale lock owned by a dead process", async () => {
    const stalePath = lockPath()
    fs.writeFileSync(
      stalePath,
      JSON.stringify({
        owner: "stale-owner",
        pid: 2147483647,
        acquiredAt: new Date(Date.now() - 60_000).toISOString(),
      })
    )
    const staleTime = new Date(Date.now() - 60_000)
    fs.utimesSync(stalePath, staleTime, staleTime)

    await mutateMockData((db) => {
      db.orders.push({ id: "ORD-AFTER-STALE" })
    })

    expect(readDb().orders).toEqual([{ id: "ORD-AFTER-STALE" }])
    expect(fs.existsSync(stalePath)).toBe(false)
  })

  it("does not remove a lock that no longer belongs to the current owner", async () => {
    const replacementPath = lockPath()

    await mutateMockData((db) => {
      db.orders.push({ id: "ORD-OWNER" })
      fs.writeFileSync(
        replacementPath,
        JSON.stringify({
          owner: "replacement-owner",
          pid: process.pid,
          acquiredAt: new Date().toISOString(),
        })
      )
    })

    expect(readDb().orders).toEqual([{ id: "ORD-OWNER" }])
    expect(fs.existsSync(replacementPath)).toBe(true)
    expect(
      JSON.parse(fs.readFileSync(replacementPath, "utf-8")).owner
    ).toBe("replacement-owner")

    fs.rmSync(replacementPath, { force: true })
  })
})
