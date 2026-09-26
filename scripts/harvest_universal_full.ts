import { parseExcel, parsePDFWithAI, getKnowledge } from '../src/lib/knowledge/parser';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

const URLS = [
  'https://www.universal.net.pl/files/cenniki/afg/CENNIK_AFG%202026-03-18.pdf',
  'https://www.universal.net.pl/files/cenniki/alarmtech/Cennik%20detaliczny%20PL%202026.xlsx',
  'https://www.universal.net.pl/files/cenniki/atte/atte_cennik_detaliczny_01_10_2022.pdf',
  'https://www.universal.net.pl/files/cenniki/bcs/BCS%20-%20BCS%20LINE%20CENNIK%202026.pdf',
  'https://www.universal.net.pl/files/cenniki/bcs/BCS%20-%20BCS%20POINT%20CENNIK%202026.pdf',
  'https://www.universal.net.pl/files/cenniki/bcs/BCS%20-%20BCS%20BASIC%20CENNIK%202026.pdf',
  'https://www.universal.net.pl/files/cenniki/bcs/BCS%20-%20BCS%20ULTRA-FLEX%20CENNIK%202026.pdf',
  'https://www.universal.net.pl/files/cenniki/bcs/BCS%20-%20BCS%20VIEW%20CENNIK%202026.pdf',
  'https://www.universal.net.pl/files/cenniki/bcs/BCS%20-%20BCS%20POWER%20CENNIK%202026.pdf',
  'https://www.universal.net.pl/files/cenniki/bcs/BCS%20-%20BCS%20KONTROLA%20CENNIK%202026.pdf',
  'https://www.universal.net.pl/files/cenniki/bcs/BCS%20-%20BCS%20WIDEODOMOFONY%20CENNIK%202026.pdf',
  'https://www.universal.net.pl/files/cenniki/bosch/07.04.2026_Cennik_VS_PLv4.xlsx',
  'https://www.universal.net.pl/files/cenniki/bosch/20260301_Cennik_SKD_SSWiN_PL_2026v2.xlsx',
  'https://www.universal.net.pl/files/cenniki/bosch/2026_01_01_Cennik%20Systemy%20Sygnalizacji%20Pozaru_V1.xlsx',
  'https://www.universal.net.pl/files/cenniki/bosch/01_01_2026_Cennik_systemow_naglosnieniowych_i_DSO_REUP_PRA.xlsm',
  'https://www.universal.net.pl/files/cenniki/bosch/01_01_2026_Cennik_systemow_kongresowych_i_konferencyjnych_REUP.xlsm',
  'https://www.universal.net.pl/files/cenniki/bosch/2026_03_01_MAP5000%20v1%20PL.xlsx',
  'https://www.universal.net.pl/files/cenniki/camsat/Cennik%20CAMSAT%202024_2025%20-%20ca%C5%82y%20cennik.pdf',
  'https://www.universal.net.pl/files/cenniki/d+h/CENNIK_produkt%C3%B3w_D+H_obowiazuje_7.10.2025.pdf',
  'https://www.universal.net.pl/files/cenniki/dahua/Dahua_Technology_Poland_Cennik_Q1_2026_03_23_Dystrybucja.xlsx',
  'https://www.universal.net.pl/files/cenniki/dahua/Dahua%20SSP.xlsx',
  'https://www.universal.net.pl/files/cenniki/elfon/ELFON-cennik-zbiorczy.xls',
  'fixtures/catalogs/Cennik_detaliczny_EMU_IQ_2023.xlsx',
  'https://www.universal.net.pl/files/cenniki/ewimar/Cennik%20produkt%C3%B3w%20Ewimar%2002.04.2024r..xlsx',
  'https://www.universal.net.pl/files/cenniki/gde/GDEPOLSKA-CennikCOMMAX30.09.2024.pdf',
  'https://www.universal.net.pl/files/cenniki/gde/GDEPOLSKA-CennikSCOT30.09.2024.pdf',
  'https://www.universal.net.pl/files/cenniki/gorke/0_CENNIK2023_GORKE%20NOWY%202%20%28version%203%29.xlsb%20%28003%29%2010.2024.xlsx',
  'https://www.universal.net.pl/files/cenniki/gorke/CENNIK%202023%20GORKE%20KONDYGNACJE_%20cennikSP_GORKE_v_12%202024.xlsx',
  'https://www.universal.net.pl/files/cenniki/hanwha/Hanwha_Vision_Europe_Price_List_-_April_2026_-_EUR.xlsx',
  'https://www.universal.net.pl/files/cenniki/hikvision/Hikvision%20Poland%202026%20Q2%20Price%20List%20Channel%20%28MSRP%29-202604.xlsx',
  'https://www.universal.net.pl/files/cenniki/merawex/MERAWEX-Cennik-PLN-07.01.2026.xlsx',
  'https://www.universal.net.pl/files/cenniki/pulsar/Pulsar_Cennik_v2.04.6.pdf',
  'https://www.universal.net.pl/files/cenniki/roger/ROGER-cennik-PLN-2026.01.31-Rev.B.xlsx',
  'https://www.universal.net.pl/files/cenniki/ropam/cennik_ropam-elektronik_20260302.pdf',
  'https://www.universal.net.pl/files/cenniki/satel/Cennik%20SSWiN_2026-02-16_BF.pdf',
  'https://www.universal.net.pl/files/cenniki/satel/Cennik%20BE%20WAVE%202025-03-17_BF.pdf',
  'https://www.universal.net.pl/files/cenniki/vidos/CENNIK-VIDOS-DUO-20250101.pdf',
  'https://www.universal.net.pl/files/cenniki/vidos/CENNIK-VIDOS-ONE-20250101-1.pdf',
  'https://www.universal.net.pl/files/cenniki/vidos/CENNIK-VIDOS-SYSTEMY-ANALOG-20241106.pdf',
  'https://www.universal.net.pl/files/cenniki/vidos/CENNIK-VIDOS-KONTROLA-DOSTEPU-20241024.pdf',
  'https://www.universal.net.pl/files/cenniki/vidos/CENNIK-SKRZYNKI-NA-LISTY-20250101.pdf',
  'https://www.universal.net.pl/files/cenniki/vidos/CENNIK-NAPEDY-20250101.pdf',
  'https://www.universal.net.pl/files/cenniki/w2/W2%20-%20Cennik%20produkt%C3%B3w%20SSP%20SSWIN%20Telekomunikacja%202026.pdf',
  'https://www.universal.net.pl/files/cenniki/edimax/Edimax%20PriceList%202025.xlsx',
  'https://www.universal.net.pl/files/cenniki/neovo/Cennik%20AG%20Neovo%20Q4%202025.xlsx'
];

