import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';

const KNOWLEDGE_PATH = path.join(process.cwd(), 'src/store/catalogKnowledge.json');

export interface KnowledgeEntry {
  specs: string;
  price: number | null;
  currency: string;
  source?: string;
  date?: string;
}

export interface KnowledgeStore {
  lastUpdated: string | null;
  sources: string[];
  processedSources: string[];
  knowledge: Record<string, KnowledgeEntry>;
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

const MODEL_KEYWORDS = ['MODEL', 'SYMBOL', 'KOD', 'SKU', 'ARTYKUŁ', 'INDEKS', 'PRODUKT', 'NAZWA TOWARU', 'PRODUCT MODEL', 'SERIES'];
const SPECS_KEYWORDS = ['OPIS', 'SPECYFIKACJA', 'PARAMETRY', 'CECHY', 'NAZWA', 'FUNKCJE', 'DESCRIPTION'];
const NON_DEVICE_KEYWORDS = ['KABEL', 'PRZEWÓD', 'WTYK', 'ZŁĄCZE', 'UCHWYT', 'KOŁEK', 'ŚRUBA', 'RURA', 'KORYTO', 'PUSZKA', 'MODUŁ MONTAŻOWY', 'OSŁONA', 'OBEJM', 'WKRĘT'];

export async function parseExcel(buffer: Buffer, filename: string): Promise<number> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const currentStore = await getKnowledge();
  let totalAddedCount = 0;
  const currentDate = new Date().toISOString().split('T')[0];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (rawRows.length === 0) continue;

    let headerRowIndex = -1;
    let columnMap: Record<string, number> = {};

    for (let i = 0; i < Math.min(rawRows.length, 100); i++) {
      const row = rawRows[i];
      if (!Array.isArray(row)) continue;
      const foundMap: Record<string, number> = {};
      row.forEach((cell, cellIndex) => {
        if (!cell) return;
        const cellText = String(cell).toUpperCase().trim();
        if (MODEL_KEYWORDS.some(k => cellText === k || cellText.includes(k))) foundMap.model = cellIndex;
        else if (SPECS_KEYWORDS.some(k => cellText === k || cellText.includes(k))) foundMap.specs = cellIndex;
      });
      if (foundMap.model !== undefined && foundMap.specs !== undefined) {
        headerRowIndex = i;
        columnMap = foundMap;
        console.log(`[Excel Parser] Found headers at row ${i} in sheet ${sheetName}:`, foundMap);
        break;
      }
    }

    if (headerRowIndex === -1) {
      columnMap = { model: 0, specs: 1 };
      headerRowIndex = 0; 
    }

