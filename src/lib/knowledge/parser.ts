import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

import { KnowledgeStore, KnowledgeEntry, KnowledgeEntrySchema, ProgressCallback, ParserOptions } from './types';

import { ToolkitParser } from './ToolkitParser';

// Knowledge storage is now fully integrated into db.json via serverStore

// Removed local definition as it is now in types.ts

interface AIItem {
  model: string;
  specs: string;
  price?: number | null;
}

import { initializeMockData, mutateMockData } from '@/store/serverStore';

type KnowledgeDbSnapshot = {
  products: any[];
  knowledgeMeta?: {
    sources?: unknown;
    processedSources?: unknown;
    lastUpdated?: unknown;
  };
}

export function buildKnowledgeFromDb(db: KnowledgeDbSnapshot): KnowledgeStore {
  const knowledgeMap: Record<string, KnowledgeEntry> = {};

  db.products.forEach((product: any) => {
    if (!product.sku) return;

    knowledgeMap[product.sku] = {
      model: product.name,
      specs: product.specs || product.seoDescription || "",
      price: product.catalogPrice || product.price || 0,
      manufacturer: product.manufacturer,
      currency: "PLN",
      lastUpdated: product.lastUpdated || new Date().toISOString()
    };
  });

  const meta = db.knowledgeMeta || {};

  return {
    lastUpdated:
      typeof meta.lastUpdated === "string"
        ? meta.lastUpdated
        : new Date().toISOString(),
    sources: Array.isArray(meta.sources) ? meta.sources.filter((entry): entry is string => typeof entry === "string") : [],
    processedSources: Array.isArray(meta.processedSources)
      ? meta.processedSources.filter((entry): entry is string => typeof entry === "string")
      : [],
    knowledge: knowledgeMap
  };
}

export async function getKnowledge(): Promise<KnowledgeStore> {
  try {
    return buildKnowledgeFromDb(initializeMockData());
  } catch (e) {
    console.error("[KNOWLEDGE-BRIDGE] Bridge failure:", e);
    return { lastUpdated: null, sources: [], processedSources: [], knowledge: {} };
  }
}

/**
 * Funkcja pomocnicza do mapowania nazw tekstowych na ID kategorii i podkategorii z db.json.
 */
function resolveCategoryIds(categoryName: string | undefined, subcategoryName: string | undefined, db: any) {
  if (!db.categories) return { categoryId: "c_auto_th95x", subcategoryId: "s_auto_other" };

  const normCat = categoryName?.toLowerCase().trim();
  const normSub = subcategoryName?.toLowerCase().trim();

  // 1. Znajdź Kategorię
  let foundCategory = db.categories.find((c: any) => 
    c.name.toLowerCase().trim() === normCat || 
    normCat?.includes(c.name.toLowerCase().trim()) ||
    c.name.toLowerCase().trim().includes(normCat || "")
  );

  // Jeśli nie znaleziono po nazwie, spróbuj przeszukać podkategorie (często w plikach są zamienione)
  if (!foundCategory && normSub) {
    foundCategory = db.categories.find((c: any) => 
      c.subcategories?.some((s: any) => s.name.toLowerCase().trim() === normSub)
    );
  }

  const categoryId = foundCategory?.id || "c_auto_other"; // Default fallback

  // 2. Znajdź Podkategorię w obrębie znalezionej (lub dowolnej) kategorii
  let subcategoryId = "s_auto_other";
  if (foundCategory && normSub) {
    const sub = foundCategory.subcategories?.find((s: any) => 
      s.name.toLowerCase().trim() === normSub || 
      normSub.includes(s.name.toLowerCase().trim()) ||
      s.name.toLowerCase().trim().includes(normSub)
    );
    if (sub) subcategoryId = sub.id;
  } else if (normSub) {
    // Search all categories as fallback
    for (const cat of db.categories) {
      const sub = cat.subcategories?.find((s: any) => s.name.toLowerCase().trim() === normSub);
      if (sub) {
        subcategoryId = sub.id;
        break;
      }
    }
  }

  return { categoryId, subcategoryId };
}

export async function saveKnowledge(data: KnowledgeStore) {
  await mutateMockData((db) => {
    const products = db.products as any[];

    db.knowledgeMeta = {
      sources: Array.from(new Set(data.sources || [])),
      processedSources: Array.from(new Set(data.processedSources || [])),
      lastUpdated: data.lastUpdated || new Date().toISOString()
    };

    Object.entries(data.knowledge).forEach(([sku, entry]) => {
      const existingIdx = products.findIndex((p: any) => p.sku === sku);
      const { categoryId, subcategoryId } = resolveCategoryIds(
        entry.category,
        entry.subcategory,
        db
      );

      if (existingIdx !== -1) {
        products[existingIdx] = {
          ...products[existingIdx],
          name: entry.model || products[existingIdx].name,
          specs: entry.specs || products[existingIdx].specs,
          price: entry.price || products[existingIdx].price,
          manufacturer: entry.manufacturer || products[existingIdx].manufacturer,
          categoryId: categoryId || products[existingIdx].categoryId,
          subcategoryId: subcategoryId || products[existingIdx].subcategoryId,
          lastUpdated: new Date().toISOString()
        };
      } else {
        products.push({
          id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          sku,
          name: entry.model || sku,
          manufacturer: entry.manufacturer || "Nieznany",
          price: entry.price || 0,
          stock: 0,
          specs: entry.specs || "",
          categoryId,
          subcategoryId,
          isIqSynced: true,
          lastUpdated: new Date().toISOString()
        });
      }
    });
  });
}

