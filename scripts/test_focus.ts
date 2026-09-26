import { parsePDFWithAI, getKnowledge, saveKnowledge } from '../src/lib/knowledge/parser';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

async function runFocusedPDFTest() {
  console.log('POCZĄTEK SKONCENTROWANEJ ANALIZY PDF (V8 Heuristic)...');

  const fixtureRoot = path.resolve(
  process.env.CELTRONICS_FIXTURE_ROOT ||
    path.join(process.cwd(), '.local', 'celtronics', 'catalog-fixtures')
);
  const filesToTest = [
    'Pulsar_Cennik_Detal_2023.pdf',
    'universal_mass_test/pdfs/BCS - BCS BASIC CENNIK 2026.pdf',
    'universal_mass_test/pdfs/BCS - BCS KONTROLA CENNIK 2026.pdf',
    'universal_mass_test/pdfs/BCS - BCS LINE CENNIK 2026.pdf'
  ];

  let totalParsed = 0;

  for (const relativePath of filesToTest) {
    const filePath = path.join(fixtureRoot, relativePath);
    if (!fs.existsSync(filePath)) {
      console.warn(`[SKIP] Nie znaleziono pliku: ${relativePath}`);
      continue;
    }

    const filename = path.basename(filePath);
    process.stdout.write(`\n[PARSING PDF] ${filename}...\n`);
    
    const buffer = fs.readFileSync(filePath);
    
    try {
      const result = await parsePDFWithAI(buffer, filename, 'dummy', 'gemini-1.5-flash', [], (progress) => {
          if (progress.type === 'log') console.log(`   > ${progress.message}`);
      });
      console.log(`[SUKCES] Wyciągnięto ${result.count} produktów z ${filename}`);
      totalParsed += result.count;
    } catch (err: any) {
      console.error(`[BŁĄD] ${filename}: ${err.message}`);
    }
  }

  console.log(`\nFinał: Przetworzono ${totalParsed} produktów z BCS/Pulsar.`);
  
  // Eksport wyników do XLSX na E:\
  const store = await getKnowledge();
  const rows = [];
  
  // Filtrujemy tylko te pliki, które nas interesowały
  const filterSources = filesToTest.map(p => path.basename(p));
  
  for (const [model, data] of Object.entries(store.knowledge)) {
    if (filterSources.some(fsrc => data.source?.includes(fsrc))) {
        rows.push({
          Model: model,
          Specs: data.specs,
          Price: data.price,
          Currency: data.currency,
          Source: data.source,
          Date: data.date
        });
    }
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Knowledge_Focus');
  
  const outputPath = 'E:\\bcs_pulsar_wynik.xlsx';
  XLSX.writeFile(wb, outputPath);
  
  console.log(`\n>>> ZAPISANO WYNIK SKONCENTROWANY: ${outputPath}`);
}

runFocusedPDFTest().catch(console.error);
