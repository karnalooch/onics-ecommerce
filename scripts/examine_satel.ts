import * as fs from 'fs';
import pdf from 'pdf-parse';

async function examineSatel() {
  const filePath = 'public/uploads/catalogs/universal_live/Cennik SSWiN_2026-02-16_BF.pdf';
  if (!fs.existsSync(filePath)) {
    console.error('File not found');
    return;
  }
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);
  
  console.log('--- SATEL PDF RAW TEXT (First 2000 chars) ---');
  console.log(data.text.substring(0, 2000));
}

examineSatel().catch(console.error);
