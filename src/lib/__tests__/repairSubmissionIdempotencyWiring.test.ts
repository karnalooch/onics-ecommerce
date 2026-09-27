import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("repair submission idempotency wiring", () => {
  it("checks account-scoped replay before creating a customer RMA", () => {
    const route = read("src/app/api/repairs/route.ts")

    expect(route).toContain("requestId: z.string().uuid()")
    expect(route).toContain(
      'repair.repairSubmissionChannel === "ACCOUNT_API"'
    )
    expect(route).toContain(
      "repair.clientRepairRequestId === parsed.data.requestId"
    )
    expect(route).toContain(
      "existing.clientRepairRequestFingerprint !== requestFingerprint"
    )
    expect(route).toContain(
      "Boolean(findStoredUserBySession([repair.user], sessionUser))"
    )
    expect(
      route.indexOf(
        "repair.clientRepairRequestId === parsed.data.requestId"
      )
    ).toBeLessThan(route.indexOf("repairs.unshift(nextRepair)"))
    expect(route).toContain('"Idempotency-Replayed": "true"')
  })

  it("keeps customer-facing repair responses free of replay metadata", () => {
    const route = read("src/app/api/repairs/route.ts")

    expect(route).toContain(
      "clientRepairRequestFingerprint: internalRequestFingerprint"
    )
    expect(route).toContain(
      "repairSubmissionChannel: internalSubmissionChannel"
    )
    expect(route).toContain("repairStore.map(publicRepair)")
    expect(route).toContain(".map(publicRepair)")
  })

  it("reuses an admin request id only while the form payload is unchanged", () => {
    const form = read(
      "src/app/admin/repairs/_components/RmaAddForm.tsx"
    )

    expect(form).toContain(
      "submissionRef.current?.signature !== submissionSignature"
    )
    expect(form).toContain("requestId: crypto.randomUUID()")
    expect(form).toContain(
      'formData.set("requestId", submissionRef.current.requestId)'
    )
  })

  it("checks admin replay before inserting a second RMA", () => {
    const actions = read("src/app/admin/repairs/_actions.ts")

    expect(actions).toContain(
      'repair.repairSubmissionChannel === "ADMIN_ACTION"'
    )
    expect(actions).toContain(
      "repair.clientRepairRequestId === validated.data.requestId"
    )
    expect(actions).toContain(
      "existing.clientRepairRequestFingerprint !== requestFingerprint"
    )
    expect(
      actions.indexOf(
        "repair.clientRepairRequestId === validated.data.requestId"
      )
    ).toBeLessThan(actions.indexOf("repairs.unshift(repair)"))
    expect(actions).toContain("REPAIR_IDEMPOTENCY_KEY_REUSED")
  })
})
