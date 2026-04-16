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
    // Filtrujemy tylko modele wspierające metodę generateContent
    const validModels = models.filter((m: any) => 
      m.supportedGenerationMethods?.includes('generateContent')
    );
    const modelNames = validModels.map((m: any) => m.name.replace('models/', ''));

    // Algorytm rekomendacji: wybieramy model z najwyższej serii i preferujemy "Lite" (wyższe darmowe limity)
    const priorityList = [
      'gemini-3.1-flash-lite',
      'gemini-3.1-flash',
      'gemini-3-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash'
    ];

    let recommended = 'gemini-1.5-flash'; // Domyślny fallback

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
      message: `Znaleziono ${modelNames.length} modeli. Sugerowany wybór to ${recommended}.`
    });

  } catch (err: any) {
    console.error("Key Validation error:", err);
    return NextResponse.json({ error: "Błąd podczas walidacji klucza API" }, { status: 500 });
  }
}
