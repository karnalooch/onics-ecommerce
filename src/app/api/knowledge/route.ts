import { NextResponse } from "next/server"
import { authorizeAPI } from "@/lib/authUtils"
import { getKnowledge, saveKnowledge } from "@/lib/knowledge/parser"
import { initializeMockData, saveMockData } from "@/store/serverStore"

type VirtualProduct = {
  isVirtual?: boolean
}

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

export async function DELETE() {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  try {
    const { products } = initializeMockData()
    const productStore = products as VirtualProduct[]

    for (let index = productStore.length - 1; index >= 0; index -= 1) {
      if (productStore[index].isVirtual) productStore.splice(index, 1)
    }

    const store = await getKnowledge()
    store.sources = []
    store.processedSources = []
    store.lastUpdated = new Date().toISOString()
    await saveKnowledge(store)

    if (!saveMockData()) {
      throw new Error("Nie udało się utrwalić zmian.")
    }

    return NextResponse.json({
      success: true,
      message: "Metadane źródeł i wirtualne wpisy zostały wyczyszczone.",
    })
  } catch (error) {
    console.error("DELETE Knowledge API Error:", error)
    return NextResponse.json(
      { error: "Błąd podczas czyszczenia bazy." },
      { status: 500 }
    )
  }
}
