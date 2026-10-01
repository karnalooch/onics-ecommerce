// @vitest-environment node
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "@/app/api/products/route"

// Only identity ingress is mocked. Route parsing, revision checks, stock rules,
// transaction locking, rollback and filesystem persistence are the real code.
vi.mock("@/auth", () => ({ auth: vi.fn(async () => null) }))
vi.mock("@/lib/authUtils", () => ({
  authorizeAPI: vi.fn(async () => ({ authorized: true, user: { id: "admin-1", email: "admin@example.test" } })),
}))

let directory: string
let database: string
const existing = () => ({ id: "p1", sku: "SKU-1", name: "Existing product", price: 100, stock: 5, revision: 7 })
function fixture() {
  return {
    users: [{ id: "admin-1", email: "admin@example.test", roleType: "ADMIN", isApproved: true, isBlocked: false }],
    products: [existing(), { id: "p2", sku: "SKU-2", name: "Other product", price: 10, stock: 3, revision: 2 }],
    categories: [], manufacturers: [], orders: [], repairs: [],
  }
}
function write(value: unknown) { fs.writeFileSync(database, JSON.stringify(value)) }
function read() { return JSON.parse(fs.readFileSync(database, "utf8")) }
function send(items: Record<string, unknown>[]) {
  return POST(new Request("http://localhost/api/products", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "IMPORT_WFMAG", items }),
  }))
}
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "celtronics-wfmag-"))
  database = path.join(directory, "db.json")
  vi.stubEnv("CELTRONICS_DB_PATH", database)
  vi.stubEnv("CELTRONICS_UPLOAD_ROOT", path.join(directory, "uploads"))
  vi.spyOn(fs, "appendFileSync").mockImplementation(() => {})
  write(fixture())
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  fs.rmSync(directory, { recursive: true, force: true })
})

describe("WF-Mag actual route and file-store revision fence", () => {
  it("returns 409 and preserves exact database bytes on stale staging", async () => {
    const before = fs.readFileSync(database)
    const response = await send([{ sku: "SKU-1", expectedRevision: 6, price: 120 }])
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: "PRODUCT_IMPORT_REVISION_CONFLICT" })
    expect(fs.readFileSync(database)).toEqual(before)
  })

  it("does not resurrect an existing target deleted after staging", async () => {
    const db = fixture()
    db.products = []
    write(db)
    const before = fs.readFileSync(database)
    const response = await send([{ sku: "SKU-1", name: "Existing product", expectedRevision: 7, price: 120 }])
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: "PRODUCT_IMPORT_TARGET_MISSING" })
    expect(fs.readFileSync(database)).toEqual(before)
  })

  it("does not overwrite a new target that appeared after staging", async () => {
    const before = fs.readFileSync(database)
    const response = await send([{ sku: " sku-1 ", name: "Other", price: 120 }])
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: "PRODUCT_IMPORT_TARGET_APPEARED" })
    expect(fs.readFileSync(database)).toEqual(before)
  })

  it("updates a fresh revision once and accepts exact replay after a lost response", async () => {
    const items = [{ sku: " sku-1 ", expectedRevision: 7, price: 120, stock: 6 }]
    expect((await send(items)).status).toBe(200)
    expect(read().products[0]).toMatchObject({ price: 120, stock: 6, revision: 8, name: "Existing product" })
    const saved = read().products
    expect((await send(items)).status).toBe(200)
    expect(read().products).toEqual(saved)
  })

  it("replays creation without duplicating the product or changing its identity", async () => {
    const items = [{ sku: "SKU-NEW", name: "New product", price: 25, stock: 2 }]
    const first = await send(items)
    expect(first.status).toBe(200)
    expect(await first.json()).toMatchObject({ addedCount: 1 })
    const saved = read().products
    const retry = await send(items)
    expect(retry.status).toBe(200)
    expect(await retry.json()).toMatchObject({ addedCount: 0, updatedCount: 1 })
    expect(read().products).toEqual(saved)
  })

  it("rolls back prior rows and manufacturer/category creation on a late conflict", async () => {
    const before = fs.readFileSync(database)
    const response = await send([
      { sku: "SKU-2", expectedRevision: 2, price: 20 },
      { sku: "SKU-1", expectedRevision: 6, price: 120, manufacturer: "NEW BRAND", isNewCategory: true, xlsCategoryName: "NEW CATEGORY" },
    ])
    expect(response.status).toBe(409)
    expect(fs.readFileSync(database)).toEqual(before)
  })

  it("serializes concurrent writers so only one conflicting update succeeds", async () => {
    const responses = await Promise.all([
      send([{ sku: "SKU-1", expectedRevision: 7, price: 120 }]),
      send([{ sku: "SKU-1", expectedRevision: 7, price: 130 }]),
    ])
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409])
    expect([120, 130]).toContain(read().products[0].price)
    expect(read().products[0].revision).toBe(8)
  })

  it("preserves reserved inventory during a valid update and its replay", async () => {
    const db = read()
    db.orders = [{ id: "order-1", items: [{ id: "p1", quantity: 1 }], inventoryReservationStatus: "RESERVED" }]
    write(db)
    const items = [{ sku: "SKU-1", expectedRevision: 7, price: 120, stock: 99 }]
    const first = await send(items)
    expect(first.status).toBe(200)
    expect(await first.json()).toMatchObject({ deferredStockCount: 1 })
    expect(read().products[0]).toMatchObject({ price: 120, stock: 5, revision: 8 })
    expect((await send(items)).status).toBe(200)
    expect(read().products[0]).toMatchObject({ stock: 5, revision: 8 })
  })

  it("rechecks current administrator access inside the real transaction", async () => {
    const db = fixture()
    db.users[0].isBlocked = true
    write(db)
    const before = fs.readFileSync(database)
    const response = await send([{ sku: "SKU-1", expectedRevision: 7, price: 120 }])
    expect(response.status).toBe(403)
    expect(fs.readFileSync(database)).toEqual(before)
  })
})
