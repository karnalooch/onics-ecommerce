import * as fs from 'fs';
import * as path from 'path';
import { parsePDFHeuristic, getKnowledge } from '../src/lib/knowledge/parser';

const DOWNLOAD_DIR = path.join(process.cwd(), 'public/uploads/catalogs/universal_live');
const SATEL_FILE = 'Cennik SSWiN_2026-02-16_BF.pdf';

async function runSatelRecovery() {
  console.log('=== STARTING SATEL RECOVERY HARVEST ===');
  
  const filePath = path.join(DOWNLOAD_DIR, SATEL_FILE);
  
  if (fs.existsSync(filePath)) {
    console.log(`> Parsing ${SATEL_FILE}...`);
    const buffer = fs.readFileSync(filePath);
    const res = await parsePDFHeuristic(buffer, SATEL_FILE, ({message}: any) => console.log(`    ${message}`));
    console.log(`  [OK] Learned ${res.count} products.`);
    
    // Quick verification
    const store = await getKnowledge();
    const samples = Object.keys(store.knowledge).filter(k => store.knowledge[k].source?.includes(SATEL_FILE)).slice(0, 10);
    console.log(`\nSample products learned from Satel:`);
    samples.forEach(s => console.log(` - ${s}: ${store.knowledge[s].price} PLN`));
    
  } else {
    console.warn(`  [MISSING] File ${SATEL_FILE} not found!`);
  }
}

runSatelRecovery().catch(console.error);
