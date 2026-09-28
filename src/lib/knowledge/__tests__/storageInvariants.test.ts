import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"
import {
  buildKnowledgeFromDb,
  buildMergedKnowledgePersistence,
  fenceKnowledgeOrphanDeletionFromDb,
} from "@/lib/knowledge/parser"
import {
  auditKnowledgeSourceInvariants,
  knowledgeStoreReferencesSource,
} from "@/lib/knowledge/invariants"
import { isSupportedKnowledgeUploadFilename } from "@/lib/knowledge/files"

describe("knowledge storage invariants", () => {
  it("classifies dangling references and cleanup candidates without guessing", () => {
    const now = 1_800_000_000_000
    const report = auditKnowledgeSourceInvariants({
      store: {
        sources: ["present.pdf", "missing.pdf"],
        processedSources: ["present.pdf"],
        knowledge: {
          SKU: {
            specs: "Mixed provenance",
            price: 10,
            currency: "PLN",
            source: "present.pdf, secondary-missing.xlsx",
          },
        },
      },
      files: [
        { filename: "present.pdf", size: 10, mtimeMs: now - 100 },
        { filename: "fresh.pdf", size: 10, mtimeMs: now - 100 },
        { filename: "stale.xlsx", size: 10, mtimeMs: now - 10_000 },
        {
          filename: "legacy, ambiguous.pdf",
          size: 10,
          mtimeMs: now - 10_000,
        },
        { filename: "notes.txt", size: 10, mtimeMs: now - 10_000 },
      ],
      now,
      retentionMs: 1_000,
      isSupportedFilename: isSupportedKnowledgeUploadFilename,
    })

    expect(report.referencedSources).toEqual([
      "missing.pdf",
      "present.pdf",
      "secondary-missing.xlsx",
    ])
    expect(report.danglingReferences).toEqual([
      "missing.pdf",
      "secondary-missing.xlsx",
    ])
    expect(report.freshOrphans).toEqual(["fresh.pdf"])
    expect(report.staleOrphans).toEqual(["stale.xlsx"])
    expect(report.ambiguousLegacyFiles).toEqual([
      "legacy, ambiguous.pdf",
    ])
    expect(report.unsupportedFiles).toEqual(["notes.txt"])
    expect(report.manualInterventionRequired).toBe(true)
    expect(report.ok).toBe(false)
  })

  it("allows a fresh unreferenced upload without declaring the store broken", () => {
    const now = 1_800_000_000_000
    const report = auditKnowledgeSourceInvariants({
      store: {
        sources: [],
        processedSources: [],
        knowledge: {},
      },
      files: [
        { filename: "fresh.pdf", size: 10, mtimeMs: now - 100 },
      ],
      now,
      retentionMs: 1_000,
      isSupportedFilename: isSupportedKnowledgeUploadFilename,
    })

    expect(report.freshOrphans).toEqual(["fresh.pdf"])
    expect(report.staleOrphans).toEqual([])
    expect(report.manualInterventionRequired).toBe(false)
    expect(report.ok).toBe(true)
  })

  it("uses exact provenance tokens when checking whether a source is live", () => {
    const store = {
      sources: [],
      processedSources: [],
      knowledge: {
        SKU: {
          specs: "Source",
          price: 10,
          currency: "PLN",
          source: "catalog-old.pdf",
        },
      },
    }

    expect(knowledgeStoreReferencesSource(store, "catalog-old.pdf")).toBe(true)
    expect(knowledgeStoreReferencesSource(store, "catalog.pdf")).toBe(false)
  })

  it("fences orphan cleanup by advancing the knowledge revision", () => {
    const db = {
      products: [],
      knowledgeEntries: {},
      knowledgeMeta: {
        revision: 4,
        sources: [],
        processedSources: [],
        lastUpdated: "2026-09-28T10:00:00.000Z",
      },
    }

    const staleTraining = buildKnowledgeFromDb(db)
    const result = fenceKnowledgeOrphanDeletionFromDb(
      db,
      "orphan.pdf",
      "2026-09-28T11:00:00.000Z"
    )

    expect(result).toEqual({ allowed: true, revision: 5 })
    expect(db.knowledgeMeta.revision).toBe(5)
    expect(() =>
      buildMergedKnowledgePersistence(db, staleTraining)
    ).toThrow("KNOWLEDGE_STORE_RESET_DURING_TRAINING")
  })

  it("skips cleanup if the candidate became referenced before the durable fence", () => {
    const db = {
      products: [],
      knowledgeEntries: {},
      knowledgeMeta: {
        revision: 7,
        sources: ["orphan.pdf"],
        processedSources: [],
        lastUpdated: "2026-09-28T10:00:00.000Z",
      },
    }

    expect(
      fenceKnowledgeOrphanDeletionFromDb(db, "orphan.pdf")
    ).toEqual({
      allowed: false,
      revision: 7,
    })
    expect(db.knowledgeMeta.revision).toBe(7)
  })

  it("keeps the reconciler restricted to stale orphan candidates", () => {
    const route = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/app/api/knowledge/sources/audit/route.ts"
      ),
      "utf8"
    )

    const loop = route.indexOf(
      "for (const filename of initial.report.staleOrphans)"
    )
    const fence = route.indexOf("await fenceKnowledgeOrphanDeletion(")
    const quarantine = route.indexOf("fs.renameSync(absolutePath, quarantinePath)")

    expect(loop).toBeGreaterThan(-1)
    expect(fence).toBeGreaterThan(loop)
    expect(quarantine).toBeGreaterThan(fence)
    expect(route).toContain('path.join(KNOWLEDGE_UPLOAD_ROOT, ".reconcile-trash")')
    expect(route).toContain("skippedReferenced")
    expect(route).not.toContain("deleteKnowledgeSource(")
  })
})
