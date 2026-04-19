import * as fs from 'fs';
import * as path from 'path';
import { parsePDFHeuristic, parseExcel, getKnowledge } from '../src/lib/knowledge/parser';

const PROJECT_ROOT = process.cwd();
const DOWNLOAD_DIR = path.join(PROJECT_ROOT, 'public/uploads/catalogs/universal_live');

const TARGETS = [
  { name: 'Cennik BE WAVE 2025-03-17_BF.pdf', path: path.join(DOWNLOAD_DIR, 'Cennik BE WAVE 2025-03-17_BF.pdf'), type: 'pdf' },
  { name: 'GDEPOLSKA-CennikCOMMAX30.09.2024.pdf', path: path.join(DOWNLOAD_DIR, 'GDEPOLSKA-CennikCOMMAX30.09.2024.pdf'), type: 'pdf' },
  { name: 'GDEPOLSKA-CennikSCOT30.09.2024.pdf', path: path.join(DOWNLOAD_DIR, 'GDEPOLSKA-CennikSCOT30.09.2024.pdf'), type: 'pdf' },
  { name: 'Cennik_detaliczny_EMU_IQ_2023.xlsx', path: path.join(PROJECT_ROOT, 'public/uploads/catalogs/Cennik_detaliczny_EMU_IQ_2023.xlsx'), type: 'excel' }
];

async function runTargetedRecovery() {
  console.log('=== STARTING TARGETED RECOVERY HARVEST V3 ===');
  
  for (const target of TARGETS) {
      if (fs.existsSync(target.path)) {
        console.log(`\n> Processing ${target.name}...`);
        const buffer = fs.readFileSync(target.path);
        try {
            let learned = 0;
            if (target.type === 'pdf') {
                const res = await parsePDFHeuristic(buffer, target.name, ({message}: any) => console.log(`    ${message}`));
                learned = res.count;
            } else {
                const res = await parseExcel(buffer, target.name, ({message}: any) => console.log(`    ${message}`));
                learned = res.count;
            }
            console.log(`  [OK] Learned ${learned} products from ${target.name}.`);
        } catch (e: any) {
            console.error(`  [ERROR] ${target.name}: ${e.message}`);
        }
      } else {
        console.warn(`  [MISSING] File ${target.name} not found at ${target.path}!`);
      }
  }

  // Summary check
  const store = await getKnowledge();
  console.log('\n=== CURRENT KNOWLEDGE STATUS ===');
  TARGETS.forEach(t => {
      const count = Object.values(store.knowledge).filter((k: any) => k.source?.includes(t.name)).length;
      console.log(` - ${t.name}: ${count} products`);
  });
}

runTargetedRecovery().catch(console.error);
