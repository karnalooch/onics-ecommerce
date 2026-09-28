import fs from "fs"
import { NextResponse } from "next/server"
import { authorizeAPI } from "@/lib/authUtils"
import { deleteKnowledgeSource } from "@/lib/knowledge/parser"
import { validateKnowledgeFilename } from "@/lib/knowledge/files"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  try {
    const { filename: rawFilename } = await params

    let decodedFilename: string
    try {
      decodedFilename = decodeURIComponent(rawFilename)
    } catch {
      return NextResponse.json(
        { error: "Nieprawidłowa nazwa źródła wiedzy." },
        { status: 400 }
      )
    }

    const { filename, absolutePath } =
      validateKnowledgeFilename(decodedFilename)
    const fileExistedBeforeDelete = fs.existsSync(absolutePath)

    const deletion = await deleteKnowledgeSource(
      filename,
      authCheck.user
    )

    try {
      fs.rmSync(absolutePath, { force: true })
    } catch (fileError) {
      console.error(
        "Knowledge source file delete failed after durable DB detach:",
        fileError
      )
      return NextResponse.json(
        {
          error:
            "Źródło zostało odłączone od bazy wiedzy, ale pliku nie udało się usunąć. Ponów operację.",
          retryable: true,
          filename,
          revision: deletion.revision,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      filename,
      removedEntries: deletion.removedEntries,
      removedMetadataReferences: deletion.removedMetadataReferences,
      fileRemoved: fileExistedBeforeDelete,
      revision: deletion.revision,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "KNOWLEDGE_ADMIN_ACCESS_REVOKED"
    ) {
      return NextResponse.json(
        {
          error:
            "Uprawnienia administratora zmieniły się przed usunięciem źródła wiedzy.",
        },
        { status: 403 }
      )
    }

    const message =
      error instanceof Error ? error.message : "Błąd serwera."
    const status = /nazwa pliku|format|FILENAME_INVALID/.test(message)
      ? 400
      : 500

    console.error("DELETE Knowledge Source Error:", error)
    return NextResponse.json(
      { error: status === 400 ? message : "Błąd podczas usuwania źródła wiedzy." },
      { status }
    )
  }
}
