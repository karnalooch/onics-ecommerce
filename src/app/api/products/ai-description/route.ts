import { NextResponse } from 'next/server';
import { initializeMockData } from '@/store/serverStore';
import { getKnowledge } from '@/lib/knowledge/parser';
import { findBestKnowledgeMatch } from '@/lib/knowledge/matcher';

export const dynamic = 'force-dynamic';

const AI_DB: Record<string, string[]> = {
  "integra": [
    "Centrala alarmowa SATEL INTEGRA obsługująca do 256 wejść i wyjść programowalnych.",
    "Zintegrowana kontrola dostępu i automatyka obiektowa w jednym systemie.",
    "Zgodność z normą EN-50131 Grade 3 dla profesjonalnych instalacji zabezpieczeń."
  ],
  "hikvision": [
    "Kamera IP Hikvision z przetwornikiem CMOS i rozdzielczością do 8MP (4K).",
    "Obiektyw o stałej ogniskowej, wsparcie kodeka H.265+ i cyfrowa redukcja szumów WDR.",
    "Wbudowany promiennik IR, zasilanie przez PoE (802.3af), klasa szczelności IP67."
  ],
  "ubiquiti": [
    "Przełącznik sieciowy Ubiquiti UniFi Gigabit z zarządzaniem w warstwie 2 i 3.",
    "Obsługa standardu PoE+ (802.3at) na portach RJ45 dla zasilania punktów dostępowych.",
    "Konfiguracja i monitoring przez oprogramowanie UniFi Network Controller."
  ],
  "default": [
    "Komponent systemu zabezpieczeń pracujący w standardzie cyfrowym.",
    "Parametry zgodne ze specyfikacją techniczną producenta.",
    "Przeznaczony do integracji w profesjonalnych instalacjach niskoprądowych."
  ]
};

export async function POST(req: Request) {
  try {
    const { productId } = await req.json();
    const { products } = initializeMockData();
    
    const product = products.find((p: any) => p.id === productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
    let generatedDescription = "";
    let source = "AI Default";
    let technicalContext = "";

    // --- KROK 1: PRZESZUKIWANIE LOKALNEJ BAZY WIEDZY ---
    try {
      const localStore = await getKnowledge();
      const match = findBestKnowledgeMatch(product.name, product.sku, localStore);

      if (match) {
        technicalContext = match.entry.specs;
        console.log(`[AI Generator] Wykryto dane katalogowe dla ${product.name}: ${technicalContext}`);
      }
    } catch (e) {
      console.error("Knowledge store error:", e);
    }

    // --- KROK 2: GENEROWANIE PRZEZ GEMINI Z UWZGLĘDNIENIEM WIEDZY ---
    if (GEMINI_API_KEY) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        let prompt = `Jesteś Ekspertem Technicznym B2B. Przygotuj surowy opis produktu (max 3 zdania).
        STRICT RULE: Zero marketingu, zero "bełkotu" typu "niezawodny", "idealny", "zapewnia".
        STYL: Wyłącznie fakty techniczne, parametry, standardy. 
        JĘZYK: Polski.
        `;

        if (technicalContext) {
          prompt += `\n\nŹRÓDŁO DANYCH (Skoncentruj się na tym):
          "${technicalContext}"`;
          source = "Catalog Hub + AI";
        } else {
          source = "Gemini AI (General Technical)";
        }

        prompt += `\n\nProdukt: ${product.name}
        Producent: ${product.manufacturer || 'Nieznany'}
        Kategoria: ${product.categoryId}
        
        Zwróć TYLKO czysty tekst opisu. Nie używaj HTML ani markdown.`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 300 }
          })
        });

        const data = await response.json();
        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
          generatedDescription = data.candidates[0].content.parts[0].text.trim();
        }
      } catch (err) {
        console.error("Gemini API Error:", err);
      }
    }

    // --- KROK 3: FALLBACK ---
    if (!generatedDescription) {
      if (technicalContext) {
        generatedDescription = technicalContext;
        source = "Local Catalog Hub (Direct Copy)";
      } else {
        const nameL = product.name.toLowerCase();
        let template = AI_DB.default;
        if (nameL.includes('integra')) template = AI_DB.integra;
        else if (nameL.includes('kamera')) template = AI_DB.hikvision;
        else if (nameL.includes('switch')) template = AI_DB.ubiquiti;

        generatedDescription = template.join(' ');
        source = "Internal Brain Fallback";
      }
    }
    
    // Aktualizacja w "bazie"
    product.seoDescription = generatedDescription;

    return NextResponse.json({ 
      success: true, 
      description: generatedDescription,
      source: source,
      foundInCatalog: !!technicalContext
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
