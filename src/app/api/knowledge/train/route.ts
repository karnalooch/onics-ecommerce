import { NextResponse } from 'next/server';
import { parseExcel, parsePDFWithAI, getKnowledge, saveKnowledge } from '@/lib/knowledge/parser';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { filename, apiKey, modelId } = await req.json();
    
    if (!filename || !apiKey) {
      return NextResponse.json({ error: "Brak nazwy pliku lub klucza API" }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'public/uploads/catalogs', filename);
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Plik nie istnieje w archiwum" }, { status: 404 });
    }

    const buffer = fs.readFileSync(filePath);
    let addedCount = 0;

    // 1. Uruchamiamy proces nauki
    if (filename.toLowerCase().endsWith('.xlsx') || filename.toLowerCase().endsWith('.xls')) {
      const result = await parseExcel(buffer, filename);
      addedCount = result.count;
      
      // 2. Oznaczamy plik jako „przetworzony” (tylko dla Excela, PDF robi to w tle)
      const currentStore = await getKnowledge();
      if (!currentStore.processedSources.includes(filename)) {
        currentStore.processedSources.push(filename);
      }
      await saveKnowledge(currentStore);

      return NextResponse.json({ 
        success: true, 
        count: addedCount,
        message: `System pomyślnie nauczył się danych z pliku ${filename} (${addedCount} nowych modeli).`
      });
    } else if (filename.toLowerCase().endsWith('.pdf')) {
      // PDF przetwarzamy w tle, aby uniknąć Timeoutu w przeglądarce
      parsePDFWithAI(buffer, filename, apiKey, modelId).catch(err => {
        console.error("Background PDF processing failed:", err);
      });

      return NextResponse.json({ 
        success: true, 
        isBackground: true,
        message: `Rozpoczęto analizę PDF w tle. Ze względu na limity API zajmie to kilka minut. Dane będą pojawiać się sukcesywnie.`
      });
    } else {
      return NextResponse.json({ error: "Nieobsługiwany format pliku dla AI" }, { status: 400 });
    }
  } catch (err: any) {
    console.error("Training error:", err);
    return NextResponse.json({ error: err.message || "Błąd podczas nauki AI" }, { status: 500 });
  }
}
