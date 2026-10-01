import assert from "node:assert/strict"
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../../", import.meta.url))
export const manifest = JSON.parse(fs.readFileSync(path.join(root, "src/data/catalog-retired-headings.json"), "utf8"))
export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex")
const normalizeSku = (value) => String(value ?? "").trim().toLowerCase()

// Explicit owner-approved identities, never a heuristic for blank descriptions.
export function planRemoval(db) {
  assert.equal(manifest.schemaVersion, 1)
  assert.equal(manifest.entries.length, 29)
  const ids = new Set(manifest.entries.map((entry) => entry.id))
  const skus = new Set(manifest.entries.map((entry) => normalizeSku(entry.sku)))
  assert.equal(ids.size, 29, "Duplicate manifest IDs")
  assert.equal(skus.size, 29, "Duplicate manifest SKUs")
  assert.ok(db && typeof db === "object" && Array.isArray(db.products), "Missing product array")
  assert.ok(db.products.every((product) => product && typeof product.id === "string"), "Invalid product identity")
  assert.equal(new Set(db.products.map((product) => product.id)).size, db.products.length, "Duplicate product IDs")
  const removed = db.products.filter((product) => ids.has(product.id))
  assert.ok(removed.length === 0 || removed.length === 29, "Partial removal or missing approved identities; review required")
  for (const product of removed) {
    const approved = manifest.entries.find((entry) => entry.id === product.id)
    assert.equal(product.sku, approved.sku, "Approved product identity changed")
    assert.equal(product.name, approved.sku, "Approved heading was edited into a product")
    assert.ok(["", "Parametry standardowe"].includes(product.specs), "Approved description changed")
  }
  const products = db.products.filter((product) => !ids.has(product.id))
  assert.ok(products.every((product) => !skus.has(normalizeSku(product.sku))), "Approved heading SKU reappeared under a different ID")
  const next = { ...db, products }
  const dependencies = []
  function inspect(value, location) {
    if (typeof value === "string") {
      if ([...ids].some((id) => value.includes(id))) dependencies.push(location)
      if (/\bsku$/i.test(location) && skus.has(normalizeSku(value))) dependencies.push(location)
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => inspect(item, `${location}[${index}]`))
    } else if (value && typeof value === "object") {
      for (const [key, item] of Object.entries(value)) {
        if ([...ids].some((id) => key.includes(id))) dependencies.push(`${location}.${key}`)
        inspect(item, `${location}.${key}`)
      }
    }
  }
  inspect(next, "db")
  assert.equal(dependencies.length, 0, `Referenced heading: ${dependencies.slice(0, 5).join(", ")}`)
  // Retained products and every non-product collection remain identical.
  assert.deepEqual(next.products, db.products.filter((product) => !ids.has(product.id)))
  const withoutProducts = ({ products: _products, ...other }) => other
  assert.deepEqual(withoutProducts(next), withoutProducts(db))
  return { next, removed }
}

export function main(args) {
  assert.ok(args.length <= 1 && [undefined, "--check", "--apply"].includes(args[0]), "Usage: node scripts/ci/catalog_heading_removal.mjs [--check|--apply]")
  const seed = path.join(root, "src/data/db.json")
  assert.equal(fs.realpathSync(seed), seed, "Seed must not be a symlink")
  const before = fs.readFileSync(seed)
  const db = JSON.parse(before.toString("utf8"))
  const { next, removed } = planRemoval(db)
  if (args[0] !== "--apply") {
    assert.equal(removed.length, 0, "29 retired headings remain in repository seed")
    console.log(`Catalog heading check PASS: ${db.products.length} products, no retired identities or dependencies`)
    return
  }
  assert.notEqual(process.env.NODE_ENV, "production", "Never apply this development-seed maintenance to production")
  if (removed.length === 0) {
    console.log("Catalog heading removal already applied; no writes")
    return
  }
  assert.equal(sha256(before), manifest.sourceSha256, "Seed changed since approval; refusing deletion")
  assert.equal(db.products.length, manifest.sourceProductCount)
  assert.equal(next.products.length, 397)
  const lockPath = `${seed}.lock`
  const lock = fs.openSync(lockPath, "wx", 0o600)
  let temporary
  try {
    assert.equal(sha256(fs.readFileSync(seed)), sha256(before), "Concurrent seed update")
    const backupDir = path.join(root, ".local/celtronics/catalog-removal")
    fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 })
    const backup = path.join(backupDir, `${sha256(before)}.json`)
    if (!fs.existsSync(backup)) fs.writeFileSync(backup, before, { flag: "wx", mode: 0o600 })
    assert.equal(sha256(fs.readFileSync(backup)), sha256(before), "Backup verification failed")
    const after = Buffer.from(`${JSON.stringify(next, null, 2)}\n`)
    temporary = `${seed}.${crypto.randomUUID()}.tmp`
    const file = fs.openSync(temporary, "wx", 0o600)
    try {
      fs.writeFileSync(file, after)
      fs.fsyncSync(file)
    } finally { fs.closeSync(file) }
    assert.equal(sha256(fs.readFileSync(seed)), sha256(before), "Concurrent seed update before rename")
    fs.renameSync(temporary, seed)
    temporary = undefined
    assert.equal(sha256(fs.readFileSync(seed)), sha256(after))
    const report = {
      schemaVersion: 1, scope: "repository development seed only; no live database migration",
      sourceCommit: manifest.sourceCommit, sourceSha256: sha256(before), targetSha256: sha256(after),
      before: db.products.length, removed: removed.length, after: next.products.length,
      retainedProductsChanged: 0, nonProductCollectionsChanged: 0, danglingReferences: 0,
      backupVerified: true, entries: removed.map(({ id, sku }) => ({ id, sku })),
    }
    const reportDir = path.join(root, "artifacts/catalog-removal")
    fs.mkdirSync(reportDir, { recursive: true })
    fs.writeFileSync(path.join(reportDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`)
    fs.writeFileSync(path.join(reportDir, "removed-records.json"), `${JSON.stringify(removed, null, 2)}\n`)
    console.log(JSON.stringify(report, null, 2))
  } finally {
    if (temporary && fs.existsSync(temporary)) fs.unlinkSync(temporary)
    fs.closeSync(lock)
    fs.unlinkSync(lockPath)
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)) } catch (error) {
    console.error(error instanceof Error ? error.message : "Catalog removal failed")
    process.exitCode = 1
  }
}
