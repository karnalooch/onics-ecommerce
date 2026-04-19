import * as fs from 'fs';
import pdf from 'pdf-parse';

async function examineMultiple() {
  const files = [
    'public/uploads/catalogs/universal_live/Cennik BE WAVE 2025-03-17_BF.pdf',
    'public/uploads/catalogs/universal_live/GDEPOLSKA-CennikCOMMAX30.09.2024.pdf',
    'public/uploads/catalogs/universal_live/GDEPOLSKA-CennikSCOT30.09.2024.pdf'
  ];

  for (const f of files) {
    console.log(`\n--- EXAMINING: ${f} ---`);
    if (!fs.existsSync(f)) {
      console.log('File NOT found');
      continue;
    }
    try {
      const dataBuffer = fs.readFileSync(f);
      const data = await pdf(dataBuffer);
      console.log(data.text.substring(0, 1500));
    } catch (e: any) {
      console.error(`Error reading ${f}: ${e.message}`);
    }
  }
}

examineMultiple().catch(console.error);
