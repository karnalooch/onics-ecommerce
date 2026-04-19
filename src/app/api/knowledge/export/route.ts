import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    const storePath = path.join(process.cwd(), 'src/store/catalogKnowledge.json');
    if (!fs.existsSync(storePath)) {
      return NextResponse.json({ error: 'Database not found' }, { status: 404 });
    }

    const fileContent = fs.readFileSync(storePath, 'utf8');
    const store = JSON.parse(fileContent);
    const knowledge = store.knowledge || {};

    const rows = Object.entries(knowledge).map(([symbol, info]: [string, any]) => ({
      'Model / Symbol': symbol,
      'Cena': info.price || 'BRAK',
      'Specyfikacja': info.specs || '',
      'Źródło': info.source || 'Baza Universal Hub',
      'Data Dodania': info.dateAdded || ''
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    const wscols = [
      { wch: 25 }, // Model
      { wch: 15 }, // Price
      { wch: 80 }, // Specs
      { wch: 40 }, // Source
      { wch: 20 }  // Date
    ];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, 'KnowledgeBase');

    // Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Return as downloadable file
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Universal_Database_Export.xlsx"',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
