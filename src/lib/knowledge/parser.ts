import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
const pdfParse = require('pdf-parse'); // pdf-parse typically uses require
import { KnowledgeStore, KnowledgeEntry, KnowledgeEntrySchema } from './types';

const KNOWLEDGE_PATH = path.join(process.cwd(), 'src/store/catalogKnowledge.json');

export type ProgressCallback = (update: { 
  type: 'log' | 'progress' | 'error'; 
  message: string; 
  count?: number;
  percent?: number;
}) => void;

export async function getKnowledge(): Promise<KnowledgeStore> {
  try {
    const data = fs.readFileSync(KNOWLEDGE_PATH, 'utf8');
    const parsed = JSON.parse(data);
    return {
      lastUpdated: parsed.lastUpdated || null,
      sources: parsed.sources || [],
      processedSources: parsed.processedSources || [],
      knowledge: parsed.knowledge || {}
    };
  } catch (e) {
    return { lastUpdated: null, sources: [], processedSources: [], knowledge: {} };
  }
}

export async function saveKnowledge(data: KnowledgeStore) {
  fs.writeFileSync(KNOWLEDGE_PATH, JSON.stringify(data, null, 2));
}

// --- HEURISTICS & UTILS ---

const MODEL_KEYWORDS = ['MODEL', 'SYMBOL', 'KOD', 'SKU', 'ARTYKUŁ', 'INDEKS', 'PRODUKT', 'NAZWA TOWARU', 'PRODUCT MODEL', 'SERIES', 'NAZWA'];
const SPECS_KEYWORDS = ['OPIS', 'SPECYFIKACJA', 'PARAMETRY', 'CECHY', 'FUNKCJE', 'DESCRIPTION', 'DANE TECHNICZNE'];
const PRICE_KEYWORDS = ['NETTO', 'CENA', 'PRICE', 'WARTOŚĆ', 'NET', 'DETAL', 'HURT', 'CENA PL', 'PLN'];
const NON_DEVICE_KEYWORDS = ['KABEL', 'PRZEWÓD', 'WTYK', 'ZŁĄCZE', 'UCHWYT', 'KOŁEK', 'ŚRUBA', 'RURA', 'KORYTO', 'PUSZKA', 'MODUŁ MONTAŻOWY', 'OSŁONA', 'OBEJM', 'WKRĘT'];

function isLikelyProductCode(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim();
  if (t.length < 2 || t.length > 60) return false;
  
  // Ignoruj maile i adresy www (częste w stopkach katalogów)
  if (t.includes('@') || t.toLowerCase().includes('www.') || t.toLowerCase().includes('http')) return false;

  // Produkty Pulsar i inne mogą mieć spacje, ale nie przecinki w symbolu
  if (t.includes(',')) return false;
  if (t.split(/\s+/).length > 6) return false; 

  const upperCount = (t.match(/[A-Z0-9]/g) || []).length;
  // Bardzo krótkie symbole (jak K-1, S-1) akceptujemy zawsze jeśli mają cyfry/litery
  if (t.length <= 4) return upperCount >= 1;
  if (t.length > 10 && upperCount / t.length < 0.2) return false;

  return true;
}