    for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.length < 2) continue;
      const model = row[columnMap.model];
      const specs = row[columnMap.specs];
      if (model && specs) {
        const modelText = String(model).trim();
        const specsText = String(specs).trim();
        // Poluzowano reguły dla Hikvision
        if (modelText.length > 80 || modelText.split(' ').length > 6) continue;
        if (specsText.length < 3) continue;
        const modelKey = modelText.toUpperCase();
        const specsUpper = specsText.toUpperCase();
        if (!NON_DEVICE_KEYWORDS.some(k => modelKey.includes(k) || specsUpper.includes(k))) {
          currentStore.knowledge[modelKey] = {
            specs: specsText, price: null, currency: 'PLN', source: filename, date: currentDate
          };
          totalAddedCount++;
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

export async function parsePDFWithAI(buffer: Buffer, filename: string, apiKey: string, modelId?: string): Promise<number> {
  try {
    const pdfDoc = await PDFDocument.load(buffer);
    const pageCount = pdfDoc.getPageCount();
    const currentStore = await getKnowledge();
    const currentDate = new Date().toISOString().split('T')[0];
    let totalAddedCount = 0;

    const logPath = path.join(process.cwd(), 'public/debug-ropam.txt');
    fs.appendFileSync(logPath, `\n\n=== BATCH PROCESSING: ${filename} (${new Date().toLocaleString()}) ===\n`);

    const batchSize = 15;
    console.log(`Starting PDF Processing in LARGE BATCHES (${batchSize} pages per AI call). Total: ${pageCount} pages.`);

    for (let i = 0; i < pageCount; i += batchSize) {
      const currentBatchStart = i;
      const currentBatchEnd = Math.min(i + batchSize, pageCount);
      console.log(`Processing Group: Pages ${currentBatchStart + 1} to ${currentBatchEnd}...`);
      
      // Delay only between batches (to stay well below 10 RPM)
      if (i > 0) await new Promise(resolve => setTimeout(resolve, 10000));

      let batchDone = false;
      let retries = 0;
      const maxRetries = 2;

      while (!batchDone && retries <= maxRetries) {
        try {
          const subDoc = await PDFDocument.create();
          const pageIndexes = Array.from({length: currentBatchEnd - currentBatchStart}, (_, idx) => currentBatchStart + idx);
          const copiedPages = await subDoc.copyPages(pdfDoc, pageIndexes);
          copiedPages.forEach(p => subDoc.addPage(p));
          
          const pageBuffer = Buffer.from(await subDoc.save());
          const base64Data = pageBuffer.toString('base64');
          
          const selectedModel = modelId || 'gemini-1.5-flash';
          let url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

          const prompt = `Jesteś ekspertem systemów zabezpieczeń (CCTV, Alarmy, B2B).
          TWOJE ZADANIE: Przeanalizuj dostarczone kilka STRON katalogu technicznego i wyciągnij produkty.
          Zwróć TYLKO czysty JSON jako tablicę obiektów: [{"model": "KOD_PRODUKTU", "specs": "DOKŁADNY OPIS"}]
          Ignoruj ceny i nagłówki.`;

          let response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [
                { text: prompt },
                { inline_data: { mime_type: "application/pdf", data: base64Data } }
              ]}]
            })
          });

          if (response.status === 404 && selectedModel !== 'gemini-1.5-flash') {
            console.log(`[Parser] Model ${selectedModel} returned 404. Falling back to gemini-1.5-flash.`);
            url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [
                  { text: prompt },
                  { inline_data: { mime_type: "application/pdf", data: base64Data } }
                ]}]
              })
            });
          }

          if (response.status === 429) {
            console.warn(`Rate Limit hit (429) on batch starting at ${i+1}. Waiting 30s...`);
            fs.appendFileSync(logPath, `BATCH ${currentBatchStart + 1}-${currentBatchEnd} RATE LIMIT. Retry ${retries+1} in 30s.\n`);
            await new Promise(resolve => setTimeout(resolve, 30000));
            retries++;
            continue;
          }

          if (!response.ok) {
            fs.appendFileSync(logPath, `BATCH ${currentBatchStart + 1}-${currentBatchEnd} ERROR: Status ${response.status}\n`);
            batchDone = true;
            continue;
          }

          if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            let textResponse = data.candidates[0].content.parts[0].text.trim();
            fs.appendFileSync(logPath, `BATCH ${currentBatchStart + 1}-${currentBatchEnd} RAW:\n${textResponse}\n`);
            
            try {
              const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
              const extracted = JSON.parse(jsonMatch ? jsonMatch[0] : textResponse);
              
              Object.entries(extracted).forEach(([model, specs]) => {
                const modelKey = String(model).toUpperCase().trim();
                if (modelKey && specs) {
                  currentStore.knowledge[modelKey] = {
                    specs: String(specs), price: null, currency: 'PLN', source: filename, date: currentDate
                  };
                  totalAddedCount++;
                }
              });
            } catch (e) {
              console.error(`Batch JSON parse error:`, e);
            }
          }
          batchDone = true;
        } catch (err) {
          console.error(`Error processing batch:`, err);
          batchDone = true;
        }
      }
    }

    if (totalAddedCount > 0) {
      currentStore.lastUpdated = new Date().toISOString();
      if (!currentStore.processedSources.includes(filename)) {
        currentStore.processedSources.push(filename);
      }
      await saveKnowledge(currentStore);
    }

    console.log(`PDF Processing Finished: Saved ${totalAddedCount} models from ${filename}.`);
    fs.appendFileSync(logPath, `=== END BATCH PROCESSING: Total models: ${totalAddedCount} ===\n`);

    return totalAddedCount;
  } catch (err) {
    console.error("PDF Global Processing Error:", err);
    throw err;
  }
}
