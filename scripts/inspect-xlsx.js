const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(process.cwd(), 'public/uploads/catalogs/mkj_pelny_raport_enriched.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  console.log("Found Sheets:", workbook.SheetNames);

  workbook.SheetNames.forEach(name => {
    const worksheet = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log(`\n--- Sheet: ${name} ---`);
    if (data.length > 0) {
      console.log("Headers:", data[0]);
      console.log("Sample 1:", data[1]);
    }
  });

} catch (e) {
  console.error("Error reading XLSX:", e.message);
}
