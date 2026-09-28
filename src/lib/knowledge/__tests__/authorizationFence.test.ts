import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("knowledge training authorization fence wiring", () => {
  it("binds every production training signal to the authenticated admin", () => {
    for (const route of [
      "src/app/api/knowledge/upload/route.ts",
      "src/app/api/knowledge/train/route.ts",
      "src/app/api/knowledge/train/stream/route.ts",
    ]) {
      expect(read(route)).toContain("actor: authCheck.user")
    }
  })

  it("keeps upload finalization inside the same authorization fence", () => {
    expect(read("src/app/api/knowledge/upload/route.ts")).toContain(
      "await saveKnowledge(store, knowledgeSignal)"
    )
  })

  it("checks current admin access inside persistence before merging knowledge", () => {
    const parser = read("src/lib/knowledge/parser.ts")
    const writeStart = parser.indexOf("export async function saveKnowledge")
    const writeFlow = parser.slice(writeStart)

    expect(writeFlow).toContain("assertKnowledgeTrainingAdminAccess(")
    expect(writeFlow.indexOf("assertKnowledgeTrainingAdminAccess(")).toBeLessThan(
      writeFlow.indexOf("buildMergedKnowledgePersistence(")
    )
    expect(parser).toContain('"KNOWLEDGE_ADMIN_ACCESS_REVOKED"')
  })

  it("rechecks current admin access inside single-snippet deletion", () => {
    const route = read("src/app/api/knowledge/snippets/[model]/route.ts")
    const parser = read("src/lib/knowledge/parser.ts")
    const deleteStart = parser.indexOf(
      "export async function deleteKnowledgeEntry("
    )
    const deleteFlow = parser.slice(
      deleteStart,
      parser.indexOf("function latestKnowledgeTimestamp", deleteStart)
    )

    expect(route).toContain("authCheck.user")
    expect(route).toContain("KNOWLEDGE_ADMIN_ACCESS_REVOKED")
    expect(deleteFlow).toContain("assertKnowledgeTrainingAdminAccess(")
    expect(deleteFlow.indexOf("assertKnowledgeTrainingAdminAccess("))
      .toBeLessThan(deleteFlow.indexOf("deleteKnowledgeEntryFromDb("))
  })

  it("rechecks current admin access before destructive knowledge reset", () => {
    const route = read("src/app/api/knowledge/route.ts")
    const deleteStart = route.indexOf("export async function DELETE")
    const remove = route.slice(deleteStart)
    const mutation = remove.indexOf("mutateMockData((db) =>")
    const currentAdminFence = remove.indexOf(
      'hasAccountRoleAccess(currentActor, ["ADMIN"])',
      mutation
    )
    const destructiveWrite = remove.indexOf(
      "db.knowledgeEntries = {}",
      currentAdminFence
    )

    expect(deleteStart).toBeGreaterThan(-1)
    expect(mutation).toBeGreaterThan(-1)
    expect(currentAdminFence).toBeGreaterThan(mutation)
    expect(destructiveWrite).toBeGreaterThan(currentAdminFence)
    expect(remove).toContain('throw new Error("KNOWLEDGE_ADMIN_ACCESS_REVOKED")')
  })

  it("treats an already-absent extracted snippet as a safe delete replay", () => {
    const route = read("src/app/api/knowledge/snippets/[model]/route.ts")
    const parser = read("src/lib/knowledge/parser.ts")
    const deleteStart = parser.indexOf(
      "export function deleteKnowledgeEntryFromDb("
    )
    const deleteFlow = parser.slice(
      deleteStart,
      parser.indexOf("export async function deleteKnowledgeEntry(", deleteStart)
    )

    expect(route).toContain("if (!deleted)")
    expect(route).toContain('"Idempotency-Replayed": "true"')
    expect(route).not.toContain('{ status: 404 }')
    expect(deleteFlow).toContain("if (!persistedKey) return false")
    expect(deleteFlow.indexOf("if (!persistedKey) return false"))
      .toBeLessThan(deleteFlow.indexOf("db.knowledgeEntries = nextEntries"))
  })

  it("binds upload parsing to the HTTP request lifetime and always detaches", () => {
    const upload = read("src/app/api/knowledge/upload/route.ts")

    expect(upload).toContain("bindKnowledgeTrainingRequestAbort(")
    expect(upload).toContain("req.signal")
    expect(upload).toContain("detachRequestAbort?.()")
    expect(upload).toContain('message === "PROCES_PRZERWANY"')
  })
})
