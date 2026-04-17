import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
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
    const pdfDoc = await PDFDocument.load(buffer);
    const pageCount = pdfDoc.getPageCount();
    const currentStore = await getKnowledge();
    const currentDate = new Date().toISOString().split('T')[0];
    let totalAddedCount = 0;

    onProgress?.({ type: 'log', message: `Rozpoczęto analizę AI dla PDF: ${filename} (${pageCount} stron)` });

    let batchSize = 2; 

    for (let i = 0; i < pageCount; i += batchSize) {
      const currentBatchStart = i;
      const currentBatchEnd = Math.min(i + batchSize, pageCount);
      const percent = Math.round((currentBatchStart / pageCount) * 100);
      
      onProgress?.({ type: 'log', message: `Analizowanie zakresem stron ${currentBatchStart + 1}-${currentBatchEnd}...`, percent });

      // Zwiększony throttle dla stabilności
      if (i > 0) await new Promise(resolve => setTimeout(resolve, 6000));

      let batchDone = false;
      let batchRetries = 0;

      while (!batchDone && batchRetries < 3) {
        try {
          const subDoc = await PDFDocument.create();
          const pageIndexes = Array.from({length: currentBatchEnd - currentBatchStart}, (_, idx) => currentBatchStart + idx);
          const copiedPages = await subDoc.copyPages(pdfDoc, pageIndexes);
          copiedPages.forEach(p => subDoc.addPage(p));
          
          const pageBuffer = Buffer.from(await subDoc.save());
          const base64Data = pageBuffer.toString('base64');
          
          const selectedModel = modelPool[currentModelIndex];
          let url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

          // Zoptymalizowany, krótki prompt (oszczędność tokenów)
          const prompt = `EKSTRAKCJA B2B JSON: [{"model": "KOD", "specs": "OPIS", "price": NETTO_NUM}].
          ZASADY:
          1. Model: symbol techniczny (np. AQUA, SP-4001, GZ-1).
          2. Specs: krótki opis funkcjonalny.
          3. Price: liczba netto (np. 150.50), lub null.
          4. Wyciągnij WSZYSTKO: Centrale, Czujki, Sygnalizatory, Kontaktrony, Akcesoria.
          5. Pomiń kable oraz KONTAKT (maile, www).`;

          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [
                { text: prompt },
                { inline_data: { mime_type: "application/pdf", data: base64Data } }
              ]}],
              generationConfig: {
                response_mime_type: "application/json"
              }
            })
          });

          if (!response.ok) {
            // Obsługa limitów (429), niekompatybilności (400), braku modelu (404) lub błędów serwera (500, 503, 504)
            if ((response.status === 429 || response.status === 400 || response.status === 404 || 
                 response.status === 500 || response.status === 503 || response.status === 504) && modelPool.length > 1) {
              const prevModel = selectedModel;
              currentModelIndex = (currentModelIndex + 1) % modelPool.length;
              const nextModel = modelPool[currentModelIndex];
              
              let reason = `Status ${response.status}`;
              const backoff = (batchRetries + 1) * 2000;
              let waitTime = backoff;

              if (response.status === 503) {
                reason = 'Serwer przeciążony (503)';
                waitTime = 20000; // Agresywne 20s czekania na odblokowanie
                batchSize = 1;    // Redukcja do 1 strony po błędzie 503
              } else if (response.status === 429) {
                reason = 'Limit RPM';
              } else if (response.status === 400) {
                reason = 'Niekompatybilny model';
              } else if (response.status === 404) {
                reason = 'Model niedostępny (404)';
              } else if (response.status === 500) {
                reason = 'Błąd wewnętrzny AI (500)';
              } else if (response.status === 504) {
                reason = 'Timeout bramy (504)';
              }
              
              onProgress?.({ type: 'log', message: `${reason} dla ${prevModel}. Przełączanie na ${nextModel} (czekam ${waitTime}ms)...` });
              await new Promise(resolve => setTimeout(resolve, waitTime));
              
              if (currentModelIndex === 0) batchRetries++; 
              continue;
            }
            
            batchRetries++;
            onProgress?.({ type: 'error', message: `Błąd API ${selectedModel} (próba ${batchRetries}): Status ${response.status}` });
            if (batchRetries >= 3) break; 
            continue;
          }

          const data = await response.json();
          if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            const textResponse = data.candidates[0].content.parts[0].text.trim();
            const jsonMatch = textResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
            
            if (jsonMatch) {
              try {
                const extracted = JSON.parse(jsonMatch[0]);
                let batchCount = 0;
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
                    
                    const validation = KnowledgeEntrySchema.safeParse(entry);
                    if (validation.success) {
                      mergeKnowledgeEntry(currentStore, modelKey, validation.data);
                      totalAddedCount++;
                      batchCount++;
                      onProgress?.({ type: 'progress', message: `Znaleziono: ${modelKey}`, count: totalAddedCount });
                    }
                  }
                });
                onProgress?.({ type: 'log', message: `Wyciągnięto ${batchCount} modeli z paczki ${i + 1}-${currentBatchEnd}.` });
              } catch (parseErr) {
                onProgress?.({ type: 'error', message: `Błąd struktury JSON w paczki ${i + 1}-${currentBatchEnd}. Pomijanie...` });
              }
            }
          }
          batchDone = true;
        } catch (err) {
          batchRetries++;
          onProgress?.({ type: 'error', message: `Błąd paczki: ${err}` });
          if (batchRetries >= 3) break;
        }
      }
    }

    if (totalAddedCount > 0) {
      currentStore.lastUpdated = new Date().toISOString();
      if (!currentStore.processedSources.includes(filename)) currentStore.processedSources.push(filename);
      await saveKnowledge(currentStore);
      onProgress?.({ type: 'log', message: `Zapisano bazę wiedzy. Łącznie dodano ${totalAddedCount} modeli.` });
    }

    onProgress?.({ type: 'progress', message: `Zakończono analizę pliku ${filename}.`, percent: 100 });
    return totalAddedCount;
  } catch (err) {
    onProgress?.({ type: 'error', message: `Krytyczny błąd PDF: ${err}` });
    throw err;
  }
}
