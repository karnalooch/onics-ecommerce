import { NextResponse } from 'next/server';
import { getKnowledge } from '@/lib/knowledge/parser';

export async function GET() {
  try {
    const store = await getKnowledge();
    
    // Konwertujemy mapę wiedzy na listę snippetów dla frontendu
    const snippets = Object.entries(store.knowledge).map(([model, data], index) => {
      const isObject = typeof data !== 'string';
      const source = isObject ? (data.source || "Baza Wiedzy") : "Baza Wiedzy";
      const date = isObject ? (data.date || store.lastUpdated?.split('T')[0]) : store.lastUpdated?.split('T')[0];
      
      return {
        id: `s-${index}`,
        source: source,
        model: model,
        specs: isObject ? data.specs : data,
        type: source.toLowerCase().endsWith('.pdf') ? ('pdf' as const) : ('xls' as const),
        date: date || new Date().toISOString().split('T')[0]
      };
    });

    return NextResponse.json({
      sources: store.sources,
      processedSources: store.processedSources,
      snippets: snippets
    });
  } catch (err) {
    console.error("GET Knowledge API Error:", err);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
