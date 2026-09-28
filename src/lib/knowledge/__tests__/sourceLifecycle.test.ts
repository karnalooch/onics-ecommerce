import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"
import {
  buildKnowledgeFromDb,
  buildMergedKnowledgePersistence,
  deleteKnowledgeSourceFromDb,
} from "@/lib/knowledge/parser"
import {
  knowledgeSourceProvenanceIncludes,
  mergeKnowledgeSourceProvenance,
} from "@/lib/knowledge/provenance"
import { validateKnowledgeFilename } from "@/lib/knowledge/files"

describe("knowledge source lifecycle", () => {
  it("matches provenance by exact source token, not substring", () => {
    expect(
      knowledgeSourceProvenanceIncludes(
        "vendor-old.pdf, vendor.pdf",
        "vendor.pdf"
      )
    ).toBe(true)
    expect(
      knowledgeSourceProvenanceIncludes(
        "vendor-old.pdf",
        "vendor.pdf"
      )
    ).toBe(false)
  })

  it("deduplicates provenance by exact token", () => {
    expect(
      mergeKnowledgeSourceProvenance(
        "catalog-old.pdf",
        "catalog.pdf"
      )
    ).toBe("catalog-old.pdf, catalog.pdf")
    expect(
      mergeKnowledgeSourceProvenance(
        "catalog.pdf, other.xlsx",
        "catalog.pdf"
      )
    ).toBe("catalog.pdf, other.xlsx")
  })

  it("rejects new filenames that make provenance serialization ambiguous", () => {
    expect(() =>
      validateKnowledgeFilename("vendor, stale.pdf")
    ).toThrow(/Nieprawidłowa nazwa pliku/)
  })

  it("removes all knowledge entries derived from the deleted source", () => {
    const db = {
      products: [],
      knowledgeEntries: {
        ONLY: {
          specs: "Only target",
          price: 10,
          currency: "PLN",
          source: "target.pdf",
        },
        MIXED: {
          specs: "Merged knowledge",
          price: 20,
          currency: "PLN",
          source: "other.xlsx, target.pdf",
        },
        KEEP: {
          specs: "Keep",
          price: 30,
          currency: "PLN",
          source: "target-old.pdf",
        },
      },
      knowledgeMeta: {
        revision: 4,
        sources: ["target.pdf", "other.xlsx"],
        processedSources: ["target.pdf"],
        lastUpdated: "2026-09-28T10:00:00.000Z",
      },
    }

    const result = deleteKnowledgeSourceFromDb(
      db,
      "target.pdf",
      "2026-09-28T11:00:00.000Z"
    )

    expect(result).toEqual({
      removedEntries: 2,
      removedMetadataReferences: 2,
      revision: 5,
    })
    expect(db.knowledgeEntries).toEqual({
      KEEP: expect.objectContaining({ source: "target-old.pdf" }),
    })
    expect(db.knowledgeMeta).toEqual({
      revision: 5,
      sources: ["other.xlsx"],
      processedSources: [],
      lastUpdated: "2026-09-28T11:00:00.000Z",
    })
  })

  it("advances the revision even for an orphan-only delete request", () => {
    const db = {
      products: [],
      knowledgeEntries: {},
      knowledgeMeta: {
        revision: 9,
        sources: [],
        processedSources: [],
        lastUpdated: "2026-09-28T10:00:00.000Z",
      },
    }

    expect(
      deleteKnowledgeSourceFromDb(db, "orphan.pdf")
    ).toMatchObject({
      removedEntries: 0,
      removedMetadataReferences: 0,
      revision: 10,
    })
    expect(db.knowledgeMeta?.revision).toBe(10)
  })

  it("prevents stale training from resurrecting a deleted source", () => {
    const db = {
      products: [],
      knowledgeEntries: {
        SKU: {
          specs: "Target source data",
          price: 10,
          currency: "PLN",
          source: "target.pdf",
        },
      },
      knowledgeMeta: {
        revision: 2,
        sources: ["target.pdf"],
        processedSources: ["target.pdf"],
        lastUpdated: "2026-09-28T10:00:00.000Z",
      },
    }

    const staleTraining = buildKnowledgeFromDb(db)
    deleteKnowledgeSourceFromDb(db, "target.pdf")

    expect(() =>
      buildMergedKnowledgePersistence(db, staleTraining)
    ).toThrow("KNOWLEDGE_STORE_RESET_DURING_TRAINING")
  })

  it("commits the DB detach before attempting physical file deletion", () => {
    const route = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/app/api/knowledge/sources/[filename]/route.ts"
      ),
      "utf8"
    )

    const dbDetach = route.indexOf("await deleteKnowledgeSource(")
    const fileDelete = route.indexOf("fs.rmSync(absolutePath")

    expect(dbDetach).toBeGreaterThan(-1)
    expect(fileDelete).toBeGreaterThan(dbDetach)
    expect(route).toContain("retryable: true")
  })
})
