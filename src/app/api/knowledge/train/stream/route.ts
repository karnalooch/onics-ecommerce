import fs from "fs"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import {
  getKnowledge,
  parseExcel,
  parsePDFWithAI,
  saveKnowledge,
} from "@/lib/knowledge/parser"
import { validateKnowledgeFilename } from "@/lib/knowledge/files"
import type { ProgressCallback } from "@/lib/knowledge/types"

export const runtime = "nodejs"

const RequestSchema = z.object({
  filename: z.string().min(1).max(255),
  apiKey: z.string().max(512).optional().default(""),
  modelId: z.string().trim().max(120).optional().default("internal-v9"),
  availableModels: z.array(z.string().trim().max(120)).max(50).optional().default([]),
})

export async function POST(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const parsed = RequestSchema.safeParse(await req.json())
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message || "Nieprawidłowe dane analizy." },
      { status: 400 }
    )
  }

  let fileInfo
  try {
    fileInfo = validateKnowledgeFilename(parsed.data.filename)
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Nieprawidłowy plik." },
      { status: 400 }
    )
  }

  if (!fs.existsSync(fileInfo.absolutePath)) {
    return Response.json({ error: "Plik nie istnieje." }, { status: 404 })
  }

  const buffer = fs.readFileSync(fileInfo.absolutePath)
  const encoder = new TextEncoder()
  const abortSignal = { aborted: false }

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      const send = (payload: Record<string, unknown>) => {
        if (closed) return
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          )
        } catch {
          closed = true
        }
      }

      const onProgress: ProgressCallback = (update) => {
        send({
          ...update,
          timestamp: new Date().toLocaleTimeString("pl-PL"),
        })
      }

      try {
        onProgress({
          type: "log",
          message: "Rozpoczynam analizę katalogu…",
        })

        let result:
          | Awaited<ReturnType<typeof parseExcel>>
          | Awaited<ReturnType<typeof parsePDFWithAI>>

        if ([".xlsx", ".xls", ".xlsm"].includes(fileInfo.extension)) {
          result = await parseExcel(buffer, fileInfo.filename, onProgress, {
            apiKey: parsed.data.apiKey,
            modelId: parsed.data.modelId,
            availableModels: parsed.data.availableModels,
            signal: abortSignal,
          })
        } else {
          result = await parsePDFWithAI(
            buffer,
            fileInfo.filename,
            parsed.data.apiKey || undefined,
            parsed.data.modelId,
            parsed.data.availableModels,
            onProgress,
            abortSignal
          )
        }

        const store = await getKnowledge()
        if (!store.sources.includes(fileInfo.filename)) {
          store.sources.push(fileInfo.filename)
        }
        if (!store.processedSources.includes(fileInfo.filename)) {
          store.processedSources.push(fileInfo.filename)
        }
        store.lastUpdated = new Date().toISOString()
        await saveKnowledge(store)

        send({
          type: "done",
          message: "Analiza zakończona.",
          count: result.count,
          stats: result.stats,
          knowledge: result.sessionKnowledge,
          timestamp: new Date().toLocaleTimeString("pl-PL"),
        })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Błąd podczas analizy."
        if (message !== "PROCES_PRZERWANY") {
          send({
            type: "error",
            message,
            timestamp: new Date().toLocaleTimeString("pl-PL"),
          })
        }
      } finally {
        abortSignal.aborted = true
        closed = true
        try {
          controller.close()
        } catch {
          // Client already closed the stream.
        }
      }
    },
    cancel() {
      abortSignal.aborted = true
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  })
}
