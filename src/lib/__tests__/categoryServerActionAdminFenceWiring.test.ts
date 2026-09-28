import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function readActions() {
  return fs.readFileSync(
    path.join(process.cwd(), "src/app/admin/categories/_actions.ts"),
    "utf8"
  )
}

describe("category server-action current-admin fencing", () => {
  it("rechecks current admin access in every category mutation", () => {
    const actions = readActions()
    const mutations = actions.match(/mutateMockData\(\(db\) =>/g) || []
    const fences =
      actions.match(
        /assertCurrentAdminAccess\(db\.users as StoredActor\[\], access\.actor\)/g
      ) || []

    expect(mutations).toHaveLength(6)
    expect(fences).toHaveLength(mutations.length)
    expect(actions).toContain('throw new Error("ADMIN_ACCESS_REVOKED")')
    expect(actions).toContain("currentAdminActionError(error)")
  })

  it("carries the freshly authorized actor into the locked write", () => {
    const actions = readActions()

    expect(actions).toContain("actor: authCheck.user")
    expect(actions).toContain("if (!access.authorized)")
    expect(actions).toContain(
      'hasAccountRoleAccess(currentActor, ["ADMIN"])'
    )
  })
})
