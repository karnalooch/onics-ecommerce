import * as fs from 'fs';
import pdf from 'pdf-parse';

async function readAtte() {
  const b = fs.readFileSync('public/uploads/catalogs/universal_live/atte_cennik_detaliczny_01_10_2022.pdf');
  const d = await pdf(b);
  console.log('--- ATTE START ---');
  console.log(d.text);
  console.log('--- ATTE END ---');
}

readAtte().catch(console.error);
