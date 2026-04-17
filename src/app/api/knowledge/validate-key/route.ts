import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { apiKey } = await req.json();

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
    const validModels = models.filter((m: any) => {
      const name = m.name.toLowerCase();
      // Wspieramy tylko najnowsze modele Gemini (>= 2.0)
      const isModernGemini = name.includes('gemini-2.0') || 
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

    // Priorytety dla Tier 1 (Najnowsze modele Flash na początku)
    const priorityList = [
      'gemini-3.1-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.0-flash',
      'gemini-3.0-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-3.1-pro',
      'gemini-3.0-pro',
      'gemini-2.5-pro',
      'gemini-2.0-pro'
    ];

    let recommended = 'gemini-3.0-flash'; 

    for (const p of priorityList) {
      if (modelNames.includes(p)) {
        recommended = p;
        break;
      }
    }

    return NextResponse.json({
      success: true,
      recommended,
      availableModels: modelNames,
      message: `Klucz zweryfikowany pomyślnie. Znaleziono ${modelNames.length} modeli. Rekomendowany: ${recommended}.`
    });

  } catch (err: any) {
    console.error("Key Validation error:", err);
    return NextResponse.json({ error: "Błąd podczas walidacji klucza API" }, { status: 500 });
  }
}
