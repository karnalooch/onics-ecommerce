import { z } from 'zod';

export const KnowledgeEntrySchema = z.object({
  specs: z.string().min(1),
  price: z.number().nullable(),
  currency: z.string().default('PLN'),
  source: z.string().optional(),
  date: z.string().optional(),
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
}

export interface ParsingStrategy {
  name: string;
  execute(data: any): Promise<ExtractionResult[]>;
}
