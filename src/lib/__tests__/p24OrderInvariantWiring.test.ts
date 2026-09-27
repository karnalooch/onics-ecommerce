import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("Przelewy24 order invariant wiring", () => {
  it("checks P24 status safety before inventory mutation and persistence", () => {
    const route = read("src/app/api/orders/route.ts")
    const putStart = route.indexOf("export async function PUT")
    const flow = route.slice(putStart)

    const p24Guard = flow.indexOf(
      "validatePrzelewy24OrderStatusTransition("
    )
    const inventoryWrite = flow.indexOf("applyOrderInventoryTransition(")
    const persist = flow.indexOf("orderStore[index] = nextOrder")

    expect(p24Guard).toBeGreaterThan(-1)
    expect(p24Guard).toBeLessThan(inventoryWrite)
    expect(p24Guard).toBeLessThan(persist)
  })

  it("keeps item immutability on the same admin write path", () => {
    const route = read("src/app/api/orders/route.ts")
    const putStart = route.indexOf("export async function PUT")
    const flow = route.slice(putStart)

    expect(flow).toContain("canReplacePaymentOrderItems(")
    expect(flow.indexOf("canReplacePaymentOrderItems("))
      .toBeLessThan(flow.indexOf("applyOrderInventoryTransition("))
  })
})
