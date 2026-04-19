import { parsePDFHeuristic } from '../src/lib/knowledge/parser';
import * as fs from 'fs';
import * as path from 'path';
import pdf from 'pdf-parse';

async function debugPDFs() {
  const files = [
    'public/uploads/catalogs/universal_live/CENNIK_AFG 2026-03-18.pdf',
    'public/uploads/catalogs/universal_live/atte_cennik_detaliczny_01_10_2022.pdf'
  ];

  for (const f of files) {
    const filePath = path.join(process.cwd(), f);
    if (!fs.existsSync(filePath)) {
       console.log(`[SKIP] NOT FOUND: ${f}`);
       continue;
    }
    console.log(`\n\n=== ANALYZING: ${f} ===`);
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    console.log(`--- RAW TEXT (First 1000 chars) ---`);
    console.log(data.text.substring(0, 1000));
    
    // Test heuristics
    const results = await parsePDFHeuristic(data.text, path.basename(f));
    console.log(`\n--- HEURISTIC RESULT: ${results.length} products found ---`);
  }
}

debugPDFs().catch(console.error);
