import { KnowledgeStore, KnowledgeEntry } from './types';

/**
 * Normalizuje symbol produktu do porównań (UPPERCASE, usuwa spacje i myślniki)
 */
export function normalizeSymbol(symbol: string): string {
  if (!symbol) return '';
  return symbol.toUpperCase().trim().replace(/[\s-]/g, '');
}

/**
 * Szuka najlepszego dopasowania w bazie wiedzy dla danego produktu.
 * Implementuje logikę priorytetyzacji i normalizacji.
 */
export function findBestKnowledgeMatch(
  productName: string,
  productSku: string | null | undefined,
  store: KnowledgeStore
): { key: string; entry: KnowledgeEntry } | null {
  const nameNorm = normalizeSymbol(productName);
  const skuNorm = normalizeSymbol(productSku || '');
  
  let bestMatchKey = "";
  let bestMatchScore = 0; // Używamy długości klucza jako punktacji (longest match)

  const keys = Object.keys(store.knowledge);

  for (const key of keys) {
    const keyNorm = normalizeSymbol(key);
    if (keyNorm.length < 3) continue;

    // Sprawdzamy dopasowanie znormalizowane
    const isNameMatch = nameNorm.includes(keyNorm);
    const isSkuMatch = skuNorm.includes(keyNorm);

    if (isNameMatch || isSkuMatch) {
      if (keyNorm.length > bestMatchScore) {
        bestMatchKey = key;
        bestMatchScore = keyNorm.length;
      }
    }
  }

  if (bestMatchKey) {
    return {
      key: bestMatchKey,
      entry: store.knowledge[bestMatchKey]
    };
  }

  return null;
}
