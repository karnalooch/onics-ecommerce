import * as XLSX from 'xlsx';
import * as path from 'path';

const filePath = 'e:/Antigravity/projekty/celtronicsb2b/public/uploads/catalogs/universal_mass_test/ELFON-cennik-zbiorczy.xls';
const workbook = XLSX.readFile(filePath);
for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 0 }).slice(0, 20);
    console.log(`\n--- SHEET: ${sheetName} ---`);
    console.log(JSON.stringify(rawRows, null, 2));
}
