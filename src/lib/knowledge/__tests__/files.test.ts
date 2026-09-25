import path from "path"
import { describe, expect, it } from "vitest"
import { resolveKnowledgeUploadRoot } from "@/lib/knowledge/files"

describe("knowledge upload storage", () => {
  it("keeps the development fallback outside public assets", () => {
    const cwd = process.cwd()
    const uploadRoot = resolveKnowledgeUploadRoot({
      configuredPath: null,
      nodeEnv: "development",
      cwd,
    })

    expect(uploadRoot).toBe(
      path.resolve(cwd, ".local", "celtronics", "uploads")
    )
    expect(uploadRoot.startsWith(path.resolve(cwd, "public") + path.sep)).toBe(
      false
    )
  })

  it("rejects a production upload root inside public assets", () => {
    const cwd = process.cwd()

    expect(() =>
      resolveKnowledgeUploadRoot({
        configuredPath: path.resolve(cwd, "public", "uploads", "catalogs"),
        nodeEnv: "production",
        cwd,
      })
    ).toThrow(/public\//)
  })

  it("accepts a durable private production upload root", () => {
    const cwd = process.cwd()
    const configuredPath = path.resolve(cwd, "var", "celtronics", "uploads")

    expect(
      resolveKnowledgeUploadRoot({
        configuredPath,
        nodeEnv: "production",
        cwd,
      })
    ).toBe(configuredPath)
  })
})
