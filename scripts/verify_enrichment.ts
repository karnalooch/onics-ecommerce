import * as XLSX from 'xlsx';

const path = 'E:/universal_full_report_enriched.xlsx';
const wb = XLSX.readFile(path);
const sheet = wb.SheetNames.find(n => n.includes('Dahua')) || wb.SheetNames[1];
const data = XLSX.utils.sheet_to_json(wb.Sheets[sheet]);

console.log(`Sheet: ${sheet}`);
console.log(JSON.stringify(data.slice(0, 3), null, 2));
