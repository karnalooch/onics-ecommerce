import { z } from 'zod';

export const KnowledgeEntrySchema = z.object({
  specs: z.string().min(1),
  price: z.number().nullable(),
  currency: z.string().default('PLN'),
  source: z.string().optional(),
  date: z.string().optional(),
  manufacturer: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
});

export type KnowledgeEntry = z.infer<typeof KnowledgeEntrySchema>;

export interface KnowledgeStore {
  lastUpdated: string | null;
  sources: string[];
  processedSources: string[];
  knowledge: Record<string, KnowledgeEntry>;
}

export interface ExtractionResult {
  model: string;
  specs: string;
  price: number | null;
  manufacturer?: string;
  category?: string;
  subcategory?: string;
}

export type ProgressCallback = (update: { 
  type: 'log' | 'progress' | 'error'; 
  message: string; 
  count?: number;
  percent?: number;
}) => void;

export interface ParsingStrategy {
  name: string;
  execute(data: any): Promise<ExtractionResult[]>;
}

export interface ParserOptions {
  apiKey: string;
  modelId?: string;
  availableModels?: string[];
  signal?: { aborted: boolean };
}
