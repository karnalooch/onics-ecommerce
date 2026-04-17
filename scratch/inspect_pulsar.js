const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = 'c:/Users/User/Documents/Cloude/public/uploads/catalogs/Cennik detaliczny PL 2026.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log(`First 20 rows of ${sheetName}:`);
rawRows.slice(0, 50).forEach((row, i) => {
  console.log(`${i}: ${JSON.stringify(row)}`);
});
