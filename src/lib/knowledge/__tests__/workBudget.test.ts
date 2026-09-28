import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"
import {
  AI_PDF_CHUNK_SIZE,
  MAX_AI_PDF_CHUNKS,
  MAX_AI_PDF_TEXT_CHARS,
  MAX_KNOWLEDGE_EXCEL_ROWS_PER_SHEET,
  MAX_KNOWLEDGE_EXCEL_SHEETS,
  MAX_KNOWLEDGE_PDF_PAGES,
} from "@/lib/knowledge/parser"
import {
  MAX_TOOLKIT_ATTEMPTS,
  MAX_TOOLKIT_MODELS,
  TOOLKIT_MAX_RETRY_DELAY_MS,
  TOOLKIT_REQUEST_TIMEOUT_MS,
} from "@/lib/knowledge/ToolkitParser"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("knowledge training work budgets", () => {
  it("keeps parser work bounded", () => {
    expect(MAX_KNOWLEDGE_EXCEL_SHEETS).toBe(50)
    expect(MAX_KNOWLEDGE_EXCEL_ROWS_PER_SHEET).toBe(50_000)
    expect(MAX_KNOWLEDGE_PDF_PAGES).toBe(250)
    expect(AI_PDF_CHUNK_SIZE).toBe(4_000)
    expect(MAX_AI_PDF_CHUNKS).toBe(20)
    expect(MAX_AI_PDF_TEXT_CHARS).toBe(
      AI_PDF_CHUNK_SIZE * MAX_AI_PDF_CHUNKS
    )
  })

  it("applies spreadsheet and PDF bounds before unbounded loops", () => {
    const parser = read("src/lib/knowledge/parser.ts")
    const excelStart = parser.indexOf("export async function parseExcel")
    const excelLoop = parser.indexOf("for (const sheetName of workbook.SheetNames)")
    const sheetLimit = parser.indexOf(
      "workbook.SheetNames.length > MAX_KNOWLEDGE_EXCEL_SHEETS",
      excelStart
    )
    const pdfStart = parser.indexOf("export async function parsePDFWithAI")
    const chunkLoop = parser.indexOf(
      "for(let i=0; i<fullText.length; i+=AI_PDF_CHUNK_SIZE)",
      pdfStart
    )
    const textLimit = parser.indexOf(
      "fullText.length > MAX_AI_PDF_TEXT_CHARS",
      pdfStart
    )

    expect(parser).toContain(
      "sheetRows: MAX_KNOWLEDGE_EXCEL_ROWS_PER_SHEET"
    )
    expect(sheetLimit).toBeGreaterThan(excelStart)
    expect(sheetLimit).toBeLessThan(excelLoop)
    expect(parser).toContain("max: MAX_KNOWLEDGE_PDF_PAGES")
    expect(textLimit).toBeGreaterThan(pdfStart)
    expect(textLimit).toBeLessThan(chunkLoop)
  })

  it("caps provider fanout, retries, response size and request lifetime", () => {
    expect(MAX_TOOLKIT_MODELS).toBe(5)
    expect(MAX_TOOLKIT_ATTEMPTS).toBe(3)
    expect(TOOLKIT_REQUEST_TIMEOUT_MS).toBe(15_000)
    expect(TOOLKIT_MAX_RETRY_DELAY_MS).toBe(5_000)

    const toolkit = read("src/lib/knowledge/ToolkitParser.ts")
    expect(toolkit).toContain(".slice(0, MAX_TOOLKIT_MODELS)")
    expect(toolkit).toContain("Math.min(\n      MAX_TOOLKIT_ATTEMPTS")
    expect(toolkit).toContain("max_output_tokens: 4096")
    expect(toolkit).toContain(
      "signal: AbortSignal.timeout(TOOLKIT_REQUEST_TIMEOUT_MS)"
    )
  })

  it("keeps Gemini credentials out of request URLs", () => {
    const toolkit = read("src/lib/knowledge/ToolkitParser.ts")
    expect(toolkit).not.toContain(":generateContent?key=")
    expect(toolkit).toContain("'x-goog-api-key': this.config.apiKey")
    expect(toolkit).toContain("encodeURIComponent(selectedModel)")
  })

  it("caps caller-selected models at the streaming ingress too", () => {
    const stream = read("src/app/api/knowledge/train/stream/route.ts")
    expect(stream).toContain(
      "availableModels: z.array(z.string().trim().max(120)).max(5)"
    )
  })
})
