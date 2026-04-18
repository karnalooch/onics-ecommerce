// src/lib/knowledge/aiPricing.ts

export interface AIModelPrice {
  id: string;
  name: string;
  inputPrice: number;  // per 1M tokens (USD)
  outputPrice: number; // per 1M tokens (USD)
  tier: 'Flash-Lite' | 'Flash' | 'Pro' | 'Ultra';
}

/**
 * Gemini Pricing Database (April 2026 data)
 * Prices are per 1,000,000 tokens.
 */
export const GEMINI_PRICING: Record<string, AIModelPrice> = {
  'gemini-3.1-flash-lite': {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash-Lite (Preview)',
    inputPrice: 0.10,
    outputPrice: 0.40,
    tier: 'Flash-Lite'
  },
  'gemini-3.0-flash-lite': {
    id: 'gemini-3.0-flash-lite',
    name: 'Gemini 3.0 Flash-Lite',
    inputPrice: 0.15,
    outputPrice: 0.60,
    tier: 'Flash-Lite'
  },
  'gemini-3.1-flash': {
    id: 'gemini-3.1-flash',
    name: 'Gemini 3.1 Flash (Preview)',
    inputPrice: 0.35,
    outputPrice: 1.05,
    tier: 'Flash'
  },
  'gemini-3.0-flash': {
    id: 'gemini-3.0-flash',
    name: 'Gemini 3.0 Flash',
    inputPrice: 0.50,
    outputPrice: 1.50,
    tier: 'Flash'
  },
  'gemini-2.5-flash-lite': {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    inputPrice: 0.25,
    outputPrice: 1.50,
    tier: 'Flash-Lite'
  },
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    inputPrice: 0.30,
    outputPrice: 2.50,
    tier: 'Flash'
  },
  'gemini-3.1-pro': {
    id: 'gemini-3.1-pro',
    name: 'Gemini 3.1 Pro (Preview)',
    inputPrice: 2.00,
    outputPrice: 12.00,
    tier: 'Pro'
  },
  'gemini-2.5-pro': {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    inputPrice: 1.25,
    outputPrice: 10.00,
    tier: 'Pro'
  },
  'gemini-1.5-pro': {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    inputPrice: 3.50,
    outputPrice: 10.50,
    tier: 'Pro'
  },
  'gemini-1.5-flash': {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    inputPrice: 0.35,
    outputPrice: 1.05,
    tier: 'Flash'
  }
};

/**
 * Returns the price data for a given model ID or a default affordable one.
 */
export function getModelPrice(modelId: string): AIModelPrice {
  return GEMINI_PRICING[modelId] || {
    id: modelId,
    name: modelId,
    inputPrice: 0.50,
    outputPrice: 1.50,
    tier: 'Flash'
  };
}

/**
 * Finds the best recommendation based on version, capability, and price.
 * For PDFs, we prefer standard Flash/Pro over Flash-Lite for better OCR/layout reasoning.
 */
export function findBestRecommendation(availableModelIds: string[], isPDF: boolean): string {
  if (availableModelIds.length === 0) return 'gemini-3.1-flash-lite';

  const scoredModels = availableModelIds.map(id => {
    const p = GEMINI_PRICING[id] || { id, tier: 'Flash', inputPrice: 0.5 };
    let score = 0;

    // 1. PRICE PRIORITY (Primary Factor)
    // We use a large multiplier for price to make it the dominant factor.
    // Lower price = Much higher score.
    score += (10 - p.inputPrice) * 100;

    // 2. QUALITY & VERSION (Secondary Factor / Tie-breaker)
    if (id.includes('3.1')) score += 30;
    else if (id.includes('3.0')) score += 20;
    else if (id.includes('2.5')) score += 10;

    // 3. PDF/VISION OPTIMIZATION (Contextual Factor)
    if (isPDF) {
      if (p.tier === 'Flash') score += 15;
      if (p.tier === 'Pro') score += 10;
      // Lite is still good, but Flash is worth a small bonus if the price difference is small.
    }

    return { id, score };
  });

  scoredModels.sort((a, b) => b.score - a.score);
  return scoredModels[0]?.id || availableModelIds[0];
}

/**
 * Sorts available models so the recommended ones are at the top.
 */
export function sortModelsByRecommendation(models: any[], recommendedId: string): any[] {
  return [...models].sort((a, b) => {
    if (a.id === recommendedId) return -1;
    if (b.id === recommendedId) return 1;
    return 0;
  });
}
