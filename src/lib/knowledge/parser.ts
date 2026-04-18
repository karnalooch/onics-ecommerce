import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';
import { KnowledgeStore, KnowledgeEntry, KnowledgeEntrySchema, ProgressCallback } from './types';

import { ToolkitParser } from './ToolkitParser';

const KNOWLEDGE_PATH = path.join(process.cwd(), 'src/store/catalogKnowledge.json');

// Removed local definition as it is now in types.ts

interface AIItem {
  model: string;
  specs: string;
  price?: number | null;
}

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

// --- CONFIG & UTILS ---

const MODEL_KEYWORDS = ['MODEL', 'SYMBOL', 'KOD', 'SKU', 'ARTYKUŁ', 'INDEKS', 'PRODUKT', 'NAZWA TOWARU', 'PRODUCT MODEL', 'SERIES', 'NAZWA'];
const SPECS_KEYWORDS = ['OPIS', 'SPECYFIKACJA', 'PARAMETRY', 'CECHY', 'FUNKCJE', 'DESCRIPTION', 'DANE TECHNICZNE'];
const PRICE_KEYWORDS = ['NETTO', 'CENA', 'PRICE', 'WARTOŚĆ', 'NET', 'DETAL', 'HURT', 'CENA PL', 'PLN'];
const NON_DEVICE_KEYWORDS = ['KABEL', 'PRZEWÓD', 'WTYK', 'ZŁĄCZE', 'UCHWYT', 'KOŁEK', 'ŚRUBA', 'RURA', 'KORYTO', 'PUSZKA', 'MODUŁ MONTAŻOWY', 'OSŁONA', 'OBEJM', 'WKRĘT'];

function isLikelyProductCode(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim();
  if (t.length < 2 || t.length > 60) return false;
  
  if (t.includes('@') || t.toLowerCase().includes('www.') || t.toLowerCase().includes('http')) return false;
  if (t.includes(',')) return false;
  if (t.split(/\s+/).length > 6) return false; 

  const upperCount = (t.match(/[A-Z0-9]/g) || []).length;
  if (t.length <= 4) return upperCount >= 1;
  if (t.length > 10 && upperCount / t.length < 0.2) return false;

  return true;
}

function parsePrice(val: any): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  
  // Toolkit Pattern: resilient-price-parsing
  // Czyścimy wszystko co nie jest cyfrą, kropką lub przecinkiem
  let clean = String(val)
    .replace(/\s/g, '') // Usuń spacje
    .replace(/[^\d.,-]/g, '') // Usuń waluty (zł, $, PLN) i inne znaki
    .replace(',', '.'); // Zamień przecinek na kropkę
    
  // Obsługa wielu kropek (np. "1.234.56" -> bierzemy ostatnią)
  if ((clean.match(/\./g) || []).length > 1) {
    const parts = clean.split('.');
    const cents = parts.pop();
    clean = parts.join('') + '.' + cents;
  }

  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

/**
 * Inteligentne łączenie nowej wiedzy z istniejącą.
 */
function mergeKnowledgeEntry(current: KnowledgeStore, symbol: string, entry: KnowledgeEntry) {
  const normSymbol = symbol.toUpperCase().trim().replace(/\s+/g, '-');
  const existing = current.knowledge[normSymbol];

  if (!existing) {
    current.knowledge[normSymbol] = entry;
    return true;
  }

  if (entry.price !== null && (existing.price === null || existing.price === undefined)) {
    existing.price = entry.price;
  }

  if (entry.specs.length > (existing.specs?.length || 0)) {
    existing.specs = entry.specs;
  }

  if (entry.source !== existing.source && !existing.source?.includes(entry.source || '')) {
    existing.source = existing.source ? `${existing.source}, ${entry.source}` : entry.source;
  }

  return false;
}

/**
 * Przetwarza wynik ekstrakcji do Hub'a Wiedzy.
 */
