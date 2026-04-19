import { NextResponse } from 'next/server';
import { parseExcel, parsePDFWithAI, getKnowledge, saveKnowledge } from '@/lib/knowledge/parser';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const transientApiKey = formData.get('apiKey') as string; // Klucz podany tylko do tej sesji
    
    if (!file) {
      return NextResponse.json({ error: "Nie wybrano pliku" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name;
    const uploadPath = path.join(process.cwd(), 'public/uploads/catalogs', filename);
    
    // 1. Zapisujemy plik fizycznie do repozytorium (zawsze)
    fs.writeFileSync(uploadPath, buffer);

    let addedCount = 0;
    let learned = false;

    // 2. Analizujemy plik i wyciągamy wiedzę (V7 Heuristics)
    if (filename.toLowerCase().endsWith('.xlsx') || filename.toLowerCase().endsWith('.xls')) {
      const result = await parseExcel(buffer, filename, undefined, { 
        apiKey: transientApiKey || undefined, 
        modelId: 'gemini-1.5-flash' 
      });
      addedCount = result.count;
      learned = addedCount > 0;
    } else if (filename.toLowerCase().endsWith('.pdf') && transientApiKey) {
      const result = await parsePDFWithAI(buffer, filename, transientApiKey);
      addedCount = result.count;
      learned = true;
    }

    // 3. Aktualizujemy listę wgranych plików w metadanych
    const currentStore = await getKnowledge();
    
    if (!currentStore.sources.includes(filename)) {
      currentStore.sources.push(filename);
    }
    
    // Jeśli udało się coś wyciągnąć, oznaczamy jako przetworzony
    if (learned && !currentStore.processedSources.includes(filename)) {
      currentStore.processedSources.push(filename);
    }
    
    currentStore.lastUpdated = new Date().toISOString();
    await saveKnowledge(currentStore);

    return NextResponse.json({ 
      success: true, 
      count: addedCount,
      learned: learned,
      message: learned 
        ? `Plik ${filename} przetworzony pomyślnie (${addedCount} modeli).`
        : `Plik ${filename} zapisany w archiwum (analiza zostanie wykonana w kroku uczenia).`
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message || "Błąd serwera" }, { status: 500 });
  }
}
