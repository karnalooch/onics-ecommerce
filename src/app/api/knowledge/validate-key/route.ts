import { NextResponse } from 'next/server';
import { GEMINI_PRICING, findBestRecommendation, sortModelsByRecommendation } from '@/lib/knowledge/aiPricing';
import { authorizeAPI } from "@/lib/authUtils";

export async function POST(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"]);
  if (!authCheck.authorized) return authCheck.response;

  try {
    const { apiKey, isPDF } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: "Brak klucza API do walidacji" }, { status: 400 });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ 
        error: data.error?.message || "Klucz API jest nieprawidłowy lub nieaktywny" 
      }, { status: 401 });
    }

    const models = data.models || [];
    // Filtrujemy modele wspierające generowanie treści (szersze dopasowanie)
    const validModels = models.filter((m: { name: string, supportedGenerationMethods?: string[] }) => {
      const name = m.name.toLowerCase();
      // Wspieramy najnowsze modele Gemini (w tym szerokodostępne 1.5)
      const isModernGemini = name.includes('gemini-1.5') ||
                             name.includes('gemini-2.0') || 
                             name.includes('gemini-2.5') || 
                             name.includes('gemini-3.') || 
                             name.includes('gemini-3.0') ||
                             name.includes('gemini-3.1');

      // Bezwzględne wykluczenie modeli specjalistycznych
      const isSpecialized = name.includes('tts') || name.includes('embedding') || name.includes('vision');
      
      if (!isModernGemini || isSpecialized) return false;

      return m.supportedGenerationMethods?.some((method: string) => 
        method.toLowerCase().includes('generatecontent')
      );
    });
    
    const modelNames = validModels.map((m: any) => m.name.replace('models/', ''));

    // Integrate Pricing & Recommendation Logic
    const recommendedId = findBestRecommendation(modelNames, !!isPDF);
    const cheapestId = findBestRecommendation(modelNames, false); // For the "Cheap" badge
    
    let modelsWithPricing = modelNames.map((id: string) => {
      const pricing = GEMINI_PRICING[id];
      return {
        id,
        name: pricing?.name || id,
        inputPrice: pricing?.inputPrice || 0.50,
        outputPrice: pricing?.outputPrice || 1.50,
        tier: pricing?.tier || 'Flash'
      };
    });

    // Sort to bring recommended to the TOP
    modelsWithPricing = sortModelsByRecommendation(modelsWithPricing, recommendedId);

    return NextResponse.json({
      success: true,
      recommended: recommendedId,
      cheapestId: cheapestId,
      availableModels: modelsWithPricing,
      isPDFRecommend: !!isPDF,
      message: `Klucz zweryfikowany. Wykryto ${modelNames.length} modeli. ${isPDF ? 'Dla plików PDF rekomendujemy optymalną wersję Flash/Pro.' : 'Sugerowany model ekonomiczny.'}`
    });

  } catch (err: any) {
    console.error("Key Validation error:", err);
    return NextResponse.json({ error: "Błąd podczas walidacji klucza API" }, { status: 500 });
  }
}
