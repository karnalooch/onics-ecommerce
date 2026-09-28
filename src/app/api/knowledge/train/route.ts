import fs from "fs"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import { checkAdminCostLimit } from "@/lib/adminCostRateLimit"
import {
  CommerceBodyInvalidError,
  CommerceBodyTooLargeError,
  readCommerceJson,
} from "@/lib/commerceIngress"
import {
  bindKnowledgeTrainingRequestAbort,
  getKnowledge,
  parseExcel,
  parsePDFWithAI,
  throwIfKnowledgeTrainingAborted,
} from "@/lib/knowledge/parser"
import {
  MAX_KNOWLEDGE_UPLOAD_BYTES,
  validateKnowledgeFilename,
} from "@/lib/knowledge/files"

export const runtime = "nodejs"

const KNOWLEDGE_TRAIN_MAX_BODY_BYTES = 16 * 1024

const RequestSchema = z.object({
  filename: z.string().min(1).max(255),
  apiKey: z.string().max(512).optional().default(""),
  modelId: z.string().trim().max(120).optional().default("internal-v9"),
})

export async function POST(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const costLimit = checkAdminCostLimit("knowledge-training", authCheck.user)
  if (!costLimit.allowed) {
    return NextResponse.json(
      { error: "Limit analiz został wyczerpany. Spróbuj ponownie później." },
      {
        status: 429,
        headers: { "Retry-After": String(costLimit.retryAfterSeconds) },
      }
    )
  }

  try {
    const parsed = RequestSchema.safeParse(
      await readCommerceJson(req, KNOWLEDGE_TRAIN_MAX_BODY_BYTES)
    )
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Nieprawidłowe dane." },
        { status: 400 }
      )
    }

    const fileInfo = validateKnowledgeFilename(parsed.data.filename)
    if (!fs.existsSync(fileInfo.absolutePath)) {
      return NextResponse.json({ error: "Plik nie istnieje." }, { status: 404 })
    }

    const fileStats = fs.statSync(fileInfo.absolutePath)
    if (
      !fileStats.isFile() ||
      fileStats.size <= 0 ||
      fileStats.size > MAX_KNOWLEDGE_UPLOAD_BYTES
    ) {
      return NextResponse.json(
        { error: "Plik jest pusty albo przekracza limit 25 MB." },
        { status: 413 }
      )
    }

    const buffer = fs.readFileSync(fileInfo.absolutePath)
    const knowledgeRevision = (await getKnowledge()).revision ?? 0
    const knowledgeSignal = {
      aborted: false,
      knowledgeRevision,
      actor: authCheck.user,
    }
    const detachRequestAbort = bindKnowledgeTrainingRequestAbort(
      knowledgeSignal,
      req.signal
    )

    try {
      throwIfKnowledgeTrainingAborted(knowledgeSignal)

      const result = [".xlsx", ".xls", ".xlsm"].includes(fileInfo.extension)
        ? await parseExcel(buffer, fileInfo.filename, undefined, {
            apiKey: parsed.data.apiKey,
            modelId: parsed.data.modelId,
            signal: knowledgeSignal,
          })
        : await parsePDFWithAI(
            buffer,
            fileInfo.filename,
            parsed.data.apiKey || undefined,
            parsed.data.modelId,
            [],
            undefined,
            knowledgeSignal
          )

      return NextResponse.json({
        success: true,
        count: result.count,
        stats: result.stats,
        message: `Przetworzono plik ${fileInfo.filename}.`,
      })
    } finally {
      detachRequestAbort()
    }
  } catch (error) {
    if (error instanceof CommerceBodyTooLargeError) {
      return NextResponse.json(
        { error: "Żądanie analizy jest zbyt duże." },
        { status: 413 }
      )
    }
    if (error instanceof CommerceBodyInvalidError) {
      return NextResponse.json(
        { error: "Nieprawidłowe żądanie analizy." },
        { status: 400 }
      )
    }

    console.error("Knowledge training error:", error)
    if (
      error instanceof Error &&
      error.message === "KNOWLEDGE_ADMIN_ACCESS_REVOKED"
    ) {
      return NextResponse.json(
        {
          error:
            "Uprawnienia administratora zmieniły się podczas analizy. Zapis został anulowany.",
        },
        { status: 403 }
      )
    }
    if (
      error instanceof Error &&
      error.message === "KNOWLEDGE_STORE_RESET_DURING_TRAINING"
    ) {
      return NextResponse.json(
        {
          error:
            "Baza wiedzy została wyczyszczona podczas analizy. Uruchom analizę ponownie.",
        },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd analizy." },
      { status: 500 }
    )
  }
}
