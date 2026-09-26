import { NextResponse } from "next/server"
import fs from "fs"
import {
  getKnowledge,
  parseExcel,
  parsePDFWithAI,
  saveKnowledge,
} from "@/lib/knowledge/parser"
import { authorizeAPI } from "@/lib/authUtils"
import {
  KNOWLEDGE_UPLOAD_ROOT,
  MAX_KNOWLEDGE_UPLOAD_BYTES,
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

    fs.mkdirSync(KNOWLEDGE_UPLOAD_ROOT, { recursive: true })
    fs.writeFileSync(absolutePath, buffer, { flag: "wx" })

    let addedCount = 0
    let learned = false

    try {
      if ([".xlsx", ".xls", ".xlsm"].includes(extension)) {
        const result = await parseExcel(buffer, filename, undefined, {
          apiKey: transientApiKey,
          modelId: "gemini-1.5-flash",
        })
        addedCount = result.count
        learned = addedCount > 0
      } else if (extension === ".pdf" && transientApiKey) {
        const result = await parsePDFWithAI(buffer, filename, transientApiKey)
        addedCount = result.count
        learned = addedCount > 0
      }

      const store = await getKnowledge()
      if (!store.sources.includes(filename)) store.sources.push(filename)
      if (learned && !store.processedSources.includes(filename)) {
        store.processedSources.push(filename)
      }
      store.lastUpdated = new Date().toISOString()
      await saveKnowledge(store)
    } catch (processingError) {
      fs.rmSync(absolutePath, { force: true })
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
    const status = /EEXIST/.test(message)
      ? 409
      : /nazwa pliku|format/.test(message)
        ? 400
        : 500
    console.error("Knowledge upload error:", error)
    return NextResponse.json({ error: message }, { status })
  }
}
