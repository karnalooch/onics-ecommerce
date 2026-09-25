import { NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { authorizeAPI } from "@/lib/authUtils"
import { getKnowledge } from "@/lib/knowledge/parser"

export async function GET() {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  try {
    const store = await getKnowledge()
    const rows = Object.entries(store.knowledge).map(([symbol, info]) => ({
      "Model / Symbol": symbol,
      Cena: info.price ?? "",
      Specyfikacja: info.specs || "",
      Producent: info.manufacturer || "",
      Źródło: info.source || "Baza produktów",
      "Ostatnia aktualizacja": info.lastUpdated || store.lastUpdated || "",
    }))

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
    console.error("Knowledge export error:", error)
    return NextResponse.json({ error: "Błąd eksportu." }, { status: 500 })
  }
}