function processExtractions(results: any[], currentStore: KnowledgeStore, filename: string, currentDate: string, onProgress?: ProgressCallback, baseCount: number = 0, sessionSet?: Set<string>): number {
  let added = 0;
  results.forEach((item) => {
    // Toolkit Pattern: fuzzy-key-matching (Resilient AI parsing)
    if (!item || typeof item !== 'object') return;
    
    // Szukamy kluczy bez względu na wielkość liter i synonimy
    const findValue = (keys: string[]) => {
      const foundKey = Object.keys(item).find(k => {
        const lowerK = k.toLowerCase();
        return keys.some(target => lowerK === target || lowerK.includes(target));
      });
      return foundKey ? item[foundKey] : undefined;
    };

    const model = findValue(['model', 'symbol', 'kod', 'product', 'id', 'artykul', 'nazwa', 'item']);
    const specs = findValue(['specs', 'opis', 'description', 'desc', 'specyfikacja', 'paramet']);
    const price = findValue(['price', 'cena', 'netto', 'cost', 'val', 'price_net']);

    if (model && (specs || price)) {
      const modelKey = String(model).toUpperCase().trim();
      const entry: KnowledgeEntry = {
        specs: String(specs),
        price: parsePrice(price),
        currency: 'PLN',
        source: filename,
        date: currentDate
      };
      if (KnowledgeEntrySchema.safeParse(entry).success) {
        mergeKnowledgeEntry(currentStore, modelKey, entry);
        
        // Zliczamy tylko unikalne modele w danej sesji (Deduplikacja)
        if (sessionSet && !sessionSet.has(modelKey)) {
          sessionSet.add(modelKey);
          added++;
        } else if (!sessionSet) {
          added++; // Fallback
        }
        
        onProgress?.({ 
          type: 'progress', 
          message: `Otrzymano: ${modelKey}`, 
          count: baseCount + added 
        });
      }
    }
  });
  return added;
}

// --- PARSERS ---

