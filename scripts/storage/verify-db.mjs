import { readValidatedJson, resolveDbPath, sha256 } from "./db-file-utils.mjs"

const dbPath = resolveDbPath()
const contents = readValidatedJson(dbPath)
const parsed = JSON.parse(contents.toString("utf-8"))

console.log(JSON.stringify({
  ok: true,
  path: dbPath,
  bytes: contents.length,
  sha256: sha256(contents),
  counts: {
    users: Array.isArray(parsed.users) ? parsed.users.length : null,
    orders: Array.isArray(parsed.orders) ? parsed.orders.length : null,
    products: Array.isArray(parsed.products) ? parsed.products.length : null,
    repairs: Array.isArray(parsed.repairs) ? parsed.repairs.length : null,
  },
}))
