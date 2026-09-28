import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("user revision fencing", () => {
  it("initializes new accounts and publishes normalized revisions", () => {
    const register = read("src/app/api/register/route.ts")
    const users = read("src/app/api/users/route.ts")

    expect(register).toContain("revision: 0")
    expect(users).toContain("revision: userRevision(user.revision)")
  })

  it("fences admin updates and destructive deletes by revision", () => {
    const users = read("src/app/api/users/route.ts")
    const putStart = users.indexOf("export async function PUT")
    const deleteStart = users.indexOf("export async function DELETE", putStart)
    const put = users.slice(putStart, deleteStart)
    const remove = users.slice(deleteStart)

    expect(put).toContain("parsed.data.expectedRevision === undefined")
    expect(put).toContain("expectedRevision !== currentRevision")
    expect(put).toContain("isUserUpdateReplay(current, updates)")
    expect(put).toContain("revision: nextUserRevision(currentRevision)")
    expect(put).toContain('"Idempotency-Replayed": "true"')
    expect(put.indexOf("expectedRevision !== currentRevision"))
      .toBeLessThan(put.indexOf("userStore[index] = nextUser"))

    expect(remove).toContain('url.searchParams.get("expectedRevision")')
    expect(remove).toContain(
      "userRevision(current.revision) !== parsedRevision.data"
    )
    expect(remove).toContain('throw new Error("USER_REVISION_CONFLICT")')
  })

  it("binds B2B profile writes to the revision observed by the client", () => {
    const route = read("src/app/api/profile/route.ts")
    const page = read("src/app/(b2b)/ustawienia/page.tsx")

    expect(route).toContain("revision: userRevision(user.revision)")
    expect(route).toContain("parsed.data.expectedRevision === undefined")
    expect(route).toContain(
      "parsed.data.expectedRevision !== currentRevision"
    )
    expect(route).toContain(
      "user.revision = nextUserRevision(currentRevision)"
    )
    const mutation = route.indexOf("mutateMockData((db) =>")
    const currentAccessFence = route.indexOf(
      'hasAccountRoleAccess(user, ["BIZ"])',
      mutation
    )
    const write = route.indexOf("user.phone = parsed.data.phone", currentAccessFence)
    expect(mutation).toBeGreaterThan(-1)
    expect(currentAccessFence).toBeGreaterThan(mutation)
    expect(write).toBeGreaterThan(currentAccessFence)
    expect(route).toContain('throw new Error("PROFILE_ACCESS_REVOKED")')
    expect(page).toContain("expectedRevision: profile?.revision ?? 0")
    expect(page).toContain(
      "revision: Number(data.revision ?? current.revision)"
    )
  })

  it("fences admin discount changes and sends the displayed revision", () => {
    const route = read("src/app/api/users/discount/route.ts")
    const page = read("src/app/admin/clients/page.tsx")

    expect(route).toContain("parsed.data.expectedRevision === undefined")
    expect(route).toContain(
      "parsed.data.expectedRevision !== currentRevision"
    )
    expect(route).toContain(
      "current.revision = nextUserRevision(currentRevision)"
    )
    expect(page).toContain(
      "expectedRevision: Number(selectedUser.revision ?? 0)"
    )
    expect(page).toContain(
      "expectedRevision: Number(user.revision ?? 0)"
    )
    expect(page).toContain("&expectedRevision=")
  })

  it("binds dashboard quick actions to the revision shown to the admin", () => {
    const actions = read("src/app/admin/AdminActions.tsx")
    const dashboard = read("src/app/admin/page.tsx")

    expect(actions).toContain("userRevision?: number")
    expect(actions).toContain("expectedRevision: userRevision")
    expect(actions).toContain("&expectedRevision=${encodeURIComponent(userRevision)}")
    expect(
      dashboard.match(/userRevision=\{Number\(user\.revision \?\? 0\)\}/g)
    ).toHaveLength(2)
  })
  it("advances revision when the bootstrap password seals", () => {
    const bootstrap = read("src/lib/adminBootstrap.ts")

    expect(bootstrap).toContain(
      "user.revision = nextUserRevision(user.revision)"
    )
  })
})
