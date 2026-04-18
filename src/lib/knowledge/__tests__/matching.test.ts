import { describe, it, expect } from 'vitest';
import { findBestKnowledgeMatch, normalizeSymbol } from '../matcher';
import { KnowledgeStore } from '../types';

describe('Knowledge Matcher', () => {
  const mockStore: KnowledgeStore = {
    lastUpdated: '2024-01-01',
    sources: [],
    processedSources: [],
    knowledge: {
      'INTEGRA-64': { specs: 'Centrala Integra 64', price: null, currency: 'PLN' },
      'INT-SK': { specs: 'Klawiatura SK', price: null, currency: 'PLN' },
      'SLIM-PIR-LUNA': { specs: 'Czujka Slim PIR Luna z oświetleniem', price: null, currency: 'PLN' }
    }
  };

  it('powinien poprawnie normalizować symbole', () => {
    expect(normalizeSymbol('SLIM-PIR-LUNA')).toBe('SLIMPIRLUNA');
    expect(normalizeSymbol('slim pir luna')).toBe('SLIMPIRLUNA');
    expect(normalizeSymbol('  INT-SK-GR  ')).toBe('INTSKGR');
  });

  it('powinien dopasować produkt mimo różnicy w myślnikach/spacjach (Case 1)', () => {
    const result = findBestKnowledgeMatch('Centrala Satel Integra 64', 'SAT-64', mockStore);
    expect(result).not.toBeNull();
    expect(result?.key).toBe('INTEGRA-64');
  });

  it('powinien dopasować produkt po SKU', () => {
    const result = findBestKnowledgeMatch('Jakiś opis', 'INTEGRA 64', mockStore);
    expect(result).not.toBeNull();
    expect(result?.key).toBe('INTEGRA-64');
  });

  it('powinien dopasować najdłuższy pasujący symbol (Best Match)', () => {
    // Dodajemy krótszy klucz do sklepu
    const storeWithOverlap = {
      ...mockStore,
      knowledge: {
        ...mockStore.knowledge,
        'INT': { specs: 'Ogólne INT', price: null, currency: 'PLN' }
      }
    };
    const result = findBestKnowledgeMatch('Klawiatura strefowa INT-SK-GR', null, storeWithOverlap);
    expect(result?.key).toBe('INT-SK'); // INT-SK jest dłuższy niż INT
  });

  it('nie powinien dopasować zbyt krótkich symboli (< 3 znaki)', () => {
    const storeWithShort = {
      ...mockStore,
      knowledge: {
        ...mockStore.knowledge,
        'SK': { specs: 'Krótki', price: null, currency: 'PLN' }
      }
    };
    const result = findBestKnowledgeMatch('Klawiatura SK', null, storeWithShort);
    expect(result).toBeNull();
  });
});
