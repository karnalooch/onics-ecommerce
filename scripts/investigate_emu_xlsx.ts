import * as XLSX from 'xlsx';

const file = 'public/uploads/catalogs/Cennik_detaliczny_EMU_IQ_2023.xlsx';

async function investigate() {
  const wb = XLSX.readFile(file);
  console.log('SHEETS:', wb.SheetNames);
  
  for (const name of wb.SheetNames) {
    console.log(`\n--- SHEET: ${name} ---`);
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    for (let i = 0; i < Math.min(20, rows.length); i++) {
      console.log(`Row ${i}:`, JSON.stringify(rows[i]));
    }
  }
}

investigate().catch(console.error);