function parsePrice(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  const clean = String(val).replace(',', '.').replace(/[^\d.]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

/**
 * Inteligentne łączenie nowej wiedzy z istniejącą.
 * Jeśli produkt już istnieje, uzupełniamy brakujące pola.
 */
function mergeKnowledgeEntry(current: KnowledgeStore, symbol: string, entry: KnowledgeEntry) {
  const normSymbol = symbol.toUpperCase().trim().replace(/\s+/g, '-');
  const existing = current.knowledge[normSymbol];

  if (!existing) {
    current.knowledge[normSymbol] = entry;
    return true;
  }

  // Jeśli istnieje, połącz dane:
  // 1. Cena: weź nową, jeśli stara jest nullem
  if (entry.price !== null && (existing.price === null || existing.price === undefined)) {
    existing.price = entry.price;
  }

  // 2. Opis: zachowaj dłuższy/bogatszy opis
  if (entry.specs.length > (existing.specs?.length || 0)) {
    existing.specs = entry.specs;
  }

  // 3. Źródło: dodaj informację o nowym źródle (opcjonalnie)
  if (entry.source !== existing.source) {
    existing.source = `${existing.source}, ${entry.source}`;
  }

  return false;
}

// --- PARSERS ---

export async function parseExcel(buffer: Buffer, filename: string, onProgress?: ProgressCallback): Promise<number> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const currentStore = await getKnowledge();
  let totalAddedCount = 0;
  const currentDate = new Date().toISOString().split('T')[0];

  onProgress?.({ type: 'log', message: `Rozpoczęto analizę arkusza: ${filename}` });

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (rawRows.length === 0) continue;

    onProgress?.({ type: 'log', message: `Przetwarzanie arkusza: ${sheetName} (${rawRows.length} wierszy)...` });

    let headerRowIndex = -1;
    let columnMap: { model: number; specs: number; price: number | null } = { model: 0, specs: 1, price: null };

    for (let i = 0; i < Math.min(rawRows.length, 100); i++) {
      const row = rawRows[i];
      if (!Array.isArray(row)) continue;
      
      const foundMap: any = {};
      row.forEach((cell, cellIndex) => {
        if (!cell) return;
        const cellText = String(cell).toUpperCase().trim();
        if (MODEL_KEYWORDS.some(k => cellText === k || cellText.includes(k))) foundMap.model = cellIndex;
        else if (SPECS_KEYWORDS.some(k => cellText === k || cellText.includes(k))) foundMap.specs = cellIndex;
        else if (PRICE_KEYWORDS.some(k => cellText === k || cellText.includes(k))) foundMap.price = cellIndex;
      });

      if (foundMap.model !== undefined) {
        headerRowIndex = i;
        columnMap = { 
          model: foundMap.model, 
          specs: foundMap.specs !== undefined ? foundMap.specs : (foundMap.model + 1),
          price: foundMap.price !== undefined ? foundMap.price : null
        };
        break;
      }
    }

    if (headerRowIndex === -1) headerRowIndex = 0;

    for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row) continue;
      
      let candidateModel = row[columnMap.model];
      let candidateSpecs = row[columnMap.specs];
      let candidatePrice = columnMap.price !== null ? row[columnMap.price] : null;

      if (!candidateModel) continue;
      const modelText = String(candidateModel).trim();
      if (!isLikelyProductCode(modelText)) continue;

      let finalSpecs = String(candidateSpecs || '').trim();
      let finalPrice = parsePrice(candidatePrice);

      if (finalSpecs.length < 5) {
        const nextRow = rawRows[i + 1];
        if (nextRow) {
            const nextSpecs = nextRow[columnMap.specs] || nextRow[columnMap.model];
            if (nextSpecs && String(nextSpecs).length > 5 && !isLikelyProductCode(String(nextSpecs))) {
                finalSpecs = String(nextSpecs).trim();
                if (finalPrice === null && columnMap.price !== null) {
                    finalPrice = parsePrice(nextRow[columnMap.price]);
                }
            }
        }
      }

      if (finalSpecs.length >= 3) {
        const specsUpper = finalSpecs.toUpperCase();
        const modelKey = modelText.toUpperCase();
        const actualSymbol = modelText.toUpperCase();

        // Filtrujemy SŁOWA KLUCZOWE tylko w Symbolu (nie w opisie!)
        const isNonDevice = NON_DEVICE_KEYWORDS.some(k => actualSymbol.includes(k));

        if (!isNonDevice) {
          const entry: KnowledgeEntry = {
            specs: finalSpecs,
            price: finalPrice,
            currency: 'PLN',
            source: filename,
            date: currentDate
          };

          const validation = KnowledgeEntrySchema.safeParse(entry);
          if (validation.success) {
            mergeKnowledgeEntry(currentStore, actualSymbol, validation.data);
            totalAddedCount++;
            onProgress?.({ type: 'progress', message: `Przetworzono model: ${actualSymbol}`, count: totalAddedCount });
          }
        }
      }
    }
  }

  if (totalAddedCount > 0) {
    currentStore.lastUpdated = new Date().toISOString();
    if (!currentStore.sources.includes(filename)) currentStore.sources.push(filename);
    await saveKnowledge(currentStore);
  }
  return totalAddedCount;
}

