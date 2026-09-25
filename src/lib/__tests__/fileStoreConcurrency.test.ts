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

  it("does not persist a mutation when the transaction throws", async () => {
    await expect(
      mutateMockData((db) => {
        db.orders.push({ id: "ORD-ROLLBACK" })
        throw new Error("abort")
      })
    ).rejects.toThrow("abort")

    expect(readDb().orders).toEqual([])
  })
})
