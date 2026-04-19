import { getKnowledge } from '../src/lib/knowledge/parser';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

async function generateEmuOnly() {
    console.log('=== GENERATING EMU-ONLY REPORT V9 ===');
    const store = await getKnowledge();
    const emuProducts = [];

    for (const [model, info] of Object.entries(store.knowledge)) {
        if ((info as any).source?.includes('EMU_IQ_2023')) {
            emuProducts.push({
                MODEL: model,
                OPIS: (info as any).specs,
                CENA: (info as any).price,
                WALUTA: 'PLN'
            });
        }
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(emuProducts);
    XLSX.utils.book_append_sheet(wb, ws, 'EMU');

    const outPath = 'E:/EMU_RAPORT_V9_KONCOWY.xlsx';
    XLSX.writeFile(wb, outPath);
    console.log(`EMU raw report saved to ${outPath}`);
}

generateEmuOnly().catch(console.error);