export async function parseExcel(
  buffer: Buffer, 
  filename: string, 
  onProgress?: ProgressCallback,
  aiConfig?: { apiKey: string, modelId: string, availableModels?: string[] }
): Promise<{ count: number, stats: any }> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const currentStore = await getKnowledge();
  const sessionSet = new Set<string>();
  let totalAddedCount = 0;
  const currentDate = new Date().toISOString().split('T')[0];
  
  const toolkit = aiConfig?.apiKey ? new ToolkitParser({ 
    apiKey: aiConfig.apiKey, 
    modelId: aiConfig.modelId, 
    availableModels: aiConfig.availableModels 
  }) : null;

  onProgress?.({ type: 'log', message: `Start XLS: ${filename} ${toolkit ? '(Tryb AI)' : '(Tryb Lokalny)'}` });

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (rawRows.length === 0) continue;

    onProgress?.({ type: 'log', message: `Arkusz: ${sheetName}` });

    let headerRowIndex = -1;
    let columnMap: { model: number; specs: number; price: number | null } = { model: 0, specs: 1, price: null };

    // Wykrywanie nagłówków
    for (let i = 0; i < Math.min(rawRows.length, 100); i++) {
      const row = rawRows[i];
      if (!Array.isArray(row)) continue;
      
      const foundMap: any = {};
      row.forEach((cell, cellIndex) => {
        if (!cell) return;
        const cellText = String(cell).toUpperCase().trim();
        // Ignorujemy długie zdania (np. "Zakup produktów podlega..."), które mogą zawierać słowa kluczowe
        if (cellText.length > 35) return; 

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

    if (columnMap.price === null) {
      for (let i = headerRowIndex; i < Math.min(rawRows.length, headerRowIndex + 20); i++) {
        const row = rawRows[i];
        if (row && isLikelyProductCode(String(row[columnMap.model] || ''))) {
          const possiblePrice = row[columnMap.model + 2];
          if (possiblePrice !== undefined && possiblePrice !== '' && !isNaN(parseFloat(possiblePrice))) {
            columnMap.price = columnMap.model + 2;
            break;
          }
        }
      }
    }

    // Ekstrakcja danych w paczkach dla płynnego UI
    const totalLines = rawRows.length - (headerRowIndex + 1);
    const excelBatchSize = 50;
    
    const batches = [];
    for (let i = headerRowIndex + 1; i < rawRows.length; i += excelBatchSize) {
      const rowsToProcess = [];
      const batchEnd = Math.min(i + excelBatchSize, rawRows.length);
      for (let j = i; j < batchEnd; j++) {
        const row = rawRows[j];
        if (!row || row.length === 0) continue;
        rowsToProcess.push(row);
      }
      if (rowsToProcess.length > 0) batches.push(rowsToProcess);
    }

    // Toolkit Pattern: parallel-batch-processing (Rate-limit safe)
    const concurrentLimit = 3;
    for (let i = 0; i < batches.length; i += concurrentLimit) {
      const batchGroup = batches.slice(i, i + concurrentLimit);
      
      const results = await Promise.all(batchGroup.map(async (rowsToProcess) => {
        if (toolkit) {
          try {
            // Toolkit Pattern: data-compression (Lite Payload)
            // Filtrowanie "szumu" (puste wiersze lub tylko spacje)
            const cleanedRows = rowsToProcess.filter((row: any[]) => 
              row.some(cell => cell !== null && cell !== undefined && String(cell).trim().length > 0)
            );

            if (cleanedRows.length === 0) return { type: 'done', data: [] };

            // Konwersja na ultra-kompaktowy format (CSV-style) zamiast JSON
            const compactBatch = cleanedRows.map((row: any[]) => 
              row.map(c => String(c || '').replace(/[|\n\r]/g, ' ')).join('|')
            ).join('\n');

            const aiResults = await toolkit.extractStructuredData(
              `SYNTEZA B2B (LOW_TOKEN): Przeanalizuj wiersze (format: model|opis|cena|...). 
              Stwórz 'specs' jako syntezę techniczną. Zwróć TABLICĘ JSON: [{"model": "KOD", "specs": "OPIS", "price": CENA}]. 
              Bądź ultra-zwięzły. Jeśli wiersz nie jest produktem, zwróć pustą tablicę [].`,
              compactBatch,
              "text/plain",
              onProgress
            );
            return { type: 'ai', data: aiResults };
          } catch (err) {
            onProgress?.({ type: 'log', message: `Błąd AI dla partii XLS, fallback do lokalnego: ${err}` });
            return { type: 'local', data: rowsToProcess };
          }
        } else {
          return { type: 'local', data: rowsToProcess };
        }
      }));

      // Procesuj zebrane wyniki
      results.forEach((res: any) => {
        if (res.type === 'ai') {
          totalAddedCount += processExtractions(res.data, currentStore, filename, currentDate, onProgress, totalAddedCount, sessionSet);
        } else {
          const localItems = res.data.map((row: any) => ({
            model: String(row[columnMap.model] || '').trim(),
            specs: String(row[columnMap.specs] || 'Brak opisu').trim(),
            price: columnMap.price !== null ? row[columnMap.price] : null
          }));
          totalAddedCount += processExtractions(localItems, currentStore, filename, currentDate, onProgress, totalAddedCount, sessionSet);
        }
      });

      onProgress?.({ 
        type: 'log', 
        message: `Przetworzono partię ${Math.min(i + concurrentLimit, batches.length)} z ${batches.length}`,
        percent: Math.round((Math.min(i + concurrentLimit, batches.length) / batches.length) * 100)
      });
    }
  }

  if (totalAddedCount > 0) {
    currentStore.lastUpdated = new Date().toISOString();
    if (!currentStore.processedSources.includes(filename)) currentStore.processedSources.push(filename);
    await saveKnowledge(currentStore);
  }
  return { 
    count: totalAddedCount, 
    stats: { model: 'Local (No AI)', requests: 0, type: 'Excel' } 
  };
}

export async function parsePDFWithAI(
  buffer: Buffer, 
  filename: string, 
  apiKey: string, 
  modelId: string = 'gemini-1.5-flash', 
  availableModels: string[] = [], 
  onProgress?: ProgressCallback,
): Promise<{ count: number, stats: any }> {
  const toolkit = new ToolkitParser({ apiKey, modelId, availableModels });
  const currentStore = await getKnowledge();
  const sessionSet = new Set<string>();
  const currentDate = new Date().toISOString().split('T')[0];
  let totalAddedCount = 0;

  try {
    onProgress?.({ type: 'log', message: `Toolkit Engine V2: ${filename}` });

    // --- KROK 1: Ekstrakcja Tekstu ---
    let extractedData;
    try {
      const pdf = require('pdf-parse/lib/pdf-parse.js');
      const pdfParse = typeof pdf === 'function' ? pdf : (pdf.default || pdf.PDFParse);
      extractedData = await pdfParse(buffer);
    } catch (e) {
      onProgress?.({ type: 'log', message: `Błąd OCR lokalny: ${e}. Próba trybu wizyjnego...` });
    }

    const fullText = extractedData?.text || "";
    const pageCount = extractedData?.numpages || 1;
    const isDigital = fullText.length > (pageCount * 50);

    if (isDigital) {
      onProgress?.({ type: 'log', message: `Dokument cyfrowy. Chunking (RAG Patterns)...` });
      
      // Toolkit Pattern: rag-patterns (token-safe chunking)
      const chunkSize = 25000;
      const chunks: string[] = [];
      for (let i = 0; i < fullText.length; i += chunkSize) {
        chunks.push(fullText.substring(i, i + chunkSize));
      }

      const pdfBatchSize = 3;
      for (let i = 0; i < chunks.length; i += pdfBatchSize) {
        const batch = chunks.slice(i, i + pdfBatchSize);
        onProgress?.({ type: 'log', message: `Analizowanie partii tekstu ${Math.floor(i/pdfBatchSize) + 1}/${Math.ceil(chunks.length/pdfBatchSize)}...` });
        
        const batchResults = await Promise.all(batch.map(chunk => 
          toolkit.extractStructuredData(
            'SYNTEZA B2B JSON: Wyciągnij listę produktów. Każdy "specs" musi być inteligentną fuzją parametrów (np. "Akumulator LFP 12.8V 46Ah, wymiary: 175x165x195mm, waga: 5.9kg"). Połącz WSZYSTKIE dostępne kolumny techniczne w jeden profesjonalny opis. Zwróć TABLICĘ JSON: [{"model": "KOD", "specs": "SYNTETYCZNY OPIS", "price": CENA}].',
            chunk,
            "text/plain",
            onProgress
          )
        ));

        const flatResults = batchResults.flat();
        const addedInBatch = processExtractions(flatResults, currentStore, filename, currentDate, onProgress, totalAddedCount, sessionSet);
        totalAddedCount += addedInBatch;

        // Toolkit Pattern: checkpoint-saving (Persistent progress)
        if (addedInBatch > 0) {
          currentStore.lastUpdated = new Date().toISOString();
          if (!currentStore.processedSources.includes(filename)) currentStore.processedSources.push(filename);
          await saveKnowledge(currentStore);
        }

        onProgress?.({ 
          type: 'log', 
          message: `Partia ${Math.floor(i/pdfBatchSize) + 1} gotowa (+${addedInBatch} modeli)`,
          percent: Math.round(((i + batch.length) / chunks.length) * 100)
        });
      }
    } else {
      // Path B: OCR Vision (Toolkit optimized)
      onProgress?.({ type: 'log', message: `Dokument skanowany. Multimodal segmentation...` });
      
      const pdfDoc = await PDFDocument.load(buffer);
      const visualPageCount = pdfDoc.getPageCount();
      const batchSize = 2;
      const concurrentLimit = 2; // Dla wizyjnego limity są bardziej restrykcyjne

      const pageBatches = [];
      for (let i = 0; i < visualPageCount; i += batchSize) {
        pageBatches.push({ start: i, end: Math.min(i + batchSize, visualPageCount) });
      }

      for (let i = 0; i < pageBatches.length; i += concurrentLimit) {
        const currentGroup = pageBatches.slice(i, i + concurrentLimit);
        
        const groupResults = await Promise.all(currentGroup.map(async (pBatch) => {
          const subDoc = await PDFDocument.create();
          const pageIndexes = Array.from({length: pBatch.end - pBatch.start}, (_, idx) => pBatch.start + idx);
          const copiedPages = await subDoc.copyPages(pdfDoc, pageIndexes);
          copiedPages.forEach(p => subDoc.addPage(p));
          const subBuffer = Buffer.from(await subDoc.save());

          return await toolkit.extractStructuredData(
            'WIZYJNA SYNTEZA B2B JSON: Wyciągnij KAŻDY produkt z obrazu. Stwórz "specs" jako profesjonalną syntezę wszystkich parametrów technicznych widocznych w tabeli (wymiary, waga, napięcie itp.). Zwróć tablicę: [{"model": "KOD", "specs": "SYNTETYCZNY OPIS TECHNICZNY", "price": CENA}].',
            subBuffer,
            "application/pdf",
            onProgress
          );
        }));

        const flatResults = groupResults.flat();
        const addedInBatch = processExtractions(flatResults, currentStore, filename, currentDate, onProgress, totalAddedCount, sessionSet);
        totalAddedCount += addedInBatch;
        
        if (addedInBatch > 0) {
          currentStore.lastUpdated = new Date().toISOString();
          if (!currentStore.processedSources.includes(filename)) currentStore.processedSources.push(filename);
          await saveKnowledge(currentStore);
        }

        onProgress?.({ 
          type: 'log', 
          message: `Przetworzono partię wizyjną ${Math.min(i + concurrentLimit, pageBatches.length)} z ${pageBatches.length}`,
          percent: Math.round((Math.min(i + concurrentLimit, pageBatches.length) / pageBatches.length) * 100)
        });
      }
    }

    onProgress?.({ 
      type: 'progress', 
      message: `Uczenie zakończone! Przeanalizowano: ${totalAddedCount}`, 
      count: totalAddedCount,
      percent: 100 
    });
    return { 
      count: totalAddedCount, 
      stats: toolkit.getStats() 
    };

  } catch (err) {
    onProgress?.({ type: 'error', message: `Błąd Toolkit Parser: ${err}` });
    throw err;
  }
}
