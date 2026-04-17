// Comprehensive Test for Universal Parser Logic (Stand-alone)
const { z } = require('zod');

// --- REPLICATED LOGIC FROM PARSER.TS ---

const KnowledgeEntrySchema = z.object({
  specs: z.string().min(1).max(500),
  price: z.number().nullable(),
  currency: z.string().default('PLN'),
  source: z.string().optional(),
  date: z.string().optional(),
});

const MODEL_KEYWORDS = ['MODEL', 'SYMBOL', 'KOD', 'SKU', 'ARTYKUŁ', 'INDEKS', 'PRODUKT', 'NAZWA TOWARU', 'PRODUCT MODEL', 'SERIES'];
const SPECS_KEYWORDS = ['OPIS', 'SPECYFIKACJA', 'PARAMETRY', 'CECHY', 'NAZWA', 'FUNKCJE', 'DESCRIPTION', 'DANE TECHNICZNE'];
const PRICE_KEYWORDS = ['NETTO', 'CENA', 'PRICE', 'WARTOŚĆ', 'NET'];
const NON_DEVICE_KEYWORDS = ['KABEL', 'PRZEWÓD', 'WTYK', 'ZŁĄCZE', 'UCHWYT', 'KOŁEK', 'ŚRUBA', 'RURA', 'KORYTO', 'PUSZKA', 'MODUŁ MONTAŻOWY', 'OSŁONA', 'OBEJM', 'WKRĘT'];

function isLikelyProductCode(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim();
  if (t.length < 2 || t.length > 50) return false;
  if (t.includes(',')) return false;
  if (t.split(/\s+/).length > 3) return false;
  const upperCount = (t.match(/[A-Z0-9]/g) || []).length;
  if (t.length > 8 && upperCount / t.length < 0.25) return false;
  return true;
}

function parsePrice(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  const clean = String(val).replace(',', '.').replace(/[^\d.]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

function processRows(rawRows, columnMap) {
  const results = {};
  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row) continue;
    
    let model = row[columnMap.model];
    let specs = row[columnMap.specs];
    let price = columnMap.price !== null ? row[columnMap.price] : null;

    if (!model) continue;
    const modelText = String(model).trim();
    if (!isLikelyProductCode(modelText)) continue;

    let finalSpecs = String(specs || '').trim();
    let finalPrice = parsePrice(price);

    // Look-ahead
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
      const actualSymbol = modelText.split(' ')[0].toUpperCase();

      if (!NON_DEVICE_KEYWORDS.some(k => modelKey.includes(k) || specsUpper.includes(k))) {
        const entry = {
          specs: finalSpecs,
          price: finalPrice,
          currency: 'PLN'
        };
        const validation = KnowledgeEntrySchema.safeParse(entry);
        if (validation.success) {
          results[actualSymbol] = validation.data;
        }
      }
    }
  }
  return results;
}

// --- TEST SCENARIOS ---

const scenarios = [
  {
    name: 'Standard Pulsar Case (Multi-line)',
    columnMap: { model: 0, specs: 1, price: 2 },
    rows: [
      ['SYMBOL', 'SPECS', 'PRICE'],
      ['AWO000 - Obudowa', null, '135,00 PLN'],
      ['250x250x80, 7Ah, IP20', null, null]
    ],
    expected: (res) => res['AWO000'] && res['AWO000'].price === 135 && res['AWO000'].specs.includes('250x250')
  },
  {
    name: 'Generic Supplier (Same row)',
    columnMap: { model: 0, specs: 1, price: 2 },
    rows: [
      ['KOD', 'OPIS', 'NETTO'],
      ['DS-2CD2043G2-I', 'Kamera 4MP, 2.8mm, IR40m', 250.50]
    ],
    expected: (res) => res['DS-2CD2043G2-I'] && res['DS-2CD2043G2-I'].price === 250.50
  },
  {
    name: 'Exclusion of non-device items',
    columnMap: { model: 0, specs: 1, price: 2 },
    rows: [
      ['KOD', 'OPIS', 'NETTO'],
      ['KABEL-UTP', 'Kabel sieciowy kat 5e', 1.20],
      ['AWO100', 'Obudowa alarmowa', 80.00]
    ],
    expected: (res) => !res['KABEL-UTP'] && res['AWO100']
  }
];

scenarios.forEach(s => {
  const result = processRows(s.rows, s.columnMap);
  const passed = s.expected(result);
  console.log(`Test: ${s.name} -> ${passed ? 'PASSED' : 'FAILED'}`);
  if (!passed) console.log('Result:', result);
});
