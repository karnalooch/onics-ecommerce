import { NextResponse } from 'next/server';
import { parseExcel, parsePDFWithAI, getKnowledge, saveKnowledge, ProgressCallback } from '@/lib/knowledge/parser';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get('filename');
  const apiKey = searchParams.get('apiKey');
  const modelId = searchParams.get('modelId');
  const concurrencyLevel = parseInt(searchParams.get('concurrency') || '1');

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

      const onProgress: ProgressCallback = (update) => {
        sendUpdate({ ...update, timestamp: new Date().toLocaleTimeString() });
      };

      onProgress({ type: 'log', message: 'Utrzymywanie połączenia aktywne...' });
      const heartbeat = setInterval(() => {
        sendUpdate({ type: 'log', message: 'Analizowanie... (proszę czekać)', timestamp: new Date().toLocaleTimeString() });
      }, 15000);

      try {
        if (filename.toLowerCase().endsWith('.xlsx') || filename.toLowerCase().endsWith('.xls')) {
          await parseExcel(buffer, filename, onProgress);
          
          const currentStore = await getKnowledge();
          if (!currentStore.processedSources.includes(filename)) {
            currentStore.processedSources.push(filename);
            await saveKnowledge(currentStore);
          }
          sendUpdate({ type: 'done', message: 'Uczenie zakończone sukcesem.' });
        } else if (filename.toLowerCase().endsWith('.pdf')) {
          const availableModelsRaw = searchParams.get('availableModels') || '';
          const modelPool = availableModelsRaw ? availableModelsRaw.split(',') : [];
          
          await parsePDFWithAI(
            buffer, 
            filename, 
            apiKey, 
            modelId || 'gemini-1.5-flash', 
            modelPool, 
            onProgress,
            concurrencyLevel
          );
          sendUpdate({ type: 'done', message: 'Uczenie zakończone sukcesem.' });
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
