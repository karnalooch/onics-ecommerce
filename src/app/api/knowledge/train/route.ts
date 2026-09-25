import fs from "fs"
import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import { parseExcel, parsePDFWithAI } from "@/lib/knowledge/parser"
import { validateKnowledgeFilename } from "@/lib/knowledge/files"

export const runtime = "nodejs"

const RequestSchema = z.object({
  filename: z.string().min(1).max(255),
  apiKey: z.string().max(512).optional().default(""),
  modelId: z.string().trim().max(120).optional().default("internal-v9"),
})

export async function POST(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  try {
    const parsed = RequestSchema.safeParse(await req.json())
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

    const buffer = fs.readFileSync(fileInfo.absolutePath)
    const result = [".xlsx", ".xls", ".xlsm"].includes(fileInfo.extension)
      ? await parseExcel(buffer, fileInfo.filename, undefined, {
          apiKey: parsed.data.apiKey,
          modelId: parsed.data.modelId,
        })
      : await parsePDFWithAI(
          buffer,
          fileInfo.filename,
          parsed.data.apiKey || undefined,
          parsed.data.modelId
        )

    return NextResponse.json({
      success: true,
      count: result.count,
      stats: result.stats,
      message: `Przetworzono plik ${fileInfo.filename}.`,
    })
  } catch (error) {
    console.error("Knowledge training error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd analizy." },
      { status: 500 }
    )
  }
}
