import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import { mutateMockData, readServerData } from "@/store/serverStore"
import { getKnowledge } from "@/lib/knowledge/parser"
import { findBestKnowledgeMatch } from "@/lib/knowledge/matcher"

export const dynamic = "force-dynamic"

const RequestSchema = z.object({
  productId: z.string().min(1),
})

type ProductRecord = {
  id?: string
  sku?: string
  name?: string
  manufacturer?: string
  seoDescription?: string
  descriptionSource?: string
  descriptionUpdatedAt?: string
  [key: string]: unknown
}

function productFingerprint(product: ProductRecord) {
  return JSON.stringify({
    sku: product.sku ?? "",
    name: product.name ?? "",
    manufacturer: product.manufacturer ?? "",
  })
}

export async function POST(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  try {
    const parsed = RequestSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Nieprawidłowy produkt." }, { status: 400 })
    }

    const { products } = await readServerData()
    const product = (products as ProductRecord[]).find(
      (entry) => String(entry.id) === parsed.data.productId
    )

    if (!product) {
      return NextResponse.json({ error: "Produkt nie istnieje." }, { status: 404 })
    }

    const initialFingerprint = productFingerprint(product)
    let technicalContext = ""
    try {
      const localStore = await getKnowledge()
      const match = findBestKnowledgeMatch(
        String(product.name || ""),
        String(product.sku || ""),
        localStore
      )
      technicalContext = match?.entry.specs?.trim() || ""
    } catch (error) {
      console.warn("Knowledge lookup failed:", error)
    }

    let generatedDescription = ""
    let source = ""

    if (process.env.GOOGLE_GEMINI_API_KEY) {
      const url =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

      const prompt = [
        "Napisz po polsku maksymalnie 3 zdania opisu technicznego produktu B2B.",
        "Używaj wyłącznie faktów podanych poniżej. Nie dopowiadaj norm, klas, funkcji ani parametrów.",
        "Bez marketingowych przymiotników. Zwróć wyłącznie tekst.",
        `Produkt: ${product.name}`,
        `Producent: ${product.manufacturer || "Nieznany"}`,
        technicalContext
          ? `Zweryfikowane dane katalogowe: ${technicalContext}`
          : "Brak zweryfikowanych danych katalogowych.",
      ].join("\n")

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GOOGLE_GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 300 },
        }),
        signal: AbortSignal.timeout(15000),
      })

      if (response.ok) {
        const data = await response.json()
        generatedDescription =
          data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ""
        source = technicalContext ? "Catalog Hub + Gemini" : "Gemini"
      }
    }

    if (!generatedDescription && technicalContext) {
      generatedDescription = technicalContext
      source = "Catalog Hub"
    }

    if (!generatedDescription) {
      return NextResponse.json(
        {
          error:
            "Brak zweryfikowanych danych technicznych. Najpierw zsynchronizuj produkt z katalogiem albo skonfiguruj Gemini.",
        },
        { status: 422 }
      )
    }

    await mutateMockData((db) => {
      const productStore = db.products as ProductRecord[]
      const currentProduct = productStore.find(
        (entry) => String(entry.id) === parsed.data.productId
      )

      if (!currentProduct) throw new Error("PRODUCT_NOT_FOUND")
      if (productFingerprint(currentProduct) !== initialFingerprint) {
        throw new Error("PRODUCT_CHANGED")
      }

      currentProduct.seoDescription = generatedDescription
      currentProduct.descriptionSource = source
      currentProduct.descriptionUpdatedAt = new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      description: generatedDescription,
      source,
      foundInCatalog: Boolean(technicalContext),
    })
  } catch (error) {
    const code = error instanceof Error ? error.message : ""
    if (code === "PRODUCT_NOT_FOUND") {
      return NextResponse.json({ error: "Produkt nie istnieje." }, { status: 404 })
    }
    if (code === "PRODUCT_CHANGED") {
      return NextResponse.json(
        {
          error:
            "Produkt zmienił się podczas generowania opisu. Odśwież dane i spróbuj ponownie.",
        },
        { status: 409 }
      )
    }

    console.error("AI description error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd serwera." },
      { status: 500 }
    )
  }
}
