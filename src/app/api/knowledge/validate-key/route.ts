import { NextResponse } from "next/server"
import { z } from "zod"
import {
  GEMINI_PRICING,
  findBestRecommendation,
  sortModelsByRecommendation,
} from "@/lib/knowledge/aiPricing"
import { authorizeAPI } from "@/lib/authUtils"

type GoogleModel = {
  name?: string
  supportedGenerationMethods?: string[]
}

type GoogleModelsResponse = {
  models?: GoogleModel[]
  error?: { message?: string }
}

const RequestSchema = z.object({
  apiKey: z.string().trim().min(10).max(512),
  isPDF: z.boolean().optional().default(false),
})

export async function POST(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  try {
    const parsed = RequestSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Nieprawidłowy klucz API." },
        { status: 400 }
      )
    }

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models?key=" +
      encodeURIComponent(parsed.data.apiKey)
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    })
    const data = (await response.json()) as GoogleModelsResponse

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data.error?.message ||
            "Klucz API jest nieprawidłowy lub nieaktywny.",
        },
        { status: 401 }
      )
    }

    const validModels = (data.models || []).filter((model) => {
      const name = String(model.name || "").toLowerCase()
      const isGemini =
        name.includes("gemini-1.5") ||
        name.includes("gemini-2.") ||
        name.includes("gemini-3.")
      const isSpecialized =
        name.includes("tts") ||
        name.includes("embedding") ||
        name.includes("vision")

      return (
        isGemini &&
        !isSpecialized &&
        model.supportedGenerationMethods?.some((method) =>
          method.toLowerCase().includes("generatecontent")
        )
      )
    })

    const modelNames = validModels
      .map((model) => String(model.name || "").replace("models/", ""))
      .filter(Boolean)

    const recommendedId = findBestRecommendation(
      modelNames,
      parsed.data.isPDF
    )
    const cheapestId = findBestRecommendation(modelNames, false)
    const modelsWithPricing = sortModelsByRecommendation(
      modelNames.map((id) => {
        const pricing = GEMINI_PRICING[id]
        return {
          id,
          name: pricing?.name || id,
          inputPrice: pricing?.inputPrice ?? 0.5,
          outputPrice: pricing?.outputPrice ?? 1.5,
          tier: pricing?.tier || "Flash",
        }
      }),
      recommendedId
    )

    return NextResponse.json({
      success: true,
      recommended: recommendedId,
      cheapestId,
      availableModels: modelsWithPricing,
      isPDFRecommend: parsed.data.isPDF,
      message: `Klucz zweryfikowany. Wykryto ${modelNames.length} obsługiwanych modeli.`,
    })
  } catch (error) {
    console.error("Key validation error:", error)
    return NextResponse.json(
      { error: "Błąd podczas walidacji klucza API." },
      { status: 500 }
    )
  }
}
