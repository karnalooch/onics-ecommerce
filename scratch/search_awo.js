const XLSX = require('xlsx');
const workbook = XLSX.readFile('c:/Users/User/Documents/Cloude/public/uploads/catalogs/Cennik detaliczny PL 2026.xlsx');
workbook.SheetNames.forEach(name => {
  const sheet = workbook.Sheets[name];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  data.forEach((row, i) => {
    if (JSON.stringify(row).includes('AWO000')) {
      console.log(`Found in sheet "${name}" at row ${i}:`, row);
      if (data[i+1]) console.log(`Next row:`, data[i+1]);
    }
  });
});
