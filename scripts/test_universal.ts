import { parseExcel, parsePDFWithAI, getKnowledge } from '../src/lib/knowledge/parser';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

async function runTest() {
  console.log('Rozpoczynam PEŁNĄ analizę cenników Universal Catalog Hub...');
  const testDirs = [
    path.join(process.cwd(), 'fixtures/catalogs/mkj_tests'),
    path.join(process.cwd(), 'fixtures/catalogs/universal_mass_test')
  ];

  let totalParsed = 0;
  let filesProcessed = 0;

  for (const dir of testDirs) {
    if (!fs.existsSync(dir)) {
      console.warn(`Pominięto nieistniejący katalog: ${dir}`);
      continue;
    }
    
    const files = fs.readdirSync(dir);
    console.log(`\nPrzeszukiwanie katalogu: ${dir} (${files.length} plików)`);
    
    for (const file of files) {
      const isPdf = file.toLowerCase().endsWith('.pdf');
      const isExcel = file.toLowerCase().endsWith('.xlsx') || file.toLowerCase().endsWith('.xls') || file.toLowerCase().endsWith('.xlsm') || file.toLowerCase().endsWith('.xlsb');
      
      if (!isPdf && !isExcel) continue;
      
      const filePath = path.join(dir, file);
      process.stdout.write(`\r[PARSING] ${file.substring(0, 40)}...`);
      
      const buffer = fs.readFileSync(filePath);
      filesProcessed++;
      
      try {
        let result;
        if (isExcel) {
          result = await parseExcel(buffer, file, (progress) => {}, { apiKey: 'dummy' });
        } else {
          result = await parsePDFWithAI(buffer, file, 'dummy');
        }
        
        totalParsed += result.count;
      } catch (err: any) {
        process.stdout.write(`\n   ! Błąd parsera dla ${file}: ${err.message}\n`);
      }
    }
  }

  process.stdout.write(`\n\nAnaliza zakończona.\n`);
  console.log(`Przetworzono plików: ${filesProcessed}`);
  console.log(`Suma dodanych urządzeń do bazy wiedzy: ${totalParsed}`);
  
  // Eksport zgromadzonej wiedzy do XLSX na E:\
  const store = await getKnowledge();
  const rows = [];
  for (const [model, data] of Object.entries(store.knowledge)) {
    rows.push({
      Model: model,
      Specs: data.specs,
      Price: data.price,
      Currency: data.currency,
      Source: data.source,
      Date: data.date
    });
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Knowledge');
  
  const outputPath = 'E:\\universal_analiza_wynik.xlsx';
  XLSX.writeFile(wb, outputPath);
  
  console.log(`\n>>> ZAPISANO WYNIK: ${outputPath}`);
  console.log(`>>> ŁĄCZNIE W BAZIE WIEDZY: ${rows.length} produktów.`);
}

runTest().catch((err) => {
    console.error("\nKRYTYCZNY BŁĄD SKRYPTU:", err);
});
