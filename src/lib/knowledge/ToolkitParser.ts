import { ExtractionResult, ProgressCallback } from './types';

interface ToolkitConfig {
  apiKey: string;
  modelId: string;
  availableModels?: string[];
}

interface GeminiContentPart {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string;
  };
}

interface GeminiRequest {
  contents: {
    parts: GeminiContentPart[];
  }[];
  generationConfig: {
    response_mime_type: string;
    response_schema?: any;
  };
}

export class ToolkitParser {
  private config: ToolkitConfig;
  private currentModelIndex: number = 0;
  private fallbackModels: string[] = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'];

  constructor(config: ToolkitConfig) {
    // Toolkit Pattern: resilient-input-validation
    const initialModels = (config.availableModels && config.availableModels.length > 0) 
      ? config.availableModels 
      : (config.modelId ? [config.modelId] : this.fallbackModels);

    this.config = {
      ...config,
      availableModels: initialModels
    };
    
    this.currentModelIndex = this.config.availableModels!.indexOf(this.config.modelId);
    if (this.currentModelIndex === -1) this.currentModelIndex = 0;
  }

  private stats = {
    model: '',
    requests: 0,
    type: 'text' as 'text' | 'vision'
  };

  public getStats() {
    return { ...this.stats };
  }

  /**
   * Wykonuje zapytanie do AI z automatycznym routingiem modeli (Toolkit Pattern: resilient-gateway)
   */
  async extractStructuredData(
    prompt: string, 
    context: string | Buffer,
    mimeType: string = "text/plain",
    onProgress?: ProgressCallback
  ): Promise<ExtractionResult[]> {
    const models = this.config.availableModels || this.fallbackModels;
    let retries = 0;
    const maxRetries = models.length + 1; // Próbujemy wszystkich dostępnych modeli + 1 retry

    while (retries < maxRetries) {
      const selectedModel = models[this.currentModelIndex] || this.fallbackModels[0];
      
      try {
        // Toolkit Pattern: api-version-routing
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${this.config.apiKey}`;

        const requestBody: GeminiRequest = {
          contents: [{ parts: [] }],
          generationConfig: { 
            response_mime_type: "application/json"
          }
        };

        if (typeof context === 'string') {
          requestBody.contents[0].parts.push({ text: `${prompt}\n\nDATA:\n${context}` });
        } else {
          requestBody.contents[0].parts.push({ text: prompt });
          requestBody.contents[0].parts.push({ 
            inline_data: { mime_type: mimeType, data: context.toString('base64') } 
          });
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          // Toolkit Pattern: resilient-error-handling (V4)
          if (response.status === 404 || response.status === 400) {
            onProgress?.({ type: 'log', message: `Model ${selectedModel} niedostępny (Błąd ${response.status}). Szukam alternatywy...` });
            this.switchToNextModel(models);
            retries++;
            continue;
          }
          
          if (response.status === 429) {
            onProgress?.({ type: 'log', message: `Limit Rate-Limit (429) dla ${selectedModel}. Czekam i przełączam...` });
            this.switchToNextModel(models);
            const waitTime = 2000 * (retries + 1);
            await new Promise(r => setTimeout(r, waitTime));
            retries++;
            continue;
          }

          // NOWY: Obsługa 503 i innych błędów serwerowych (Exponential Backoff)
          if (response.status >= 500 && response.status <= 504) {
            const waitTime = Math.pow(2, retries + 1) * 1000;
            onProgress?.({ type: 'log', message: `Serwer AI przeciążony (${response.status}). Ponawiam próbę za ${waitTime/1000}s... (Próba ${retries + 1}/${maxRetries})` });
            await new Promise(r => setTimeout(r, waitTime));
            retries++;
            // Przy 503 nie przełączamy modelu od razu, dajemy mu szansę „odsapnąć”
            continue;
          }
          
          if (response.status === 401 || response.status === 403) {
            throw new Error(`Błąd autoryzacji (401/403). Sprawdź klucz API.`);
          }

          throw new Error(`AI Gateway error: ${response.status}`);
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
        
        // Toolkit Pattern: metrics-tracking
        this.stats.model = selectedModel;
        this.stats.requests++;
        this.stats.type = mimeType.includes('pdf') || mimeType.includes('image') ? 'vision' : 'text';
        
        try {
          // Toolkit Pattern: json-mode-resilient-multi-block-extraction (V4)
          const extractAllJsonBlocks = (text: string): any[] => {
            const blocks: any[] = [];
            let depth = 0;
            let start = -1;
            let inString = false;
            let escape = false;

            for (let i = 0; i < text.length; i++) {
              const char = text[i];
              // Handle strings to avoid counting brackets inside them
              if (escape) { escape = false; continue; }
              if (char === '\\') { escape = true; continue; }
              if (char === '"') { inString = !inString; continue; }
              if (inString) continue;

              if (char === '[' || char === '{') {
                if (depth === 0) start = i;
                depth++;
              } else if (char === ']' || char === '}') {
                depth--;
                if (depth === 0 && start !== -1) {
                  const chunk = text.substring(start, i + 1);
                  try {
                    const parsed = JSON.parse(chunk);
                    if (Array.isArray(parsed)) blocks.push(...parsed);
                    else blocks.push(parsed);
                  } catch (e) {
                    // TOOLKIT PATTERN: boundary-repair-attempt
                    // If it failed but it's the end of string, it might be truncated
                    if (i === text.length - 1) {
                      try {
                        let inner = chunk.trim();
                        if (inner.endsWith(',')) inner = inner.slice(0, -1);
                        const repaired = inner + (inner.startsWith('[') ? ']' : '}');
                        const parsedR = JSON.parse(repaired);
                        if (Array.isArray(parsedR)) blocks.push(...parsedR);
                        else blocks.push(parsedR);
                      } catch(re) {}
                    }
                  }
                  start = -1;
                }
              }
            }

            // Fallback for simple single-block cases that might have been missed
            if (blocks.length === 0) {
              const first = text.search(/[\[\{]/);
              let last = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}'));
              if (first !== -1 && last > first) {
                try {
                  const cleaned = text.substring(first, last + 1);
                  const parsed = JSON.parse(cleaned);
                  return Array.isArray(parsed) ? parsed : [parsed];
                } catch (e) {
                   // Extreme fallback: regex attempt
                   const match = text.match(/\[[\s\S]*\]/);
                   if (match) return JSON.parse(match[0]);
                }
              }
            }
            return blocks;
          };

          const parsed = extractAllJsonBlocks(textResponse);
          if (parsed.length === 0 && textResponse.trim().length > 10) {
            throw new Error(`Nie udało się wyekstrahować ważnych danych z odpowiedzi AI: ${textResponse.substring(0, 50)}...`);
          }
          
          return parsed;

        } catch (parseErr) {
          onProgress?.({ type: 'log', message: "Błąd formatu JSON od AI. Próba głębokiej naprawy..." });
          
          // Ostateczny fallback: regex dla tablic
          const match = textResponse.match(/\[[\s\S]*\]/);
          if (match) return JSON.parse(match[0]);
          
          throw parseErr;
        }

      } catch (err: any) {
        console.error(`Toolkit Engine Error [${selectedModel}]:`, err.message);
        retries++;
        this.switchToNextModel(models);
        if (retries >= maxRetries) throw new Error(`Wszystkie dostępne modele zawiodły: ${err.message}`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    return [];
  }

  private switchToNextModel(models: string[]) {
    this.currentModelIndex = (this.currentModelIndex + 1) % models.length;
  }
}

