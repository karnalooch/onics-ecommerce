import { NextResponse } from 'next/server';
import { parseExcel, parsePDFWithAI, getKnowledge, saveKnowledge } from '@/lib/knowledge/parser';
import { ProgressCallback } from '@/lib/knowledge/types';
import fs from 'fs';
import path from 'path';

// GET: Strumień postępu uczenia AI (Server-Sent Events)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get('filename');
  const apiKey = searchParams.get('apiKey');
  const modelId = searchParams.get('modelId');

  if (!filename) {
    return new Response('Brak parametru filename', { status: 400 });
  }

  const filePath = path.join(process.cwd(), 'public/uploads/catalogs', filename);
  if (!fs.existsSync(filePath)) {
    return new Response('Plik nie istnieje', { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;
      const cancelSignal = { aborted: false };

      const sendUpdate = (data: any) => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (e: any) {
          // Toolkit Pattern: silent-connection-close
          // Jeśli błąd to "Controller is already closed", ignorujemy go milcząco (to standard przy anulowaniu)
          if (e.message?.includes('closed') || e.code === 'ERR_INVALID_STATE') return;
          console.error("SSE Send Error:", e);
        }
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
            availableModels: modelPool,
            signal: cancelSignal
          });
          
          const currentStore = await getKnowledge();
          if (!currentStore.processedSources.includes(filename)) {
            currentStore.processedSources.push(filename);
            await saveKnowledge(currentStore);
          }
          sendUpdate({ 
            type: 'done', 
            message: 'Uczenie zakończone sukcesem.', 
            count: result.count, 
            stats: result.stats,
            knowledge: result.sessionKnowledge 
          });
        } else if (filename.toLowerCase().endsWith('.pdf')) {
          const result = await parsePDFWithAI(
            buffer, 
            filename, 
            apiKey, 
            modelId || 'gemini-1.5-flash',
            modelPool,
            onProgress,
            cancelSignal
          );
          sendUpdate({ 
            type: 'done', 
            message: 'Uczenie zakończone sukcesem.', 
            count: result.count, 
            stats: result.stats,
            knowledge: result.sessionKnowledge 
          });
        } else {
          sendUpdate({ type: 'error', message: 'Nieobsługiwany format pliku.' });
        }
      } catch (err: any) {
        if (err.message === 'PROCES_PRZERWANY') {
          console.log(`[AI-SIGNAL] Proces ${filename} przerwany przez użytkownika.`);
        } else {
          sendUpdate({ type: 'error', message: `Błąd: ${err.message}` });
        }
      } finally {
        clearInterval(heartbeat);
        isClosed = true;
        cancelSignal.aborted = true;
        try {
          controller.close();
        } catch (e) {}
      }
    },
    cancel() {
      // Wykryto rozłączenie klienta (np. zamknięcie zakładki)
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
