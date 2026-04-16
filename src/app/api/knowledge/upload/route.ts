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

    // 2. Jeśli podano klucz - analizujemy plik i wyciągamy wiedzę
    if (transientApiKey && transientApiKey.trim() !== "") {
      if (filename.toLowerCase().endsWith('.xlsx') || filename.toLowerCase().endsWith('.xls')) {
        addedCount = await parseExcel(buffer, filename);
        learned = true;
      } else if (filename.toLowerCase().endsWith('.pdf')) {
        addedCount = await parsePDFWithAI(buffer, filename, transientApiKey);
        learned = true;
      }
    }

    // 3. Aktualizujemy listę wgranych plików w metadanych
    const currentStore = await getKnowledge();
    const existingFile = currentStore.sources.find(s => s === filename);
    
    if (!currentStore.sources.includes(filename)) {
      currentStore.sources.push(filename);
    }
    
    // Dodatkowe metadane o plikach (opcjonalnie do rozbudowy)
    currentStore.lastUpdated = new Date().toISOString();
    await saveKnowledge(currentStore);

    return NextResponse.json({ 
      success: true, 
      count: addedCount,
      learned: learned,
      message: learned 
        ? `Plik ${filename} zapisany i pomyślnie przetworzony (${addedCount} modeli).`
        : `Plik ${filename} został zapisany w archiwum (brak klucza AI - nie wyciągnięto wiedzy).`
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message || "Błąd serwera" }, { status: 500 });
  }
}