// --- CONFIG & UTILS ---

const MODEL_KEYWORDS = ['SYMBOL', 'KOD', 'SKU', 'ARTYKUL', 'ARTYKUŁ', 'INDEKS', 'MODEL', 'TYP', 'OZNACZENIE', 'LABEL MODEL', 'ITEM CODE']; // Removed 'PRODUCT NAME', its too generic
const NAME_KEYWORDS = ['PRODUCT NAME', 'ORDER NAME', 'PRODUKT', 'TOWAR', 'NAZWA']; // New group for lower priority
const SPECS_KEYWORDS = ['OPIS', 'SPECYFIKACJA', 'PARAMETRY', 'CECHY', 'FUNKCJE', 'DESCRIPTION', 'DANE TECHNICZNE', 'POJEMNOŚĆ', 'WYMIARY', 'WAGA', 'FEATURES', 'POLISH FEATURES', 'ENGLISH FEATURES', 'OPIS TECHNICZNY'];
const PRICE_KEYWORDS = ['NETTO', 'CENA', 'PRICE', 'WARTOŚĆ', 'NET', 'DETAL', 'HURT', 'CENA PL', 'PLN', 'CENA NETTO', 'MSRP', 'RRP', 'MSRP PRICE', 'DEALER PRICE', 'UNIT PRICE'];
const MANUFACTURER_KEYWORDS = ['PRODUCENT', 'MARKA', 'MANUFACTURER', 'BRAND', 'PRODUCER', 'VENDOR'];
const CATEGORY_KEYWORDS = ['KATEGORIA', 'DZIAŁ', 'GROUP', 'CATEGORY', 'DEPARTMENT', 'RODZAJ'];
const SUBCATEGORY_KEYWORDS = ['PODKATEGORIA', 'SUB-CATEGORY', 'SUBGROUP', 'PODGRUPA', 'KLASA'];
const QUALITY_BLACKLIST = ['NIEZNANY', 'INNE', 'NIESKLASYFIKOWANE', 'POZOSTAŁE', 'UNKNOWN', 'OTHER', 'MISC', 'BRAK', 'PRODUKT'];
const NON_DEVICE_KEYWORDS = ['KABEL', 'PRZEWÓD', 'WTYK', 'ZŁĄCZE', 'UCHWYT', 'KOŁEK', 'ŚRUBA', 'RURA', 'KORYTO', 'PUSZKA', 'MODUŁ MONTAŻOWY', 'OSŁONA', 'OBEJM', 'WKRĘT'];

export function isLikelyProductCode(val: string): boolean {
  if (!val || typeof val !== 'string') return false;
  const v = val.trim();
  if (v.length < 3 || v.length > 50) return false;
  
  // Exclude purely numeric strings >= 8 digits
  if (/^\d{8,}$/.test(v)) return false;
  if (v.includes('@') || v.toLowerCase().includes('www.') || v.toLowerCase().includes('http')) return false;

  const isBcs = v.startsWith('BCS-');
  const isHik = /^[A-Z]{1,2}-/.test(v);
  const isDahua = /^[A-Z]{2,}-/.test(v) || /^[A-Z0-9]{4,}-/.test(v) || v.startsWith('HY-');
  const isAtte = v.startsWith('AUPS-') || v.startsWith('APS-') || v.startsWith('ASUC-');
  const isGorke = (v.startsWith('PNH-') || v.startsWith('BSX-') || v.startsWith('IDO-') || v.startsWith('SPR-') || v.startsWith('PNP-'));
  const hasLetters = /[A-Z]/i.test(v);
  const hasNumbers = /\d/.test(v);
  
  const isSatel = /^(INTEGRA|VERSA|PERFECTA|MICRA|INT-|ACCO-|GPRS-|GSM-|SLIM-|SP-|SOW-|SPW-|HUB|Smart|Zestaw)/i.test(v);
  const isBattery = /^(EP\s|AM\s|AMG\s|TCL\s|BP\s|FGB\s|MW\s|SBL\s|LFP\s|TC\s)/i.test(v);
  
  // CRITICAL: A product code MUST have at least one letter to avoid being confused with prices/LP (V9 Rule)
  // Exception: very long numeric strings (EANs > 10 chars) - though we usually don't want them as models
  if (!hasLetters && v.length < 10) return false;

  // Reject simple float numbers like 12.8 or 2815.0
  if (/^\d+([.,]\d+)?$/.test(v.replace(/\s/g, '')) && v.length < 8) return false;

  const isAlphaNumCode = /^[A-Z0-9\/\-\\, ]+$/i.test(v) && v.length >= 3 && hasNumbers;

  // CRITICAL: Reject filenames (Safety Gate)
  if (/\.(pdf|xlsx?|csv|zip|png|jpe?g)$/i.test(v)) return false;

  if (isSatel && v.length >= 3) return true;
  if (isBattery && v.length >= 2) return true;
  if (/^(COMMAX|SCOT)$/i.test(v)) return true;
  
  const baseCheck = isBcs || isHik || isDahua || isAtte || isGorke || isAlphaNumCode || (v.length >= 4 && hasNumbers && !v.includes(' '));
  return baseCheck;
}

