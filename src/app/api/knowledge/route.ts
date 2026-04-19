import { NextResponse } from 'next/server';
import { initializeMockData, saveMockData } from '@/store/serverStore';

export async function GET() {
  try {
    const { products, categories, manufacturers } = initializeMockData();
    
    // Filter virtual products (The "Knowledge Hub" view)
    const virtualProducts = products.filter((p: any) => p.isVirtual);

    // Map virtual products to the snippets format used by the Knowledge UI
    const snippets = virtualProducts.map((p: any, index: number) => {
      return {
        id: p.id || `s-${index}`,
        source: "Baza produktów",
        model: p.sku,
        name: p.name,
        specs: p.specs || "",
        price: p.price || 0,
        type: 'xls' as const,
        date: p.lastUpdated || new Date().toISOString().split('T')[0]
      };
    });

    return NextResponse.json({
      sources: [], // Legacy sources handling shifted to actions
      processedSources: [],
      snippets: snippets.slice(0, 500), // Limit results for UI performance
      totalKnowledge: virtualProducts.length,
      registry: {
        categories,
        manufacturers
      }
    });
  } catch (err) {
    console.error("GET Knowledge API Error:", err);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const db = initializeMockData();
    
    // SURGICAL WIPE: Remove only virtual items
    db.products = db.products.filter((p: any) => !p.isVirtual);
    
    saveMockData();
    
    return NextResponse.json({ success: true, message: "Baza wiedzy (Modele Wirtualne) została wyczyszczona." });
  } catch (err) {
    console.error("DELETE Knowledge API Error:", err);
    return NextResponse.json({ error: "Błąd podczas czyszczenia bazy" }, { status: 500 });
  }
}
