import * as XLSX from 'xlsx';

const file = 'E:/EMU_RAPORT_V9_KONCOWY.xlsx';

async function checkOutput() {
  if (!require('fs').existsSync(file)) {
      console.error('File does not exist!');
      return;
  }
  const wb = XLSX.readFile(file);
  const ws = wb.Sheets['EMU'];
  const rows = XLSX.utils.sheet_to_json(ws);
  console.log('TOTAL ROWS:', rows.length);
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    console.log(`Row ${i}:`, JSON.stringify(rows[i], null, 2));
  }
}

checkOutput().catch(console.error);
