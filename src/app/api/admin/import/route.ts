import { NextResponse } from 'next/server';
import { initializeMockData, saveMockData } from "@/store/serverStore";

export async function POST(req: Request) {
  try {
    const rawData = await req.text();
    
    const authHeader = req.headers.get('Authorization');
    // Używamy klucza z .env lub domyślnego dla testów
    if (authHeader !== `Bearer ${process.env.WF_MAG_SECRET || 'dev-secret'}`) {
      return NextResponse.json({ error: 'Nieautoryzowany dostęp' }, { status: 401 });
    }

    if (!rawData) {
      return NextResponse.json({ error: 'Brak danych do importu.' }, { status: 400 });
    }

    // W rzeczywistym systemie tutaj parsujemy XML/XLSX
    // Na potrzeby "Porządku" symulujemy dodanie produktu do bazy JSON
    const { products } = initializeMockData();
    
    const importedProduct = {
      id: `p_import_${Date.now()}`,
      sku: "WF-" + Math.floor(Math.random() * 1000),
      name: "Produkt z Importu WF-Mag",
      price: 99.99,
      stock: 10,
      description: "Automatyczny import z systemu ERP",
      importedAt: new Date().toISOString()
    };

    (global as any).mockProductsStore.push(importedProduct);
    saveMockData();

    console.log("Pomyślnie zaimportowano produkt do db.json");

    return NextResponse.json({
      success: true,
      message: 'Dane z ERP pomyślnie zapisane w db.json.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Błąd podczas importu:", error);
    return NextResponse.json({ error: "Błąd serwera podczas zapisu w db.json" }, { status: 500 });
  }
}
