import { NextResponse } from "next/server"
import fs from "fs"
import {
  bindKnowledgeTrainingRequestAbort,
  getKnowledge,
  parseExcel,
  parsePDFWithAI,
  saveKnowledge,
} from "@/lib/knowledge/parser"
import { authorizeAPI } from "@/lib/authUtils"
import { checkAdminCostLimit } from "@/lib/adminCostRateLimit"
import {
  KNOWLEDGE_UPLOAD_ROOT,
  MAX_KNOWLEDGE_UPLOAD_BYTES,
  canSafelyRemoveFailedKnowledgeUpload,
  validateKnowledgeFilename,
} from "@/lib/knowledge/files"
import {
  KnowledgeUploadBodyInvalidError,
  KnowledgeUploadBodyTooLargeError,
  parseBoundedKnowledgeUploadFormData,
} from "@/lib/knowledge/uploadIngress"

export const runtime = "nodejs"

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

  let detachRequestAbort: (() => void) | undefined

  try {
    const formData = await parseBoundedKnowledgeUploadFormData(req)
    const file = formData.get("file")
    const transientApiKey = String(formData.get("apiKey") || "").trim()

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Nie wybrano pliku." }, { status: 400 })
    }

    if (file.size <= 0 || file.size > MAX_KNOWLEDGE_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Plik jest pusty albo przekracza limit 25 MB." },
        { status: 413 }
      )
    }

    const { filename, extension, absolutePath } = validateKnowledgeFilename(file.name)
    const buffer = Buffer.from(await file.arrayBuffer())
    const knowledgeRevision = (await getKnowledge()).revision ?? 0
    const knowledgeSignal = {
      aborted: false,
      knowledgeRevision,
      actor: authCheck.user,
    }
    detachRequestAbort = bindKnowledgeTrainingRequestAbort(
      knowledgeSignal,
      req.signal
    )

    fs.mkdirSync(KNOWLEDGE_UPLOAD_ROOT, { recursive: true })
    fs.writeFileSync(absolutePath, buffer, { flag: "wx" })

    let addedCount = 0
    let learned = false

    try {
      if ([".xlsx", ".xls", ".xlsm"].includes(extension)) {
        const result = await parseExcel(buffer, filename, undefined, {
          apiKey: transientApiKey,
          modelId: "gemini-1.5-flash",
          signal: knowledgeSignal,
        })
        addedCount = result.count
        learned = addedCount > 0
      } else if (extension === ".pdf" && transientApiKey) {
        const result = await parsePDFWithAI(
          buffer,
          filename,
          transientApiKey,
          "gemini-1.5-flash",
          [],
          undefined,
          knowledgeSignal
        )
        addedCount = result.count
        learned = addedCount > 0
      }

      const store = await getKnowledge()
      store.revision = knowledgeRevision
      if (!store.sources.includes(filename)) store.sources.push(filename)
      if (learned && !store.processedSources.includes(filename)) {
        store.processedSources.push(filename)
      }
      store.lastUpdated = new Date().toISOString()
      await saveKnowledge(store, knowledgeSignal)
    } catch (processingError) {
      const canRemoveUpload = await canSafelyRemoveFailedKnowledgeUpload(
        filename,
        getKnowledge
      )

      if (canRemoveUpload) {
        fs.rmSync(absolutePath, { force: true })
      } else {
        console.warn(
          `Knowledge upload retained after processing failure because persisted state may reference ${filename}.`
        )
      }

      throw processingError
    }

    return NextResponse.json(
      {
        success: true,
        count: addedCount,
        learned,
        filename,
        message: learned
          ? `Plik ${filename} został zapisany i przetworzony.`
          : `Plik ${filename} został bezpiecznie zapisany do późniejszej analizy.`,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof KnowledgeUploadBodyTooLargeError) {
      return NextResponse.json(
        { error: "Żądanie przesyłania pliku przekracza dozwolony limit." },
        { status: 413 }
      )
    }
    if (error instanceof KnowledgeUploadBodyInvalidError) {
      return NextResponse.json(
        { error: "Nieprawidłowe żądanie przesyłania pliku." },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : "Błąd serwera."
    if (req.signal.aborted || message === "PROCES_PRZERWANY") {
      return NextResponse.json(
        { error: "Przesyłanie lub analiza pliku zostały przerwane." },
        { status: 499 }
      )
    }
    if (message === "KNOWLEDGE_ADMIN_ACCESS_REVOKED") {
      return NextResponse.json(
        {
          error:
            "Uprawnienia administratora zmieniły się podczas przetwarzania. Zapis został anulowany.",
        },
        { status: 403 }
      )
    }
    if (message === "KNOWLEDGE_STORE_RESET_DURING_TRAINING") {
      return NextResponse.json(
        {
          error:
            "Baza wiedzy została wyczyszczona podczas przetwarzania. Uruchom import ponownie.",
        },
        { status: 409 }
      )
    }
    const status = /EEXIST/.test(message)
      ? 409
      : /nazwa pliku|format/.test(message)
        ? 400
        : 500
    console.error("Knowledge upload error:", error)
    return NextResponse.json({ error: message }, { status })
  } finally {
    detachRequestAbort?.()
  }
}
