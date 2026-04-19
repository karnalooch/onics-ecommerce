import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const INPUT_PATH = 'E:/EMU_RAW_V5.xlsx';
const OUTPUT_PATH = 'E:/EMU_RAPORT_TOP_FINAL.xlsx';

interface TaxonomyRule {
    category: string;
    subcategory: string;
    keywords: string[];
}

const TAXONOMY: TaxonomyRule[] = [
    { category: 'Zasilanie', subcategory: 'Akumulatory', keywords: ['AKUMULATOR', 'BATERIA AGM', 'BATERIA LITOWA', '7AH', '17AH', '18AH', ' żelowy', 'AKUM', 'BAT-', 'LFP', 'EP ', 'AM ', 'TCL', 'FGB'] },
    { category: 'Zasilanie', subcategory: 'UPS', keywords: ['UPS', 'ZASILACZ AWARYJNY'] },
    { category: 'Zasilanie', subcategory: 'Ładowarki', keywords: ['ŁADOWARKA', 'CHARGER', 'CH-LFP'] },
];

const BRAND_MAP: Record<string, string> = {
    'EMU': 'EMU',
    'Europower': 'Europower',
    'Acumax': 'Acumax',
    'Alarmtec': 'Alarmtec',
    'Technocell': 'Technocell',
    'FGB': 'FGB'
};

function classify(model: string, desc: string): { cat: string, sub: string } {
    const text = `${model} ${desc}`.toUpperCase();
    for (const rule of TAXONOMY) {
        if (rule.keywords.some(k => text.includes(k.toUpperCase()))) {
            return { cat: rule.category, sub: rule.subcategory };
        }
    }
    return { cat: 'Zasilanie', sub: 'Akumulatory i Baterie' };
}

async function enrich() {
    console.log('=== STARTING ENRICHMENT V6 ===');
    if (!fs.existsSync(INPUT_PATH)) return;

    const wbIn = XLSX.readFile(INPUT_PATH);
    const wbOut = XLSX.utils.book_new();

    for (const sheetName of wbIn.SheetNames) {
        const ws = wbIn.Sheets[sheetName];
        let rows: any[] = XLSX.utils.sheet_to_json(ws);
        
        const enrichedRows = rows.map(row => {
            const model = row.MODEL || row.Model || '';
            const desc = row.OPIS || row.Specs || '';
            const classification = classify(model, desc);
            
            // Extract brand from model if possible
            let brand = 'EMU';
            if (model.startsWith('EP')) brand = 'Europower';
            else if (model.startsWith('AM')) brand = 'Acumax';
            else if (model.startsWith('BP')) brand = 'Alarmtec';
            else if (model.startsWith('TCL')) brand = 'Technocell';
            else if (model.startsWith('FGB')) brand = 'FGB';

            return {
                ...row,
                PRODUCENT: brand,
                KATEGORIA: classification.cat,
                PODKATEGORIA: classification.sub
            };
        });

        const newWs = XLSX.utils.json_to_sheet(enrichedRows);
        XLSX.utils.book_append_sheet(wbOut, newWs, sheetName);
    }

    XLSX.writeFile(wbOut, OUTPUT_PATH);
    console.log(`\nDONE! Final clean report saved to: ${OUTPUT_PATH}`);
}

enrich().catch(console.error);
