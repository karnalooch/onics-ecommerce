// Test script for Pulsar parsing logic in Excel
const PULSAR_REGEX = /^(AWO|AWZ|EN54|HPSB|AWOP|KDSB|SWB)/i;

const rawRows = [
  ['SYMBOL', 'SPECS', 'PRICE'], // Header
  ['AWO000 - Obudowa 7/TRP20/DSPR', null, 135.0], // Row with symbol but no specs
  ['250x250x80+8, TRP 20VA/16V/18V, 7Ah', null, null], // Specs in next row (specs column)
  ['AWZ101', 'Description on same row', 100], // Standard case
  ['HPSB-12V5A', null, 200], // Model on row N
  [null, '12V/5A specific specs', null], // Specs on row N+1
  ['OTHER-PROD', 'Other specs', 50], // Non-pulsar
];

const columnMap = { model: 0, specs: 1 };
const knowledge = {};

for (let i = 1; i < rawRows.length; i++) {
  const row = rawRows[i];
  if (!row) continue;
  
  let model = row[columnMap.model];
  let specs = row[columnMap.specs];
  
  if (model) {
    const modelText = String(model).trim();
    
    // Logic from parser.ts
    if (PULSAR_REGEX.test(modelText) && (!specs || String(specs).length < 5)) {
      const nextRow = rawRows[i + 1];
      if (nextRow && nextRow[columnMap.specs]) {
        specs = nextRow[columnMap.specs];
      } else if (nextRow && nextRow[columnMap.model] && !PULSAR_REGEX.test(String(nextRow[columnMap.model]))) {
         specs = nextRow[columnMap.model];
      }
    }

    if (specs) {
      const specsText = String(specs).trim();
      const actualModel = modelText.split(' ')[0].toUpperCase();
      knowledge[actualModel] = { specs: specsText };
    }
  }
}

console.log('Extracted Knowledge:');
console.log(JSON.stringify(knowledge, null, 2));

// Assertions
if (knowledge['AWO000'] && knowledge['AWO000'].specs.includes('250x250')) {
  console.log('SUCCESS: AWO000 parsed correctly with next-row specs.');
} else {
  console.log('FAILURE: AWO000 missing or incorrect.');
}

if (knowledge['HPSB-12V5A'] && knowledge['HPSB-12V5A'].specs.includes('12V/5A')) {
  console.log('SUCCESS: HPSB parsed correctly with next-row specs.');
} else {
  console.log('FAILURE: HPSB missing or incorrect.');
}

if (knowledge['AWZ101'] && knowledge['AWZ101'].specs === 'Description on same row') {
  console.log('SUCCESS: AWZ101 parsed correctly on same row.');
} else {
  console.log('FAILURE: AWZ101 missing or incorrect.');
}
