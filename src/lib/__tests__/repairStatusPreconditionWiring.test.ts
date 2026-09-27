import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("repair status precondition wiring", () => {
  it("binds admin status changes to the status that was displayed", () => {
    const row = read(
      "src/app/admin/repairs/_components/RmaTableRow.tsx"
    )

    expect(row).toContain(
      "updateStatusAction(rma.id, status, rma.status)"
    )
  })

  it("checks the observed status before mutating a repair", () => {
    const actions = read("src/app/admin/repairs/_actions.ts")
    const start = actions.indexOf("export async function updateStatusAction")
    const flow = actions.slice(start)

    expect(flow).toContain("expectedStatus: string")
    expect(flow).toContain(
      "validateRepairStatusWrite(\n        repair.status,\n        expectedStatus,\n        status"
    )
    expect(flow).toContain('throw new Error("REPAIR_STATUS_CONFLICT")')
    expect(flow).toContain('if (write === "replay")')
    expect(flow.indexOf("validateRepairStatusWrite("))
      .toBeLessThan(flow.indexOf("repair.status = status as RepairStatus"))
  })

  it("returns an actionable stale-write conflict instead of overwriting newer state", () => {
    const actions = read("src/app/admin/repairs/_actions.ts")

    expect(actions).toContain("REPAIR_STATUS_CONFLICT")
    expect(actions).toContain(
      "Status zgłoszenia zmienił się od ostatniego odczytu."
    )
  })
})
