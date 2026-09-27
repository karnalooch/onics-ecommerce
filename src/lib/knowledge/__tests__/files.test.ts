import path from "path"
import { describe, expect, it } from "vitest"
import {
  canSafelyRemoveFailedKnowledgeUpload,
  knowledgeStoreReferencesUpload,
  resolveKnowledgeUploadRoot,
} from "@/lib/knowledge/files"

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

  it("retains failed uploads that are already referenced by knowledge persistence", () => {
    const store = {
      sources: [],
      processedSources: [],
      lastUpdated: "2026-09-27T21:30:00.000Z",
      knowledge: {
        "SKU-1": {
          specs: "Persisted before the upload failed",
          price: 10,
          currency: "PLN",
          source: "older.pdf, catalog.pdf",
        },
      },
    }

    expect(knowledgeStoreReferencesUpload(store, "catalog.pdf")).toBe(true)
    expect(knowledgeStoreReferencesUpload(store, "missing.pdf")).toBe(false)
  })

  it("treats source metadata as a persisted upload reference", () => {
    const store = {
      sources: ["catalog.xlsx"],
      processedSources: [],
      lastUpdated: "2026-09-27T21:30:00.000Z",
      knowledge: {},
    }

    expect(knowledgeStoreReferencesUpload(store, "catalog.xlsx")).toBe(true)
  })

  it("removes only definitely unreferenced failed uploads", async () => {
    const unreferencedStore = {
      sources: [],
      processedSources: [],
      lastUpdated: "2026-09-27T21:30:00.000Z",
      knowledge: {},
    }

    await expect(
      canSafelyRemoveFailedKnowledgeUpload(
        "catalog.pdf",
        async () => unreferencedStore
      )
    ).resolves.toBe(true)

    await expect(
      canSafelyRemoveFailedKnowledgeUpload("catalog.pdf", async () => {
        throw new Error("STORE_UNAVAILABLE")
      })
    ).resolves.toBe(false)
  })
})
