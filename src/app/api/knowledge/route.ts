import { NextResponse } from 'next/server';
import { getKnowledge } from '@/lib/knowledge/parser';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const store = await getKnowledge();
    
    // Samonaprawa: Synchronizacja źródeł z systemem plików
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'catalogs');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      let changed = false;
      files.forEach(file => {
        if (!store.sources.includes(file)) {
          store.sources.push(file);
          changed = true;
        }
      });
      if (changed) {
        const { saveKnowledge } = await import('@/lib/knowledge/parser');
        await saveKnowledge(store);
      }
    }

    // Konwertujemy mapę wiedzy na listę snippetów dla frontendu
    const snippets = Object.entries(store.knowledge).map(([model, data], index) => {
      const isObject = data && typeof data === 'object';
      const source = isObject ? (data.source || "Baza Wiedzy") : "Baza Wiedzy";
      const date = isObject ? (data.date || store.lastUpdated?.split('T')[0]) : store.lastUpdated?.split('T')[0];
      
      return {
        id: `s-${index}`,
        source: source,
        model: model,
        specs: isObject ? data.specs : data,
        price: isObject ? data.price : null,
        currency: isObject ? (data.currency || 'PLN') : 'PLN',
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

export async function DELETE() {
  try {
    const { saveKnowledge } = await import('@/lib/knowledge/parser');
    const emptyStore = { 
      lastUpdated: new Date().toISOString(), 
      sources: [], 
      processedSources: [], 
      knowledge: {} 
    };
    await saveKnowledge(emptyStore);
    return NextResponse.json({ success: true, message: "Baza wiedzy została wyczyszczona." });
  } catch (err) {
    console.error("DELETE Knowledge API Error:", err);
    return NextResponse.json({ error: "Błąd podczas czyszczenia bazy" }, { status: 500 });
  }
}
