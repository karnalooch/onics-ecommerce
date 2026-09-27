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
})
