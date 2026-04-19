import { getKnowledge } from '../src/lib/knowledge/parser';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

async function generateFastReport() {
    console.log('=== GENERATING FAST REPORT FROM KNOWLEDGE STORE ===');
    const store = await getKnowledge();
    const wb = XLSX.utils.book_new();

    // Mapping files to sheet names
    const fileToSheet: Record<string, string> = {};
    const sources = new Set<string>();
    
    // Group products by source file
    const dataBySource: Record<string, any[]> = {};

    for (const [model, info] of Object.entries(store.knowledge)) {
        const source = (info as any).source || 'Unknown';
        if (!dataBySource[source]) dataBySource[source] = [];
        dataBySource[source].push({
            MODEL: model,
            OPIS: (info as any).specs,
            CENA: (info as any).price,
            WALUTA: 'PLN'
        });
        sources.add(source);
    }

    // Sort sources to have Summary/Important first if needed
    const sortedSources = Array.from(sources).sort();

    // Summary Sheet
    const summaryData = sortedSources.map(s => ({
        'Cennik': s,
        'Liczba produktów': dataBySource[s].length
    }));
    const wsSum = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSum, 'Podsumowanie');

    // Add sheets for each source
    for (const src of sortedSources) {
        let sheetName = src.substring(0, 31).replace(/[\\/?*[\]]/g, '');
        const ws = XLSX.utils.json_to_sheet(dataBySource[src]);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    const outPath = 'E:/universal_pelny_raport.xlsx';
    XLSX.writeFile(wb, outPath);
    console.log(`Report generated successfully at ${outPath}`);
}

generateFastReport().catch(console.error);
