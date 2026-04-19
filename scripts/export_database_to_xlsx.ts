import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

const STORE_PATH = 'src/store/catalogKnowledge.json';
const EXPORT_PATH = 'E:/UNIVERSAL_DATABASE_EXPORT.xlsx';

async function exportDatabase() {
    console.log('=== EXPORTING UNIVERSAL DATABASE TO XLSX ===');
    
    if (!fs.existsSync(STORE_PATH)) {
        console.error('Database file not found!');
        return;
    }

    const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    const rows: any[] = [];

    // Flatten logic
    for (const [symbol, info] of Object.entries(store.knowledge)) {
        const item = info as any;
        rows.push({
            'MODEL / SYMBOL': symbol,
            'CENA': item.price || 'BRAK',
            'SPECYFIKACJA': item.specs || '',
            'ŹRÓDŁO': item.source || 'Nieznane',
            'DATA DODANIA': item.dateAdded || 'Brak daty'
        });
    }

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Set column widths for better readability
    const wscols = [
        {wch: 25}, // Model
        {wch: 15}, // Price
        {wch: 100}, // Specs
        {wch: 40}, // Source
        {wch: 20}  // Date
    ];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, 'KnowledgeBase');

    // Write file
    XLSX.writeFile(wb, EXPORT_PATH);
    
    console.log(`\nDONE! Exported ${rows.length} products to: ${EXPORT_PATH}`);
}

exportDatabase().catch(console.error);