function parsePrice(val: any): number | null {
  if (val === undefined || val === null || val === '') return null;
  
  const str = String(val).trim().toUpperCase();
  
  // 1. Reject scientific notation (EANs in Excel) immediately
  if (str.includes('E+') || str.includes('E-')) return null;

  // 2. Direct numbers
  if (typeof val === 'number') {
      if (val > 1000000) return null; 
      return val;
  }
  
  // 3. Remove spaces and normalize comma
  let clean = str
    .replace(/\s/g, '')
    .replace(',', '.');

  // 4. Reject long strings of digits (EAN/GTIN codes)
  const digitsOnly = clean.replace(/[^\d]/g, '');
  if (digitsOnly.length >= 10 && digitsOnly.length <= 15) return null;

  // 5. Final cleanup: keep only numbers and one dot
  clean = clean.replace(/[^\d.]/g, '');
  
  const parsed = parseFloat(clean);
  if (isNaN(parsed) || parsed <= 0 || parsed > 1000000) return null;
  
  return parsed;
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
 * Sprawdza jakość danych (Shield Logic V9.6)
 */
export function checkQuality(item: any): { isClean: boolean; reason?: string } {
  const fields = [
    { name: 'manufacturer', val: item.manufacturer },
    { name: 'category', val: item.category },
    { name: 'subcategory', val: item.subcategory }
  ];

  for (const field of fields) {
    if (!field.val || String(field.val).trim() === "") {
      return { isClean: false, reason: `Brakująca wartość: ${field.name}` };
    }
    const valUpper = String(field.val).toUpperCase().trim();
    if (QUALITY_BLACKLIST.some(keyword => valUpper.includes(keyword))) {
      return { isClean: false, reason: `Nieprawidłowa wartość: ${field.val}` };
    }
  }

  return { isClean: true };
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
    const manufacturer = findValue(['manufacturer', 'producent', 'marka', 'brand']);
    const category = findValue(['category', 'kategoria', 'dzial', 'dzisł', 'group']);
    const subcategory = findValue(['subcategory', 'podkategoria', 'podgrupa', 'sub-group']);

    if (model && (specs || price)) {
      const modelKey = String(model).toUpperCase().trim();
      const entry: KnowledgeEntry = {
        specs: String(specs),
        price: parsePrice(price),
        currency: 'PLN',
        source: filename,
        date: currentDate,
        manufacturer: manufacturer ? String(manufacturer) : undefined,
        category: category ? String(category) : undefined,
        subcategory: subcategory ? String(subcategory) : undefined
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
  options?: ParserOptions
): Promise<{ count: number, stats: any, sessionKnowledge: Record<string, KnowledgeEntry> }> {
  try {
    const { apiKey, modelId = 'gemini-1.5-flash' } = options || {};
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const currentStore = await getKnowledge();
    const sessionKnowledge: Record<string, KnowledgeEntry> = {};
    const sessionSet = new Set<string>();
    let totalAddedCount = 0;
    const currentDate = new Date().toISOString().split('T')[0];
    
    onProgress?.({ type: 'log', message: `Uruchamiam silnik V9 (Battle-Hardened) dla: ${filename}` });

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      if (rawRows.length === 0) continue;

      let columnMap = { 
        model: -1, 
        specs: -1, 
        price: -1, 
        manufacturer: -1, 
        category: -1, 
        subcategory: -1,
        modelScore: 0, 
        specsScore: 0, 
        priceScore: 0,
        manScore: 0,
        catScore: 0,
        subScore: 0
      };
      
      let headerFoundRow = -1;

      // Specialized fix for EMU Sheets / Summary sheets
      if (sheetName.toLowerCase() === 'ean') {
          console.log(`[XLSX] Pomijam arkusz ${sheetName} - to lista EAN bez cen.`);
          continue;
      }
      if (sheetName.includes('Zbiorczo')) {
          columnMap = { 
            ...columnMap,
            model: 0, 
            specs: 0, 
            price: 1,
            modelScore: 100,
            specsScore: 100,
            priceScore: 100
          };
          headerFoundRow = 0;
          console.log(`[XLSX] Arkusz specjalny ${sheetName}: Wymuszam kolumny Model=${columnMap.model}, Cena=${columnMap.price}`);
      } else {
          for (let i = 0; i < Math.min(rawRows.length, 150); i++) {
              const row = rawRows[i];
              if (!Array.isArray(row)) continue;
              
              row.forEach((cell, cellIndex) => {
                  if (!cell) return;
                  const text = String(cell).toUpperCase().trim();
                  if (text.length > 50) return; 

                  const getScore = (keywords: string[], exactWeight: number, partialWeight: number) => {
                      if (keywords.includes(text)) return exactWeight;
                      if (keywords.some(k => text.includes(k))) return partialWeight;
                      return 0;
                  };

                  const mScore = getScore(MODEL_KEYWORDS, 100, 60);
                  const nameScore = getScore(NAME_KEYWORDS, 80, 40);
                  const sScore = getScore(SPECS_KEYWORDS, 100, 60);
                  const pScore = getScore(PRICE_KEYWORDS, 100, 60);
                  const manScore = getScore(MANUFACTURER_KEYWORDS, 100, 60);
                  const catScore = getScore(CATEGORY_KEYWORDS, 100, 60);
                  const subScore = getScore(SUBCATEGORY_KEYWORDS, 100, 60);

                  if (mScore > (columnMap.modelScore || 0) || (nameScore > (columnMap.modelScore || 0) && (columnMap.modelScore || 0) < 90)) {
                      columnMap.model = cellIndex;
                      columnMap.modelScore = Math.max(mScore, nameScore);
                  }
                  if (sScore > 0 && sScore > (columnMap.specsScore || 0)) {
                      columnMap.specs = cellIndex;
                      columnMap.specsScore = sScore;
                  }
                  if (pScore > 0 && pScore > (columnMap.priceScore || 0)) {
                      columnMap.price = cellIndex;
                      columnMap.priceScore = pScore;
                  }
                  if (manScore > 0 && manScore > (columnMap.manScore || 0)) {
                      columnMap.manufacturer = cellIndex;
                      columnMap.manScore = manScore;
                  }
                  if (catScore > 0 && catScore > (columnMap.catScore || 0)) {
                      columnMap.category = cellIndex;
                      columnMap.catScore = catScore;
                  }
                  if (subScore > 0 && subScore > (columnMap.subScore || 0)) {
                      columnMap.subcategory = cellIndex;
                      columnMap.subScore = subScore;
                  }
              });

              if (columnMap.model !== -1) {
                  headerFoundRow = i;
                  if (columnMap.specs === -1) columnMap.specs = columnMap.model + 1;
                  
                  let validMatches = 0;
                  for (let sampleIdx = i + 1; sampleIdx < Math.min(rawRows.length, i + 15); sampleIdx++) {
                      const sampleVal = String(rawRows[sampleIdx]?.[columnMap.model] || '');
                      if (isLikelyProductCode(sampleVal)) validMatches++;
                  }
                  
                  if (validMatches >= 1) {
                      console.log(`[XLSX] Header match confirmed at row ${i} with ${validMatches} sample matches in col ${columnMap.model}`);
                      break; 
                   } else {
                       columnMap = { 
                         ...columnMap,
                         model: -1, 
                         specs: -1, 
                         price: -1, 
                         modelScore: 0, 
                         specsScore: 0, 
                         priceScore: 0 
                       };
                       headerFoundRow = -1;
                   }
              }
          }
      }

      // --- FALLBACK BRAIN (INTERNAL INTELLIGENCE) ---
      if (columnMap.model === -1) {
        console.log(`[XLSX] Arkusz "${sheetName}" - Nie wykryto nagłówków. Próbuję detekcji strukturalnej...`);
        // Próbujemy znaleźć kolumnę, która ma najwięcej ciągów znaków wyglądających jak kody produktów
        let colCandidate = -1;
        let maxValidCount = 0;
        
        // Sprawdzamy pierwsze 30 kolumn (potrzebne dla Dahua SSP)
        for (let col = 0; col < Math.min(30, rawRows[0]?.length || 0); col++) {
            let validInCol = 0;
            for (let r = 0; r < Math.min(rawRows.length, 50); r++) {
                if (isLikelyProductCode(String(rawRows[r]?.[col] || ''))) validInCol++;
            }
            if (validInCol > maxValidCount) {
                maxValidCount = validInCol;
                colCandidate = col;
            }
        }

        if (maxValidCount > 3) {
          // If we found a model column, let's look for a price column by scanning rows
          let priceColCandidate = colCandidate + 2;
          for (let col = colCandidate + 1; col < Math.min(colCandidate + 30, rawRows[0]?.length || 0); col++) {
              let priceLikeCount = 0;
              for (let r = 0; r < Math.min(rawRows.length, 50); r++) {
                  const val = rawRows[r]?.[col];
                  if (val && !isNaN(parseFloat(val)) && typeof val === 'number') priceLikeCount++;
              }
              if (priceLikeCount > 5) {
                  priceColCandidate = col;
                  break;
              }
          }

          columnMap = { 
            ...columnMap,
            model: colCandidate, 
            specs: colCandidate + 1, 
            price: priceColCandidate 
          };
          headerFoundRow = 0;
          console.log(`[XLSX] Inteligentny Fallback: Wykryto wzorzec produktów w kolumnie ${colCandidate}, Cena w kolumnie ${priceColCandidate}`);
        } else {
             // Jeśli nadal nic, a mamy klucz API, to dopiero wtedy wołamy AI. 
             // W przeciwnym razie pomijamy (user nie podał klucza).
             if (apiKey && apiKey !== 'dummy') {
                onProgress?.({ type: 'log', message: `Uruchamiam Auto-Mapper AI dla ${sheetName}...`});
                // @ts-ignore
                const aiMapping = typeof queryAIForColumnMapping === 'function' ? await queryAIForColumnMapping(rawRows.slice(0, 50), apiKey, modelId) : null;
                if (aiMapping && aiMapping.model !== -1) {
                    columnMap = { 
                      ...columnMap, 
                      model: aiMapping.model, 
                      specs: aiMapping.specs, 
                      price: aiMapping.price 
                    };
                    headerFoundRow = aiMapping.headerFoundRow;
                }
             }
             
             if (columnMap.model === -1) {
                 console.log(`[XLSX] Pomijam arkusz "${sheetName}" - brak rozpoznanego układu.`);
                 continue;
             }
        }

      } else {
        console.log(`[XLSX] Arkusz "${sheetName}" - Wykryto nagłówki w wierszu ${headerFoundRow}: Model(Kol ${columnMap.model}), Opis(Kol ${columnMap.specs}), Cena(Kol ${columnMap.price})`);
      }


      if (columnMap.price === -1) {
          for(let i=0; i < Math.min(rawRows.length, 50); i++) {
              let p = rawRows[i]?.[columnMap.model+2];
              if(p && !isNaN(parseFloat(p))) {
                  columnMap.price = columnMap.model+2;
                  break;
              }
          }
      }

      const headers: string[] = [];
      if (headerFoundRow !== -1 && rawRows[headerFoundRow]) {
          // EMU/Complex headers: merge Row, Row+1, Row+2
          const possibleHeaderRows = [headerFoundRow, headerFoundRow + 1, headerFoundRow + 2];
          const colsCount = Math.max(...possibleHeaderRows.map(r => rawRows[r]?.length || 0));
          
          for (let c = 0; c < colsCount; c++) {
              let combinedHeader: string[] = [];
              for (const rIdx of possibleHeaderRows) {
                  const val = String(rawRows[rIdx]?.[c] || '').trim();
                  if (val && !combinedHeader.includes(val) && val.length < 40 && !isLikelyProductCode(val)) {
                      combinedHeader.push(val);
                  }
              }
              headers[c] = combinedHeader.join(' ').replace(/[\[\]]/g, '').trim();
          }
          
          // If Row+1 or Row+2 were clearly sub-headers, the data starts lower
          let dataStartRow = headerFoundRow + 1;
          for (let checkR = headerFoundRow + 1; checkR <= headerFoundRow + 3; checkR++) {
              const sampleVal = String(rawRows[checkR]?.[columnMap.model] || '');
              if (isLikelyProductCode(sampleVal)) {
                  dataStartRow = checkR;
                  break;
              }
          }
          headerFoundRow = dataStartRow - 1;
      }

      const extractedItems = [];
      let skippedDueToCode = 0;
      let skippedDueToEmpty = 0;
      let emptyRowsInRow = 0;

      for (let i = headerFoundRow + 1; i < rawRows.length; i++) {
        if (options?.signal?.aborted) throw new Error('PROCES_PRZERWANY');

        const row = rawRows[i];
        if (!row || !row.length) {
            emptyRowsInRow++;
            skippedDueToEmpty++;
            if (emptyRowsInRow > 100) break;
            continue;
        }

        let modelVal = String(row[columnMap.model] || '').trim();
        
        // Resilience: if predicted model col is empty, check X+1
        if (!modelVal && row[columnMap.model + 1]) {
           const altVal = String(row[columnMap.model + 1]).trim();
           if (isLikelyProductCode(altVal)) modelVal = altVal;
        }

        if (!modelVal || !isLikelyProductCode(modelVal)) {
            skippedDueToCode++;
            continue;
        }
        emptyRowsInRow = 0;

        // Smart Specs Merge: collect everything that isn't model or price
        let specsParts = [];
        for (let c = 0; c < row.length; c++) {
            if (c === columnMap.model || c === columnMap.price) continue;
            
            const cellVal = row[c];
            if (cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== '') {
                specsParts.push(String(cellVal).trim());
            }
        }
        
        const specsVal = specsParts.length > 0 ? specsParts.join(' | ') : "Parametry standardowe";
        const priceVal = columnMap.price !== -1 ? row[columnMap.price] : null;
        const price = parsePrice(priceVal);

        const manufacturerVal = columnMap.manufacturer !== -1 ? String(row[columnMap.manufacturer] || '').trim() : null;
        const categoryVal = columnMap.category !== -1 ? String(row[columnMap.category] || '').trim() : null;
        const subcategoryVal = columnMap.subcategory !== -1 ? String(row[columnMap.subcategory] || '').trim() : null;

        // Strict: Model cannot be the same as Price (protects against column shifts)
        if (price !== null && String(price) === modelVal.replace(',', '.')) {
            skippedDueToCode++;
            continue;
        }

        extractedItems.push({
          model: modelVal,
          specs: specsVal,
          price: priceVal,
          manufacturer: manufacturerVal || undefined,
          category: categoryVal || undefined,
          subcategory: subcategoryVal || undefined
        });
      }

      console.log(`[XLSX] Arkusz "${sheetName}" zakończony. Pomyślnie= ${extractedItems.length}, Puste= ${skippedDueToEmpty}, Odrzucone przez isLikelyProductCode= ${skippedDueToCode}`);

      if (extractedItems.length > 0) {
        totalAddedCount += processExtractions(extractedItems, currentStore, filename, currentDate, onProgress, totalAddedCount, sessionSet);
        
        // Capture session knowledge
        sessionSet.forEach(key => {
          if (currentStore.knowledge[key]) {
             sessionKnowledge[key] = currentStore.knowledge[key];
          }
        });

        onProgress?.({ 
          type: 'log', 
          message: `Arkusz ${sheetName}: przetworzono lokalnie`,
          percent: 50
        });
      }
    }

    if (totalAddedCount > 0) {
      if (!currentStore.processedSources.includes(filename)) currentStore.processedSources.push(filename);
      await saveKnowledge(currentStore);
    }
    
    onProgress?.({ 
      type: 'progress', 
      message: `Ekstrakcja zakończona (Lokalna V6): ${totalAddedCount} urządzeń.`, 
      count: totalAddedCount,
      percent: 100 
    });

    return { 
      count: totalAddedCount, 
      stats: { type: 'Excel (Deterministic V6)' }, 
      sessionKnowledge 
    };

  } catch (err: any) {
    if (err.message !== 'PROCES_PRZERWANY') {
      onProgress?.({ type: 'error', message: `Błąd Excel Parser: ${err.message || err}` });
    }
    throw err;
  }
}

export async function parsePDFHeuristic(
  buffer: Buffer,
  filename: string,
  onProgress?: ProgressCallback
): Promise<{ count: number, stats: any, sessionKnowledge: Record<string, KnowledgeEntry> }> {
  try {
    const pdf = require('pdf-parse/lib/pdf-parse.js');
    const pdfParse = typeof pdf === 'function' ? pdf : (pdf.default || pdf.PDFParse);
    
    // Zwiększamy limit stron dla heurystyki, bo liczymy na dane tekstowe
    const data = await pdfParse(buffer, { max: 1000 });
    const fullText = data.text || "";
    const lines = fullText.split('\n');

    const currentStore = await getKnowledge();
    const currentDate = new Date().toISOString().split('T')[0];
    const sessionSet = new Set<string>();
    const extractedItems = [];

    onProgress?.({ type: 'log', message: `Uruchamiam silnik Heurystyczny V8 (Lokalny) dla: ${filename}` });

    // Pulsar pattern: MODEL - DESCRIPTION ... PRICE PLN netto
    const pulsarRegex = /^([A-Z0-9-]{3,})\s+-\s+([\s\S]+?)\s+([\d\s.,]+)\s+PLN\s+netto/i;
    // BCS pattern lines often start with BCS-
    const bcsModelRegex = /^(BCS-[A-Z0-9-().]+)/i;
    // BCS price pattern: INDEX,00 złPRICE zł
    const bcsPriceRegex = /([\d\s,.]+)\s*z[łl]/gi;
    // AFG pattern: Lp. Model Description Price zł
    const afgRegex = /^\d+\.\s+([A-Z0-9-\\]+)\s+([\s\S]+?)\s+([\d\s,]+)\s+z[łl]/i;
    // Satel Glued pattern: DescriptionMODEL SYMBOL PRICE PLN
    const satelRegex = /((?:INTEGRA|VERSA|PERFECTA|MICRA|INT-|ACCO-|GPRS-|GSM-|SLIM-|SP-|SOW-|SPW-|ACU-|ANT-|APD-|PRF-|ACTIVA-|K-|B-|FPX-|OPC-|DS-|OMI-|SO-|APS-|STAM-|HUB|Smart|Zestaw|Motion Detector|Multipurpose Detector|Keypad|Keyfob|Smart Plug)[A-Z0-9\s-]*?)[✪○❖]*\s*(\d[\d\s]*,[\d]{2})\s*PLN/gi;
    // ATTE/Sparse pattern: Standalone code like AUPS... 
    const sparseModelRegex = /^([A-Z0-9-]{5,30})$/i; 
    // EMU pattern: Vertical blocks or lines with /
    const emuRegex = /^([A-Z0-9]+\/[A-Z0-9/-]+)\s+([\s\S]+?)\s+([\d\s,.]+)\s*$/i;

    let totalAddedCount = 0;
    
    // SATEL specialized multi-match pass
    let satelMatch;
    while ((satelMatch = satelRegex.exec(fullText)) !== null) {
        const model = satelMatch[1].trim();
        const price = satelMatch[2].trim();
        // Since we don't have description in this regex match (it's glued before), we use standard
        extractedItems.push({
            model,
            specs: 'Satel System Component',
            price
        });
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Try EMU Pattern
        const emuMatch = line.match(emuRegex);
        if (emuMatch) {
            extractedItems.push({
                model: emuMatch[1].trim(),
                specs: emuMatch[2].trim(),
                price: emuMatch[3].trim()
            });
            continue;
        }

        // Try AFG Pattern
        const afgMatch = line.match(afgRegex);
        if (afgMatch) {
            extractedItems.push({
                model: afgMatch[1].trim(),
                specs: afgMatch[2].trim(),
                price: afgMatch[3].trim()
            });
            continue;
        }

        // Try Pulsar Pattern
        const pMatch = line.match(pulsarRegex);
        if (pMatch) {
            extractedItems.push({
                model: pMatch[1].trim(),
                specs: pMatch[2].trim(),
                price: pMatch[3].trim()
            });
            continue;
        }

        // Try BCS Pattern (State Machine)
        const bcsMatch = line.match(bcsModelRegex);
        if (bcsMatch) {
            const model = bcsMatch[1];
            let specs = "";
            let price: any = null;
            
            // Look ahead for specs and price
            for (let j = i + 1; j < Math.min(i + 40, lines.length); j++) {
                const nextLine = lines[j].trim();
                if (!nextLine) continue;
                
                // If we hit next model, break
                if (bcsModelRegex.test(nextLine)) break;

                // Check for price line
                if (nextLine.includes('zł')) {
                    const priceMatches = [...nextLine.matchAll(bcsPriceRegex)];
                    if (priceMatches.length > 0) {
                        // Usually the last or second to last "zł" value is the Net price
                        const lastMatch = priceMatches[priceMatches.length - 1];
                        price = lastMatch[1];
                        break; 
                    }
                }
                
                if (specs.length < 500) specs += " " + nextLine;
            }

            if (model && price) {
                extractedItems.push({
                    model: model.trim(),
                    specs: specs.trim() || "Parametry BCS",
                    price: price
                });
            }
            continue;
        }

        // --- GDE Vertical (COMMAX/SCOT) ---
        if (/^(COMMAX|SCOT)$/i.test(line)) {
            let model = "";
            let price = 0;
            // Look ahead for Symbol and Price
            for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
                const nextLine = lines[j].trim();
                if (!nextLine) continue;
                if (/^(COMMAX|SCOT)$/i.test(nextLine)) break; // next item

                // Price detection: "1 280,00 zł"
                const gdePriceMatch = nextLine.match(/([\d\s,.]+)\s*z[łl]/i);
                if (gdePriceMatch) {
                    price = parsePrice(gdePriceMatch[1]) || 0;
                    if (price > 0) break;
                }
                
                // If it looks like a symbol (single word, caps/numbers)
                if (model === "" && isLikelyProductCode(nextLine) && nextLine.length < 25) {
                    model = nextLine;
                }
            }
            if (model && price) {
               extractedItems.push({ model, specs: "GDE Catalog Item", price });
               // Don't skip i completely, let normal loops find more if needed
            }
        }

        // --- ATTE / Sparse / Stacked Fallback ---
        // If a line is just a likely model code and it wasn't caught by brands above
        if (isLikelyProductCode(line) && line.length < 35) {
            // Look ahead for something that looks like a standalone price
            for (let j = i + 1; j < Math.min(i + 50, lines.length); j++) {
                const nextLine = lines[j].trim();
                if (!nextLine) continue;
                if (isLikelyProductCode(nextLine) && nextLine.length > 4 && /[-/\\]/.test(nextLine)) break; 

                // Check for price (optionally with PLN/zł)
                const pricePattern = /^(?:PLN\s*)?([\d\s,.]+)\s*(?:PLN|z[łl])?$/i;
                const priceMatch = nextLine.match(pricePattern);
                
                if (priceMatch) {
                    const candidatePrice = parsePrice(priceMatch[1]);
                    if (candidatePrice && candidatePrice > 0 && candidatePrice < 100000) {
                        extractedItems.push({
                            model: line,
                            specs: lines[i-1]?.trim().length > 10 ? lines[i-1].trim() : "Parametry PDF Spec",
                            price: candidatePrice
                        });
                        break;
                    }
                }
            }
        }
    }

    if (extractedItems.length === 0 || fullText.length < 200) {
        // Binary fallback for corrupted/empty text layers (EMU recovery)
        onProgress?.({ type: 'log', message: `Próbuję odzyskiwania binarnego dla: ${filename}...` });
        // Instead of toString('ascii'), let's just find sequences of caps and numbers and dashes
        const rawString = buffer.toString('utf8').replace(/[^\x20-\x7E\n]/g, ' ');
        
        // Target: MW 7.2-12 or SSB SBL 100-12
        const emuBatteryPattern = /(?:MW|SSB|LFP|SBL)\s?[\d.]+-[\d]+[A-Z0-9\s-]*/g;
        const potentialPrices = [...rawString.matchAll(/(\d[\d\s]*,[\d]{2})\s+/g)];
        
        let bCount = 0;
        let bMatch;
        while ((bMatch = emuBatteryPattern.exec(rawString)) !== null) {
            if (bCount > 300) break;
            const model = bMatch[0].trim();
            if (model.length > 5 && model.length < 40) {
               const price = potentialPrices[bCount] ? potentialPrices[bCount][1] : "0,00";
               extractedItems.push({ model, specs: "EMU Battery (Raw Recovery)", price });
               bCount++;
            }
        }
    }

    if (extractedItems.length > 0) {
        totalAddedCount = processExtractions(extractedItems, currentStore, filename, currentDate, onProgress, 0, sessionSet);
    }

    let sessionKnowledge: Record<string, KnowledgeEntry> = {};
    if (totalAddedCount > 0) {
        if (!currentStore.processedSources.includes(filename)) currentStore.processedSources.push(filename);
        await saveKnowledge(currentStore);

        sessionSet.forEach(key => {
          if (currentStore.knowledge[key]) {
            sessionKnowledge[key] = currentStore.knowledge[key];
          }
        });
    }

    return { 
      count: totalAddedCount, 
      stats: { model: 'AI PDF', requests: 1, type: 'text' }, 
      sessionKnowledge 
    };
  } catch (err: any) {
    onProgress?.({ type: 'error', message: `Błąd PDF Heuristic: ${err.message}` });
    throw err;
  }
}

export async function parsePDFWithAI(
  buffer: Buffer, 
  filename: string, 
  apiKey?: string, 
  modelId: string = 'gemini-1.5-flash', 
  availableModels: string[] = [], 
  onProgress?: ProgressCallback,
  signal?: { aborted: boolean }
): Promise<{ count: number, stats: any, sessionKnowledge: Record<string, KnowledgeEntry> }> {
  // --- FALLBACK TO HEURISTIC IF NO KEY ---
  if (!apiKey || apiKey === 'dummy' || apiKey.trim() === "") {
    return parsePDFHeuristic(buffer, filename, onProgress);
  }

  try {
    const toolkit = new ToolkitParser({ apiKey, modelId, availableModels });
    const currentStore = await getKnowledge();
    let totalAddedCount = 0;
    const currentDate = new Date().toISOString().split('T')[0];

    onProgress?.({ type: 'log', message: `Rozpoczynam AI PDF Power-Parse: ${filename}` });
    
    const pdf = require('pdf-parse/lib/pdf-parse.js');
    const pdfParse = typeof pdf === 'function' ? pdf : (pdf.default || pdf.PDFParse);
    
    // Limit to 100 pages for AI to avoid massive costs/timeouts
    const data = await pdfParse(buffer, { max: 100 });
    const fullText = data.text || "";

    if (fullText.length < 500) {
      // Fallback if no text layer
      throw new Error("Dokument PDF nie zawiera warstwy tekstowej (skan). Proszę dostarczyć cennik w formacie Excel (XLSX).");
    }

    onProgress?.({ type: 'log', message: `Skonwertowano: ${Math.round(fullText.length/1000)}kb tekstu. Dzielenie na batche...` });

    const CHUNK_SIZE = 4000;
    const chunks = [];
    for(let i=0; i<fullText.length; i+=CHUNK_SIZE) {
        chunks.push(fullText.substring(i, i+CHUNK_SIZE));
    }

    for (let i = 0; i < chunks.length; i++) {
        if (signal?.aborted) throw new Error('PROCES_PRZERWANY');

        const chunk = chunks[i];
        
        onProgress?.({ 
            type: 'log', 
            message: `Analiza AI partii ${i + 1}/${chunks.length}...`,
            percent: Math.round((i / chunks.length) * 100)
        });

        try {
            const aiResults = await toolkit.extractStructuredData(
                `Jesteś Ekstraktorem Technicznym z cenników PDF.
                Cel: Znajdź produkty, ceny oraz ich parametry techniczne w poniższym tekście.
                
                STRICT RULE: Tylko czyste fakty. ZERO przymiotników, ZERO "niezawodności". Same wartości liczbowe, gabaryty, interfejsy.
                Ignoruj długie ciągi samych cyfr (EAN) - to nigdy nie są nazwy modeli.
                
                Zwróć WYNIK jako czystą tablicę JSON postaci: 
                [{"model": "KOD", "specs": "W", "price": 0}]
                
                Jeśli w tekście nie ma produktów powtarzalnych, zwróć pustą tablicę: []`,
                chunk,
                "text/plain"
            );

            if (aiResults && Array.isArray(aiResults) && aiResults.length > 0) {
                const added = processExtractions(aiResults, currentStore, filename, currentDate, undefined, totalAddedCount);
                totalAddedCount += added;
                
                if (added > 0) await saveKnowledge(currentStore);
            }
        } catch (localErr) {
            onProgress?.({ type: 'log', message: `Błąd AI: partia ${i + 1} niewyraźna. Przechodzę dalej.` });
        }
    }

    if (totalAddedCount > 0 && !currentStore.processedSources.includes(filename)) {
        currentStore.processedSources.push(filename);
        await saveKnowledge(currentStore);
    }

    onProgress?.({ 
      type: 'progress', 
      message: `AI Paginacja V6 Zakończona: Znaleziono ${totalAddedCount} urządzeń.`, 
      count: totalAddedCount,
      percent: 100 
    });
    
    // Capture session knowledge (Simplified for AI mode)
    const sessionKnowledge: Record<string, KnowledgeEntry> = {};
    Object.keys(currentStore.knowledge).forEach(sku => {
        if (currentStore.knowledge[sku].source === filename) {
            sessionKnowledge[sku] = currentStore.knowledge[sku];
        }
    });

    return { 
      count: totalAddedCount, 
      stats: { model: modelId, requests: chunks.length, type: 'text' }, 
      sessionKnowledge 
    };
  } catch (err: any) {
    onProgress?.({ type: 'error', message: `Błąd AI PDF: ${err.message}` });
    throw err;
  }
}
