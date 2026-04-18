import { NextResponse } from 'next/server';
import { parseExcel, parsePDFWithAI, getKnowledge, saveKnowledge } from '@/lib/knowledge/parser';
import { ProgressCallback } from '@/lib/knowledge/types';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get('filename');
  const apiKey = searchParams.get('apiKey');
  const modelId = searchParams.get('modelId');

  if (!filename || !apiKey) {
    return new Response('Brak parametrów', { status: 400 });
  }

  const filePath = path.join(process.cwd(), 'public/uploads/catalogs', filename);
  if (!fs.existsSync(filePath)) {
    return new Response('Plik nie istnieje', { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const onProgress: ProgressCallback = (update: { type: 'log' | 'progress' | 'error'; message: string; count?: number; percent?: number; }) => {
        sendUpdate({ ...update, timestamp: new Date().toLocaleTimeString() });
      };

      onProgress({ type: 'log', message: 'Utrzymywanie połączenia aktywne...' });
      const heartbeat = setInterval(() => {
        sendUpdate({ type: 'log', message: 'Silnik pracuje... (oczekiwanie na AI)', timestamp: new Date().toLocaleTimeString() });
      }, 30000);

      try {
        const availableModelsRaw = searchParams.get('availableModels') || '';
        const modelPool = availableModelsRaw ? availableModelsRaw.split(',') : [];

        if (filename.toLowerCase().endsWith('.xlsx') || filename.toLowerCase().endsWith('.xls')) {
          const result = await parseExcel(buffer, filename, onProgress, { 
            apiKey, 
            modelId: modelId || 'gemini-1.5-flash',
            availableModels: modelPool
          });
          
          const currentStore = await getKnowledge();
          if (!currentStore.processedSources.includes(filename)) {
            currentStore.processedSources.push(filename);
            await saveKnowledge(currentStore);
          }
          sendUpdate({ type: 'done', message: 'Uczenie zakończone sukcesem.', count: result.count, stats: result.stats });
        } else if (filename.toLowerCase().endsWith('.pdf')) {
          const result = await parsePDFWithAI(
            buffer, 
            filename, 
            apiKey, 
            modelId || undefined,
            modelPool,
            onProgress
          );
          sendUpdate({ type: 'done', message: 'Uczenie zakończone sukcesem.', count: result.count, stats: result.stats });
        } else {
          sendUpdate({ type: 'error', message: 'Nieobsługiwany format pliku.' });
        }
      } catch (err: any) {
        sendUpdate({ type: 'error', message: `Błąd: ${err.message}` });
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
