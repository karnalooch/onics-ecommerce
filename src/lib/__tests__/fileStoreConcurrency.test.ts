import fs from "fs"
import os from "os"
import path from "path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { getDbLockSettings, readDb, writeDb } from "@/lib/jsonDb"
import { mutateMockData } from "@/store/serverStore"
import { reserveInventory } from "@/lib/inventoryReservations"

const originalDbPath = process.env.CELTRONICS_DB_PATH
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
    for (const name of lockEnvNames) delete process.env[name]
    expect(writeDb(emptyDb())).toBe(true)
  })

  afterEach(() => {
    if (originalDbPath === undefined) {
      delete process.env.CELTRONICS_DB_PATH
    } else {
      process.env.CELTRONICS_DB_PATH = originalDbPath
    }
    for (const name of lockEnvNames) {
      const original = originalLockEnv[name]
      if (original === undefined) {
        delete process.env[name]
      } else {
        process.env[name] = original
      }
    }
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it("reads validated lock timing overrides", () => {
    process.env.CELTRONICS_DB_LOCK_RETRY_MS = "10"
    process.env.CELTRONICS_DB_LOCK_TIMEOUT_MS = "500"
    process.env.CELTRONICS_DB_LOCK_STALE_MS = "1000"
    process.env.CELTRONICS_DB_LOCK_HEARTBEAT_MS = "250"
    process.env.CELTRONICS_DB_LOCK_WARN_WAIT_MS = "100"
    process.env.CELTRONICS_DB_SLOW_TX_MS = "200"

    expect(getDbLockSettings()).toEqual({
      retryMs: 10,
      timeoutMs: 500,
      staleMs: 1000,
      heartbeatMs: 250,
      warnWaitMs: 100,
      slowTxMs: 200,
    })
  })

  it("rejects unsafe heartbeat settings", () => {
    process.env.CELTRONICS_DB_LOCK_STALE_MS = "1000"
    process.env.CELTRONICS_DB_LOCK_HEARTBEAT_MS = "1000"

    expect(() => getDbLockSettings()).toThrow(
      "CELTRONICS_DB_LOCK_HEARTBEAT_MS musi być mniejsze"
    )
  })

  it("honors the configured lock wait timeout", async () => {
    process.env.CELTRONICS_DB_LOCK_RETRY_MS = "5"
    process.env.CELTRONICS_DB_LOCK_TIMEOUT_MS = "100"
    process.env.CELTRONICS_DB_LOCK_STALE_MS = "1000"
    process.env.CELTRONICS_DB_LOCK_HEARTBEAT_MS = "250"

    fs.writeFileSync(
      lockPath(),
      JSON.stringify({
        owner: "live-owner",
        pid: process.pid,
        acquiredAt: new Date().toISOString(),
      })
    )

    await expect(
      mutateMockData((db) => {
        db.orders.push({ id: "ORD-SHOULD-TIMEOUT" })
      })
    ).rejects.toThrow(
      "Przekroczono czas oczekiwania na blokadę bazy danych (100 ms)."
    )
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

  it("serializes competing inventory reservations so stock cannot oversell", async () => {
    expect(
      writeDb({
        ...emptyDb(),
        products: [{ id: "p1", sku: "SKU-1", stock: 5 }],
      })
    ).toBe(true)

    const reserve = (orderId: string) =>
      mutateMockData(async (db) => {
        reserveInventory(
          db.products as Parameters<typeof reserveInventory>[0],
          [{ id: "p1", quantity: 4 }]
        )
        await new Promise((resolve) => setTimeout(resolve, 25))
        db.orders.push({
          id: orderId,
          items: [{ id: "p1", quantity: 4 }],
          inventoryReservationStatus: "RESERVED",
        })
      })

    const results = await Promise.allSettled([
      reserve("ORD-A"),
      reserve("ORD-B"),
    ])

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1)

    const db = readDb()
    expect(db.products[0].stock).toBe(1)
    expect(db.orders).toHaveLength(1)
    expect(["ORD-A", "ORD-B"]).toContain(db.orders[0].id)
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
