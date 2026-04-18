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
          // Toolkit Pattern: resilient-error-handling
          if (response.status === 404 || response.status === 400) {
            onProgress?.({ type: 'log', message: `Model ${selectedModel} niedostępny (Błąd ${response.status}). Szukam alternatywy...` });
            this.switchToNextModel(models);
            retries++;
            continue;
          }
          
          if (response.status === 429) {
            onProgress?.({ type: 'log', message: `Limit Rate-Limit (429) dla ${selectedModel}. Czekam i przełączam...` });
            this.switchToNextModel(models);
            await new Promise(r => setTimeout(r, 2000 * (retries + 1)));
            retries++;
            continue;
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
          // Toolkit Pattern: json-mode-resilient-parsing (V3)
          const cleanJson = (text: string) => {
            // 1. Usuń bloki markdown ```json ... ```
            let cleaned = text.replace(/```json\s?([\s\S]*?)\s?```/g, '$1');
            // 2. Jeśli nadal nie jest czystym JSON, szukaj pierwszej [ lub {
            const firstBracket = cleaned.search(/[\[\{]/);
            const lastBracket = cleaned.lastIndexOf(cleaned.startsWith('[') || cleaned.includes('[') ? ']' : '}');
            if (firstBracket !== -1 && lastBracket !== -1) {
              cleaned = cleaned.substring(firstBracket, lastBracket + 1);
            }
            return cleaned.trim();
          };

          const candidates = cleanJson(textResponse);
          const parsed = JSON.parse(candidates);
          
          // Zawsze zwracaj tablicę, nawet jeśli AI zwróciło pojedynczy obiekt
          return Array.isArray(parsed) ? parsed : [parsed];

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

