import { NextResponse } from "next/server"
import { authorizeAPI } from "@/lib/authUtils"
import { hasAccountRoleAccess } from "@/lib/accountAccess"
import { findStoredUserBySession } from "@/lib/sessionIdentity"
import { getKnowledge } from "@/lib/knowledge/parser"
import { initializeMockData, mutateMockData } from "@/store/serverStore"

export async function GET() {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  try {
    const store = await getKnowledge()
    const { categories, manufacturers } = initializeMockData()
    const snippets = Object.entries(store.knowledge)
      .slice(0, 500)
      .map(([model, info], index) => ({
        id: `knowledge-${index}`,
        source: info.source || "Baza produktów",
        model,
        name: info.model || model,
        specs: info.specs || "",
        price: info.price || 0,
        type: "catalog" as const,
        date: info.lastUpdated || store.lastUpdated,
      }))

    return NextResponse.json({
      sources: store.sources,
      processedSources: store.processedSources,
      snippets,
      totalKnowledge: Object.keys(store.knowledge).length,
      registry: { categories, manufacturers },
    })
  } catch (error) {
    console.error("GET Knowledge API Error:", error)
    return NextResponse.json({ error: "Błąd serwera." }, { status: 500 })
  }
}

type StoredActor = {
  id?: string
  email?: string
  roleType?: string
  isApproved?: boolean
  isBlocked?: boolean
}

export async function DELETE() {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  try {
    await mutateMockData((db) => {
      const currentActor = findStoredUserBySession(
        db.users as StoredActor[],
        authCheck.user
      )
      if (
        !currentActor ||
        !hasAccountRoleAccess(currentActor, ["ADMIN"])
      ) {
        throw new Error("KNOWLEDGE_ADMIN_ACCESS_REVOKED")
      }

      db.knowledgeEntries = {};
      db.knowledgeMeta = {
        revision: db.knowledgeMeta.revision + 1,
        sources: [],
        processedSources: [],
        lastUpdated: new Date().toISOString(),
      }
    })

    return NextResponse.json({
      success: true,
      message: "Baza wiedzy i metadane źródeł zostały wyczyszczone bez zmiany live katalogu produktów.",
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "KNOWLEDGE_ADMIN_ACCESS_REVOKED"
    ) {
      return NextResponse.json(
        {
          error:
            "Uprawnienia administratora zmieniły się przed wyczyszczeniem bazy. Operacja została anulowana.",
        },
        { status: 403 }
      )
    }

    console.error("DELETE Knowledge API Error:", error)
    return NextResponse.json(
      { error: "Błąd podczas czyszczenia bazy." },
      { status: 500 }
    )
  }
}