async function downloadFile(url: string, dest: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(dest, Buffer.from(buffer));
}

async function harvest() {
  const downloadDir = path.join(process.cwd(), '.local/celtronics/harvest/universal_live');
  if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });

  const summaryRows = [];
  const sheets: { name: string, data: any[] }[] = [];

  for (const source of URLS) {
    const isRemote = /^https?:\/\//i.test(source);
    const filename = isRemote
      ? path.basename(decodeURIComponent(new URL(source).pathname))
      : path.basename(source);
    const dest = isRemote
      ? path.join(downloadDir, filename)
      : path.resolve(process.cwd(), source);
    
    console.log(`\n>>> [HARVEST] ${filename}`);
    
    try {
        if (isRemote && !fs.existsSync(dest)) {
          console.log(`   Downloading...`);
          await downloadFile(source, dest);
        } else if (isRemote) {
          console.log(`   Already exists, re-parsing...`);
        } else {
          console.log(`   Reading fixture: ${source}`);
        }

        const buffer = fs.readFileSync(dest);
        const isPdf = filename.toLowerCase().endsWith('.pdf');
        const isExcel = filename.toLowerCase().endsWith('.xlsx') || filename.toLowerCase().endsWith('.xls') || filename.toLowerCase().endsWith('.xlsm') || filename.toLowerCase().endsWith('.xlsb');
        
        let learned = 0;

        if (isExcel) {
          const result = await parseExcel(buffer, filename, (p) => {});
          learned = result.count;
        } else if (isPdf) {
          try {
             // For PDF we use Heuristic instead of AI to avoid costs/keys, 
             // but harvest_universal_full previously used parsePDFWithAI. 
             // I will use parseExcel or similar for PDF if updated? 
             // Actually, parser.ts exports parsePDFHeuristic now.
             const { parsePDFHeuristic } = require('../src/lib/knowledge/parser');
             const pdfResult = await parsePDFHeuristic(buffer, filename, (p: any) => {});
             learned = pdfResult.count;
          } catch(err) {
             console.log(`   PDF Error: ${err.message}`);
          }
        }

        console.log(`   Learned: ${learned} products.`);
        summaryRows.push({ 
          'Dystrybutor / Cennik': filename, 
          'Liczba produktów': learned,
          'Status': learned > 0 ? 'Sukces' : 'Pusty / Do weryfikacji'
        });

        // Collect rows for this sheet
        const currentStore = await getKnowledge();
        const extractedForThisFile = [];
        for (const [model, data] of Object.entries(currentStore.knowledge)) {
            if ((data as any).source?.includes(filename)) {
                extractedForThisFile.push({ 
                  MODEL: model, 
                  OPIS: (data as any).specs, 
                  CENA: (data as any).price, 
                  WALUTA: (data as any).currency || 'PLN' 
                });
            }
        }

        if (extractedForThisFile.length === 0) {
            extractedForThisFile.push({ MODEL: "INFO", OPIS: "Nie znaleziono produktów w tym pliku przy użyciu obecnych heurystyk." });
        }

        let sheetName = filename.substring(0, 31).replace(/[\\/?*[\]]/g, '');
        sheets.push({ name: sheetName, data: extractedForThisFile });

    } catch (e: any) {
        console.error(`   [ERROR] ${filename}: ${e.message}`);
        summaryRows.push({ 'Dystrybutor / Cennik': filename, 'Liczba produktów': 0, 'Status': 'BŁĄD: ' + e.message });
        sheets.push({ name: filename.substring(0, 31), data: [{ Status: "Error", Message: e.message }] });
    }
  }

  // --- BUILD WORKBOOK ---
  const wbOut = XLSX.utils.book_new();

  // 1. Summary Sheet FIRST
  console.log(`\n>>> Building Master Workbook...`);
  summaryRows.push({});
  summaryRows.push({ 'Dystrybutor / Cennik': 'SUMA CAŁKOWITA', 'Liczba produktów': summaryRows.reduce((a, b) => a + (typeof b['Liczba produktów'] === 'number' ? b['Liczba produktów'] : 0), 0) });
  
  const wsSum = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wbOut, wsSum, 'Podsumowanie');

  // 2. All other sheets
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.data);
    
    // Excel sheet name uniqueness check
    let finalName = s.name;
    let counter = 1;
    while (wbOut.SheetNames.includes(finalName)) {
      finalName = s.name.substring(0, 27) + "_" + (counter++);
    }
    XLSX.utils.book_append_sheet(wbOut, ws, finalName);
  }

  const outPath = 'E:\\universal_pelny_raport.xlsx';
  try {
     XLSX.writeFile(wbOut, outPath);
     console.log(`\n==========================================`);
     console.log(`ZAKOŃCZONO ŻNIWA!`);
     console.log(`Łącznie zakładek: ${wbOut.SheetNames.length}`);
     console.log(`Raport zbiorczy: ${outPath}`);
     console.log(`==========================================`);
  } catch(e: any) {
     console.error(`\n[FATAL ERROR] Nie można zapisać pliku ${outPath}. Upewnij się że EXCEL JEST ZAMKNIĘTY.`);
  }
}

harvest().catch(console.error);
