import assert from "node:assert/strict"
import { test } from "node:test"
import { manifest, planRemoval } from "./catalog_heading_removal.mjs"

function fixture() {
  return {
    users: [{ id: "user-1" }], orders: [], categories: [{ id: "category-1", name: "INTEGRA" }],
    products: [
      ...manifest.entries.map(({ id, sku }) => ({ id, sku, name: sku, specs: "", price: 0, stock: 0 })),
      { id: "real-1", sku: "INTEGRA-128-PLUS", name: "Real product", specs: "", price: 123, stock: 5, revision: 4 },
    ],
  }
}

test("removes exactly 29 identities without mutating input or retained records", () => {
  const db = fixture(), original = structuredClone(db)
  const { next, removed } = planRemoval(db)
  assert.equal(removed.length, 29)
  assert.deepEqual(next.products, [original.products.at(-1)])
  assert.deepEqual(next.users, original.users)
  assert.deepEqual(next.categories, original.categories)
  assert.deepEqual(db, original)
})
test("replay is an unchanged no-op", () => {
  const { next } = planRemoval(fixture())
  assert.deepEqual(planRemoval(next), { next, removed: [] })
})
for (const [label, change] of [
  ["partial removal", (db) => db.products.shift()],
  ["changed SKU", (db) => { db.products[0].sku = "REAL-SKU" }],
  ["changed name", (db) => { db.products[0].name = "Actual product" }],
  ["changed description", (db) => { db.products[0].specs = "24 V" }],
  ["duplicate product ID", (db) => db.products.push({ ...db.products[0] })],
  ["same SKU with new ID", (db) => db.products.push({ ...db.products[0], id: "new-heading-id" })],
  ["order dependency", (db) => db.orders.push({ items: [{ productId: manifest.entries[0].id }] })],
  ["SKU order dependency", (db) => db.orders.push({ items: [{ sku: manifest.entries[0].sku }] })],
  ["unknown collection dependency", (db) => { db.newFeature = { [manifest.entries[0].id]: true } }],
  ["retained product dependency", (db) => { db.products.at(-1).relatedId = manifest.entries[0].id }],
]) test(`fails closed: ${label}`, () => {
  const db = fixture()
  change(db)
  const original = structuredClone(db)
  assert.throws(() => planRemoval(db))
  assert.deepEqual(db, original)
})
test("a real product with a blank description is kept", () => {
  assert.equal(planRemoval(fixture()).next.products[0].sku, "INTEGRA-128-PLUS")
})
test("legacy placeholder description is recognized only for approved IDs", () => {
  const db = fixture()
  db.products[0].specs = "Parametry standardowe"
  assert.equal(planRemoval(db).removed.length, 29)
})
test("invalid database fails closed", () => {
  for (const db of [null, {}, { products: null }, { products: [null] }]) assert.throws(() => planRemoval(db))
})
