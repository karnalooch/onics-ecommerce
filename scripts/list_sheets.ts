import * as XLSX from 'xlsx';
import * as fs from 'fs';

const REPORT_PATH = 'E:/universal_full_report.xlsx';

function listSheets() {
  if (!fs.existsSync(REPORT_PATH)) {
    console.error('Report not found!');
    return;
  }
  const wb = XLSX.readFile(REPORT_PATH);
  console.log('--- SHEET LIST ---');
  console.log(wb.SheetNames.join('\n'));
  
  const firstDataSheet = wb.SheetNames.find(n => n !== 'Podsumowanie');
  if (firstDataSheet) {
    const ws = wb.Sheets[firstDataSheet];
    const range = XLSX.utils.sheet_to_json(ws, { header: 1 });
    console.log(`\n--- HEADERS (Sheet: ${firstDataSheet}) ---`);
    console.log(JSON.stringify(range[0]));
  }
}

listSheets();
