import { NextResponse } from 'next/server';
import { initializeMockData } from '@/store/serverStore';
import { getKnowledge } from '@/lib/knowledge/parser';
import { findBestKnowledgeMatch } from '@/lib/knowledge/matcher';

export const dynamic = 'force-dynamic';

const AI_DB: Record<string, string[]> = {
  "integra": [
    "Zaawansowana centrala alarmowa SATEL INTEGRA to wszechstronne rozwiązanie łączące system sygnalizacji włamania, kontrolę dostępu i automatykę domową.",
    "Oferuje skalowalną architekturę pozwalającą na obsługę wielu stref i wyjść, dostosowaną do wymagań konkretnego obiektu.",
    "Spełnia rygorystyczne normy bezpieczeństwa EN-50131 Grade 2 lub 3, zapewniając niezawodną ochronę profesjonalnych systemów zabezpieczeń."
  ],
  "hikvision": [
    "Profesjonalna kamera IP marki Hikvision oferuje najwyższą jakość obrazu w rozdzielczości do 4K, idealną do precyzyjnego monitoringu wizyjnego.",
    "Wyposażona w technologię WDR oraz zaawansowane doświetlacze IR, gwarantuje doskonałą widoczność nawet w skrajnie trudnych warunkach oświetleniowych.",
    "Dzięki inteligentnej analityce obrazu AI skutecznie eliminuje fałszywe alarmy i umożliwia błyskawiczne przeszukiwanie nagrań."
  ],
  "ubiquiti": [
    "Przełącznik sieciowy Ubiquiti UniFi to fundament nowoczesnej sieci, oferujący gigabitową przepustowość i zaawansowane zarządzanie z poziomu chmury.",
    "Zintegrowane porty PoE+ umożliwiają bezpośrednie zasilanie kamer i punktów dostępowych, upraszczając infrastrukturę kablową w każdej instalacji.",
    "Intuicyjny interfejs UniFi Controller pozwala na błyskawiczną konfigurację VLAN-ów i pełny monitoring ruchu sieciowego v czasie rzeczywistym."
  ],
  "default": [
    "Wysokiej jakości komponent instalacyjny zaprojektowany z myślą o profesjonalnych systemach zabezpieczeń i telekomunikacji.",
    "Gwarantuje pełną kompatybilność z najnowszymi standardami branżowymi oraz wysoką odporność na czynniki zewnętrzne.",
    "Idealne rozwiązanie dla instalatorów poszukujących balansu między zaawansowanymi parametrami a łatwością montażu."
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
        
        let prompt = `Jesteś ekspertem technicznym B2B w branży systemów zabezpieczeń (CCTV, Alarmy, Sieci). 
        Przygotuj profesjonalny opis produktu w języku polskim (maksymalnie 3 zdania).
        Skup się na korzyściach technicznych dla profesjonalnego instalatora.

        PRZYKŁADY STYLU:
        - "Centrala INTEGRA-64 to fundament profesjonalnych systemów alarmowych, oferujący wsparcie dla 64 stref i pełną zgodność z Grade 3."
        - "Kamera Hikvision serii ColorVu zapewnia kolorowy obraz 24/7, eliminując martwe punkty dzięki analityce AcuSense."
        `;

        if (technicalContext) {
          prompt += `\n\nWAŻNE: Wykorzystaj poniższą specyfikację techniczną z katalogu dystrybutora jako jedyne źródło parametrów:
          "${technicalContext}"`;
          source = "Catalog Hub + AI";
        } else {
          source = "Gemini AI (General)";
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
            generationConfig: { temperature: 0.7, maxOutputTokens: 300 }
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
