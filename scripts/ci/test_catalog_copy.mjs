import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanCatalogText, cleanCatalogDescription, normalizeCatalogProductCopy } from '../../src/lib/catalogCopy.ts';

const raw = 'Płyta główna centrali alarmowej od 16 do128 wejść i wyjść | PLN | 0 | 0 | 0 | 0 | 5905033330375';
const product = { id: 'p', sku: 'INTEGRA-128-PLUS', name: 'INTEGRA-128-PLUS', specs: raw, price: 947, stock: 0, manufacturer: 'Nieznany', categoryId: 'cat', revision: 7, lastUpdated: '2026-04-20' };

test('removes only known empty import cells and labels the unchanged barcode', () => {
 assert.equal(cleanCatalogDescription(raw), 'Płyta główna centrali alarmowej od 16 do 128 wejść i wyjść. EAN: 5905033330375');
});
test('generates a useful title from the actual source, without guessing brand', () => {
 assert.equal(normalizeCatalogProductCopy(product).name, 'INTEGRA-128-PLUS — płyta główna centrali alarmowej od 16 do 128 wejść i wyjść');
});
test('preserves all fields except name/specs and does not mutate input', () => {
 const before = structuredClone(product); const after = normalizeCatalogProductCopy(product);
 const other = ({ name, specs, ...rest }) => rest;
 assert.deepEqual(other(before), other(after)); assert.deepEqual(product, before);
});
test('is idempotent, including barcode and title', () => {
 const once = normalizeCatalogProductCopy(product); assert.deepEqual(normalizeCatalogProductCopy(once), once);
});
test('keeps technical zero values and nonzero/unrecognized currency tails', () => {
 for (const text of ['Temperatura: 0 °C | Napięcie: 12 V', 'Opis | PLN | 0 | 0 | 2 | 0 | 5905033330375', 'Opis | PLN | 0 | 0 | 0 | 0 | uwaga']) assert.equal(cleanCatalogDescription(text), text);
});
test('placeholder is absence of knowledge, not a fabricated product description', () => {
 for (const text of ['Parametry standardowe', 'Brak opisu', '  ', 'N/A']) assert.equal(cleanCatalogDescription(text), '');
 const header = { sku: 'INTEGRA-–-PŁYTY-GŁÓWNE', name: 'INTEGRA-–-PŁYTY-GŁÓWNE', specs: 'Parametry standardowe' };
 assert.deepEqual(normalizeCatalogProductCopy(header), { ...header, specs: '' });
});
test('decodes plain text entities and preserves diameter/decimal values', () => {
 assert.equal(cleanCatalogDescription('biała,&nbsp;średnica obudowy Ø 12,7 mm,  opakowanie 10 szt.'), 'biała, średnica obudowy Ø 12,7 mm, opakowanie 10 szt.');
 assert.equal(cleanCatalogText('4,3&quot; &#216; &#xD8;'), '4,3" Ø Ø');
});
test('never converts model hyphens, suffixes or pack identifiers', () => {
 const source = { sku: 'B-2FL-BR-(10-SZTUK)', name: 'B-2FL-BR-(10-SZTUK)', specs: 'Czujka magnetyczna wpuszczana (brązowa, opakowanie 10 szt.)' };
 const after = normalizeCatalogProductCopy(source); assert.equal(after.sku, source.sku); assert.equal(after.name, 'B-2FL-BR-(10-SZTUK) — czujka magnetyczna wpuszczana'); assert.equal(after.specs, source.specs);
});
test('keeps an existing editorial title and uses fallback descriptions only for missing titles', () => {
 assert.equal(normalizeCatalogProductCopy({ ...product, name: 'Centrala do dużych instalacji' }).name, 'Centrala do dużych instalacji');
 assert.equal(normalizeCatalogProductCopy({ sku: 'AX-1', name: 'AX-1', specs: 'Parametry standardowe', catalogSpecs: 'Moduł wejść' }).name, 'AX-1 — moduł wejść');
});
test('preserves the exact source specs with compatibility, variants and certification qualifiers', () => {
 const text = 'Manipulator z ekranem dotykowym 4,3" (czarny, współpraca z centralami PERFECTA 64 M; GRADE 3)';
 assert.equal(cleanCatalogDescription(text + ' | PLN | 0 | 0 | 0 | 0'), text);
});
test('does not repeat the exact battery model in its title', () => {
 assert.equal(normalizeCatalogProductCopy({sku:'CR14250',name:'CR14250',specs:'Bateria litowa CR14250 3 V do urządzeń bezprzewodowych (APB-200)'}).name,'CR14250 — bateria litowa 3 V do urządzeń bezprzewodowych');
});
test('normalizes capacity units without rewriting similar model identifiers', () => {
 assert.equal(cleanCatalogDescription('akumulator 7Ah; model BAT-7Ah; 12,5Ah'), 'akumulator 7 Ah; model BAT-7Ah; 12,5 Ah');
});
test('retains barcode leading zeroes and unsafe numeric entities verbatim', () => {
 assert.equal(cleanCatalogDescription('Moduł | PLN | 0 | 0 | 0 | 0 | 0012345678905'), 'Moduł. EAN: 0012345678905');
 assert.equal(cleanCatalogText('&#0; &#xD800; &#1114112;'), '&#0; &#xD800; &#1114112;');
});
