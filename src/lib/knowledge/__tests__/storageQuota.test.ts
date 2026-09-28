import fs from "fs"
import os from "os"
import path from "path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  MAX_KNOWLEDGE_UPLOAD_STORAGE_BYTES,
  MAX_KNOWLEDGE_UPLOAD_STORAGE_FILES,
  UNREFERENCED_KNOWLEDGE_UPLOAD_RETENTION_MS,
  KnowledgeUploadStorageQuotaError,
  prepareKnowledgeUploadStorage,
} from "@/lib/knowledge/files"

let tempDir = ""

function writeFile(name: string, content: string, mtimeMs: number) {
  const target = path.join(tempDir, name)
  fs.writeFileSync(target, content)
  const seconds = mtimeMs / 1000
  fs.utimesSync(target, seconds, seconds)
}

const emptyStore = {
  sources: [] as string[],
  processedSources: [] as string[],
  knowledge: {},
}

describe("knowledge upload storage quota", () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "knowledge-quota-"))
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it("keeps production storage ceilings bounded", () => {
    expect(MAX_KNOWLEDGE_UPLOAD_STORAGE_BYTES).toBe(250 * 1024 * 1024)
    expect(MAX_KNOWLEDGE_UPLOAD_STORAGE_FILES).toBe(100)
    expect(UNREFERENCED_KNOWLEDGE_UPLOAD_RETENTION_MS).toBe(
      30 * 24 * 60 * 60 * 1000
    )
  })

  it("prunes stale unreferenced uploads but never referenced sources", () => {
    const now = 1_800_000_000_000
    writeFile("referenced.pdf", "1234", now - 10_000)
    writeFile("stale.pdf", "5678", now - 10_000)

    const result = prepareKnowledgeUploadStorage({
      incomingFilename: "incoming.pdf",
      incomingBytes: 4,
      store: {
        ...emptyStore,
        sources: ["referenced.pdf"],
      },
      uploadRoot: tempDir,
      now,
      maxBytes: 12,
      maxFiles: 3,
      retentionMs: 1_000,
    })

    expect(result.removed).toEqual(["stale.pdf"])
    expect(fs.existsSync(path.join(tempDir, "stale.pdf"))).toBe(false)
    expect(fs.existsSync(path.join(tempDir, "referenced.pdf"))).toBe(true)
  })

  it("removes the oldest unreferenced upload under quota pressure", () => {
    const now = 1_800_000_000_000
    writeFile("older.pdf", "1234", now - 500)
    writeFile("newer.pdf", "5678", now - 100)

    const result = prepareKnowledgeUploadStorage({
      incomingFilename: "incoming.pdf",
      incomingBytes: 4,
      store: emptyStore,
      uploadRoot: tempDir,
      now,
      maxBytes: 20,
      maxFiles: 2,
      retentionMs: 1_000,
    })

    expect(result.removed).toEqual(["older.pdf"])
    expect(fs.existsSync(path.join(tempDir, "older.pdf"))).toBe(false)
    expect(fs.existsSync(path.join(tempDir, "newer.pdf"))).toBe(true)
  })

  it("fails closed when referenced files consume the storage budget", () => {
    const now = 1_800_000_000_000
    writeFile("referenced.pdf", "123456", now - 10_000)

    expect(() =>
      prepareKnowledgeUploadStorage({
        incomingFilename: "incoming.pdf",
        incomingBytes: 5,
        store: {
          ...emptyStore,
          processedSources: ["referenced.pdf"],
        },
        uploadRoot: tempDir,
        now,
        maxBytes: 10,
        maxFiles: 2,
        retentionMs: 1_000,
      })
    ).toThrow(KnowledgeUploadStorageQuotaError)

    expect(fs.existsSync(path.join(tempDir, "referenced.pdf"))).toBe(true)
  })

  it("does not delete an existing same-name upload to make replacement possible", () => {
    const now = 1_800_000_000_000
    writeFile("catalog.pdf", "123456", now - 10_000)

    expect(() =>
      prepareKnowledgeUploadStorage({
        incomingFilename: "catalog.pdf",
        incomingBytes: 5,
        store: emptyStore,
        uploadRoot: tempDir,
        now,
        maxBytes: 10,
        maxFiles: 2,
        retentionMs: 1_000,
      })
    ).toThrow(KnowledgeUploadStorageQuotaError)

    expect(fs.readFileSync(path.join(tempDir, "catalog.pdf"), "utf8")).toBe(
      "123456"
    )
  })

  it("enforces quota before the route performs the atomic upload write", () => {
    const route = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/knowledge/upload/route.ts"),
      "utf8"
    )
    const quotaCheck = route.indexOf("prepareKnowledgeUploadStorage({")
    const write = route.indexOf(
      'fs.writeFileSync(absolutePath, buffer, { flag: "wx" })'
    )

    expect(quotaCheck).toBeGreaterThan(-1)
    expect(write).toBeGreaterThan(quotaCheck)
    expect(route).toContain("error instanceof KnowledgeUploadStorageQuotaError")
    expect(route).toContain("{ status: 507 }")
  })
})
