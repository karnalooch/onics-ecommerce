import { NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { authorizeAPI } from "@/lib/authUtils"
import { checkAdminCostLimit } from "@/lib/adminCostRateLimit"
import {
  KnowledgeExportLimitError,
  assertKnowledgeExportBufferSize,
  buildKnowledgeExportRows,
} from "@/lib/knowledge/exportBoundary"
import { getKnowledge } from "@/lib/knowledge/parser"

export async function GET() {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const costLimit = checkAdminCostLimit("knowledge-export", authCheck.user)
  if (!costLimit.allowed) {
    return NextResponse.json(
      { error: "Zbyt wiele eksportów. Spróbuj ponownie później." },
      {
        status: 429,
        headers: { "Retry-After": String(costLimit.retryAfterSeconds) },
      }
    )
  }

  try {
    const store = await getKnowledge()
    const rows = buildKnowledgeExportRows(store)

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(rows)
    worksheet["!cols"] = [
      { wch: 25 },
      { wch: 15 },
      { wch: 80 },
      { wch: 24 },
      { wch: 40 },
      { wch: 24 },
    ]
    XLSX.utils.book_append_sheet(workbook, worksheet, "KnowledgeBase")
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
    assertKnowledgeExportBufferSize(buffer)

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="Celtronics_Knowledge_Export.xlsx"',
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    if (error instanceof KnowledgeExportLimitError) {
      return NextResponse.json(
        {
          error:
            "Baza wiedzy jest zbyt duża do bezpiecznego eksportu w jednym pliku.",
        },
        { status: 422 }
      )
    }

    console.error("Knowledge export error:", error)
    return NextResponse.json({ error: "Błąd eksportu." }, { status: 500 })
  }
}
