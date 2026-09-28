import { NextResponse } from "next/server"
import { authorizeAPI } from "@/lib/authUtils"
import { deleteKnowledgeEntry } from "@/lib/knowledge/parser"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ model: string }> }
) {
  try {
    const authCheck = await authorizeAPI(["ADMIN"])
    if (!authCheck.authorized) return authCheck.response

    const { model } = await params
    const decodedModel = decodeURIComponent(model).trim().toUpperCase()
    const deleted = await deleteKnowledgeEntry(
      decodedModel,
      authCheck.user
    )

    if (!deleted) {
      return NextResponse.json(
        { error: "Nie znaleziono wyekstrahowanego wpisu wiedzy." },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Model ${decodedModel} został usunięty z wyekstrahowanej bazy wiedzy.`,
    })
  } catch (err) {
    if (
      err instanceof Error &&
      err.message === "KNOWLEDGE_ADMIN_ACCESS_REVOKED"
    ) {
      return NextResponse.json(
        {
          error:
            "Uprawnienia administratora zmieniły się przed usunięciem wpisu wiedzy.",
        },
        { status: 403 }
      )
    }

    console.error("DELETE Snippet Error:", err)
    return NextResponse.json(
      { error: "Błąd serwera podczas usuwania." },
      { status: 500 }
    )
  }
}
