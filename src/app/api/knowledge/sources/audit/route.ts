import fs from "fs"
import path from "path"
import { NextResponse } from "next/server"
import { authorizeAPI } from "@/lib/authUtils"
import {
  fenceKnowledgeOrphanDeletion,
  getKnowledge,
} from "@/lib/knowledge/parser"
import {
  KNOWLEDGE_UPLOAD_ROOT,
  UNREFERENCED_KNOWLEDGE_UPLOAD_RETENTION_MS,
  isSupportedKnowledgeUploadFilename,
  listKnowledgeUploadFiles,
  validateKnowledgeFilename,
} from "@/lib/knowledge/files"
import { auditKnowledgeSourceInvariants } from "@/lib/knowledge/invariants"

export const runtime = "nodejs"

async function readKnowledgeStorageAudit() {
  const store = await getKnowledge()
  const files = listKnowledgeUploadFiles()

  return {
    files,
    report: auditKnowledgeSourceInvariants({
      store,
      files,
      now: Date.now(),
      retentionMs: UNREFERENCED_KNOWLEDGE_UPLOAD_RETENTION_MS,
      isSupportedFilename: isSupportedKnowledgeUploadFilename,
    }),
  }
}

export async function GET() {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  try {
    const { report } = await readKnowledgeStorageAudit()
    return NextResponse.json(report)
  } catch (error) {
    console.error("Knowledge storage audit failed:", error)
    return NextResponse.json(
      { error: "Nie udało się sprawdzić spójności magazynu wiedzy." },
      { status: 500 }
    )
  }
}

export async function POST() {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  try {
    const initial = await readKnowledgeStorageAudit()
    const snapshots = new Map(
      initial.files.map((file) => [file.filename, file])
    )
    const removed: string[] = []
    const skippedReferenced: string[] = []
    const skippedChanged: string[] = []
    const failed: string[] = []
    const quarantined: string[] = []
    const trashRoot = path.join(KNOWLEDGE_UPLOAD_ROOT, ".reconcile-trash")

    for (const filename of initial.report.staleOrphans) {
      const fence = await fenceKnowledgeOrphanDeletion(
        filename,
        authCheck.user
      )
      if (!fence.allowed) {
        skippedReferenced.push(filename)
        continue
      }

      const snapshot = snapshots.get(filename)
      if (!snapshot) {
        skippedChanged.push(filename)
        continue
      }

      const { absolutePath } = validateKnowledgeFilename(filename)

      try {
        if (!fs.existsSync(absolutePath)) {
          removed.push(filename)
          continue
        }

        const current = fs.lstatSync(absolutePath)
        if (
          !current.isFile() ||
          current.size !== snapshot.size ||
          current.mtimeMs !== snapshot.mtimeMs ||
          Date.now() - current.mtimeMs <
            UNREFERENCED_KNOWLEDGE_UPLOAD_RETENTION_MS
        ) {
          skippedChanged.push(filename)
          continue
        }

        fs.mkdirSync(trashRoot, { recursive: true })
        const quarantinePath = path.join(
          trashRoot,
          `${fence.revision}-${encodeURIComponent(filename)}`
        )

        fs.renameSync(absolutePath, quarantinePath)
        try {
          fs.rmSync(quarantinePath, { force: true })
          removed.push(filename)
        } catch (cleanupError) {
          try {
            if (!fs.existsSync(absolutePath)) {
              fs.renameSync(quarantinePath, absolutePath)
            }
          } catch (rollbackError) {
            console.error(
              "Knowledge orphan quarantine rollback failed:",
              rollbackError
            )
            quarantined.push(filename)
          }

          console.error("Knowledge orphan cleanup failed:", cleanupError)
          failed.push(filename)
        }
      } catch (fileError) {
        const code =
          fileError &&
          typeof fileError === "object" &&
          "code" in fileError
            ? String((fileError as { code?: unknown }).code || "")
            : ""

        if (code === "ENOENT") {
          removed.push(filename)
        } else {
          console.error("Knowledge orphan reconciliation failed:", fileError)
          failed.push(filename)
        }
      }
    }

    try {
      fs.rmdirSync(trashRoot)
    } catch {
      // The directory may not exist or may intentionally contain a quarantined
      // file after a failed rollback. Never recursively remove it here.
    }

    const { report } = await readKnowledgeStorageAudit()
    const success = failed.length === 0 && quarantined.length === 0

    return NextResponse.json(
      {
        success,
        removed,
        skippedReferenced,
        skippedChanged,
        failed,
        quarantined,
        report,
      },
      { status: success ? 200 : 500 }
    )
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "KNOWLEDGE_ADMIN_ACCESS_REVOKED"
    ) {
      return NextResponse.json(
        {
          error:
            "Uprawnienia administratora zmieniły się podczas uzgadniania magazynu wiedzy.",
        },
        { status: 403 }
      )
    }

    console.error("Knowledge storage reconciliation failed:", error)
    return NextResponse.json(
      { error: "Nie udało się uzgodnić magazynu wiedzy." },
      { status: 500 }
    )
  }
}