export async function parsePDFWithAI(
  buffer: Buffer, 
  filename: string, 
  apiKey: string, 
  modelId: string, 
  availableModels: string[] = [], 
  onProgress?: ProgressCallback
): Promise<number> {
  const modelPool = availableModels.length > 0 ? availableModels : [modelId];
  let currentModelIndex = modelPool.indexOf(modelId);
  if (currentModelIndex === -1) currentModelIndex = 0;

  try {
    const currentStore = await getKnowledge();
    const currentDate = new Date().toISOString().split('T')[0];
    let totalAddedCount = 0;

    onProgress?.({ type: 'log', message: `Uruchamianie Silnika V2 dla: ${filename}` });

    // --- KROK 1: Lokalna Ekstrakcja Tekstu ---
    let extractedData;
    try {
      extractedData = await pdfParse(buffer);
    } catch (e) {
      onProgress?.({ type: 'log', message: `Błąd lokalnej ekstrakcji: ${e}. Próba trybu wizyjnego...` });
    }

    const fullText = extractedData?.text || "";
    const pageCount = extractedData?.numpages || 1;
    const isDigital = fullText.length > (pageCount * 50); // Heurystyka: dokument cyfrowy ma > 50 znaków na stronę

    if (isDigital) {
      onProgress?.({ type: 'log', message: `Wykryto dokument cyfrowy (${fullText.length} znaków). Rozpoczynam Path A (Tekst).` });
      
      // Path A: Ekstrakcja z tekstu (Szybka, Stabilna, 0 błędów 503)
      // Dzielimy na duże bloki po ok 15,000 znaków (~10-15 stron)
      const chunkSize = 15000;
      const chunks: string[] = [];
      for (let i = 0; i < fullText.length; i += chunkSize) {
        chunks.push(fullText.substring(i, i + chunkSize));
      }

      for (let i = 0; i < chunks.length; i++) {
        const percent = Math.round((i / chunks.length) * 100);
        onProgress?.({ type: 'log', message: `Analiza bloku tekstowego ${i + 1}/${chunks.length}...`, percent });

        let batchDone = false;
        let batchRetries = 0;

        while (!batchDone && batchRetries < 3) {
          try {
            const selectedModel = modelPool[currentModelIndex];
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

            const prompt = `Jesteś specjalistą od ekstrakcji danych technicznych B2B. 
            Twoim zadaniem jest wyciągnięcie KAŻDEGO produktu z poniższego tekstu cennika. 
            NIE POMIJAJ żadnej pozycji, nawet akcesoriów czy czujek.

            FORMAT JSON: [{"model": "KOD", "specs": "OPIS", "price": NETTO_NUM}]
            ZASADY:
            1. Model: symbol (np. SLIM-PIR-LUNA, SP-4001, AQUA).
            2. Specs: krótki opis parametrów.
            3. Price: cena netto (liczba) lub null.
            4. Jeśli produkt ma warianty, wypisz każdy jako osobny obiekt.
            
            TEKST DO ANALIZY:
            ${chunks[i]}`;

            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { response_mime_type: "application/json" }
              })
            });

            if (!response.ok) {
              if ((response.status === 429 || response.status === 503) && modelPool.length > 1) {
                currentModelIndex = (currentModelIndex + 1) % modelPool.length;
                await new Promise(resolve => setTimeout(resolve, 5000));
                batchRetries++;
                continue;
              }
              throw new Error(`Status ${response.status}`);
            }

            const data = await response.json();
            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
            const extracted = JSON.parse(textResponse.match(/\[\s*\{[\s\S]*\}\s*\]/)?.[0] || "[]");
            
            extracted.forEach((item: any) => {
              if (item.model && item.specs) {
                const modelKey = String(item.model).toUpperCase().trim();
                const entry: KnowledgeEntry = {
                  specs: String(item.specs),
                  price: parsePrice(item.price),
                  currency: 'PLN',
                  source: filename,
                  date: currentDate
                };
                if (KnowledgeEntrySchema.safeParse(entry).success) {
                  mergeKnowledgeEntry(currentStore, modelKey, entry);
                  totalAddedCount++;
                  onProgress?.({ type: 'progress', message: `Znaleziono: ${modelKey}`, count: totalAddedCount });
                }
              }
            });
            batchDone = true;
          } catch (err) {
            batchRetries++;
            if (batchRetries >= 3) break;
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      }
    } else {
      // Path B: Fallback Wizyjny (Zoptymalizowany pod 503)
      onProgress?.({ type: 'log', message: `Wykryto dokument skanowany. Uruchamiam Path B (OCR/Vision).` });
      
      const pdfDoc = await PDFDocument.load(buffer);
      const visualPageCount = pdfDoc.getPageCount();
      let batchSize = 2; 

      for (let i = 0; i < visualPageCount; i += batchSize) {
        const currentBatchStart = i;
        const currentBatchEnd = Math.min(i + batchSize, visualPageCount);
        const percent = Math.round((currentBatchStart / visualPageCount) * 100);
        onProgress?.({ type: 'log', message: `Analiza wizyjna stron ${currentBatchStart + 1}-${currentBatchEnd}...`, percent });

        if (i > 0) await new Promise(resolve => setTimeout(resolve, 6000));

        let batchDone = false;
        let batchRetries = 0;

        while (!batchDone && batchRetries < 3) {
          try {
            const subDoc = await PDFDocument.create();
            const pageIndexes = Array.from({length: currentBatchEnd - currentBatchStart}, (_, idx) => currentBatchStart + idx);
            const copiedPages = await subDoc.copyPages(pdfDoc, pageIndexes);
            copiedPages.forEach(p => subDoc.addPage(p));
            const base64Data = (Buffer.from(await subDoc.save())).toString('base64');
            
            const selectedModel = modelPool[currentModelIndex];
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [
                  { text: "EKSTRAKCJA B2B JSON: Wyciągnij KAŻDY produkt z obrazu. [{"model": "KOD", "specs": "OPIS", "price": NETTO_NUM}]" },
                  { inline_data: { mime_type: "application/pdf", data: base64Data } }
                ]}],
                generationConfig: { response_mime_type: "application/json" }
              })
            });

            if (!response.ok) {
              if (response.status === 503) {
                batchSize = 1;
                await new Promise(resolve => setTimeout(resolve, 20000));
              }
              currentModelIndex = (currentModelIndex + 1) % modelPool.length;
              batchRetries++;
              continue;
            }

            const data = await response.json();
            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
            const extracted = JSON.parse(textResponse.match(/\[\s*\{[\s\S]*\}\s*\]/)?.[0] || "[]");
            
            extracted.forEach((item: any) => {
              if (item.model && item.specs) {
                const modelKey = String(item.model).toUpperCase().trim();
                const entry: KnowledgeEntry = {
                  specs: String(item.specs),
                  price: parsePrice(item.price),
                  currency: 'PLN',
                  source: filename,
                  date: currentDate
                };
                if (KnowledgeEntrySchema.safeParse(entry).success) {
                  mergeKnowledgeEntry(currentStore, modelKey, entry);
                  totalAddedCount++;
                  onProgress?.({ type: 'progress', message: `Znaleziono: ${modelKey}`, count: totalAddedCount });
                }
              }
            });
            batchDone = true;
          } catch (err) {
            batchRetries++;
            if (batchRetries >= 3) break;
          }
        }
      }
    }

    if (totalAddedCount > 0) {
      currentStore.lastUpdated = new Date().toISOString();
      if (!currentStore.processedSources.includes(filename)) currentStore.processedSources.push(filename);
      await saveKnowledge(currentStore);
      onProgress?.({ type: 'log', message: `Zakończono. Dodano ${totalAddedCount} modeli z pliku ${filename}.` });
    }

    onProgress?.({ type: 'progress', message: `Gotowe!`, percent: 100 });
    return totalAddedCount;

  } catch (err) {
    onProgress?.({ type: 'error', message: `Krytyczny błąd V2: ${err}` });
    throw err;
  }
}
