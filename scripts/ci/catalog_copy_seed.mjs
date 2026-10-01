/** Offline development-seed maintenance. Never accepts a production database path. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { normalizeCatalogProductCopy, cleanCatalogDescription } from '../../src/lib/catalogCopy.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const seed = path.join(root, 'src/data/db.json');
const args = new Set(process.argv.slice(2));
for (const arg of args) if (!['--apply', '--check', '--seed-only'].includes(arg)) throw new Error(`Unknown argument: ${arg}`);
if (args.has('--apply') && (!args.has('--seed-only') || args.has('--check'))) throw new Error('Apply requires --seed-only and cannot combine with --check');
if (args.has('--apply') && (process.env.NODE_ENV === 'production' || process.env.CELTRONICS_DB_PATH)) throw new Error('Refusing apply in a configured runtime environment');
if (!fs.lstatSync(seed).isFile() || fs.lstatSync(seed).isSymbolicLink()) throw new Error('Seed must be a regular file');
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const original = fs.readFileSync(seed);
const data = JSON.parse(original.toString('utf8'));
assert.ok(Array.isArray(data.products), 'Missing product list');
const changes = [];
const review = [];
const withoutCopy = ({name, specs, ...rest}) => rest;
const next = { ...data, products: data.products.map((product) => {
  const normalized = normalizeCatalogProductCopy(product);
  assert.deepEqual(withoutCopy(normalized), withoutCopy(product), 'Non-copy field changed');
  assert.deepEqual(normalizeCatalogProductCopy(normalized), normalized, 'Copy cleanup is not idempotent');
  if (product.name !== normalized.name || product.specs !== normalized.specs) changes.push({ id: product.id, sku: product.sku, before: {name: product.name, specs: product.specs}, after: {name: normalized.name, specs: normalized.specs} });
  if (!cleanCatalogDescription(normalized.specs)) review.push({ id: product.id, sku: product.sku, name: normalized.name, reason: product.price === 0 && product.stock === 0 ? 'missing-description-possible-source-heading' : 'missing-description' });
  else if (/\|\s*PLN\b/u.test(normalized.specs)) review.push({ id: product.id, sku: product.sku, name: normalized.name, reason: 'unrecognized-import-tail-preserved' });
  return normalized;
}) };
assert.equal(next.products.length, data.products.length, 'Product count changed');
const { products: originalProducts, ...originalOther } = data;
const { products: nextProducts, ...nextOther } = next;
assert.deepEqual(nextOther, originalOther, 'Non-catalog data changed');
const output = changes.length ? Buffer.from(JSON.stringify(next, null, 2) + '\n') : original;
const report = {
  schema_version: 1,
  source: 'repository development seed only; existing catalog text, no external enrichment',
  source_sha256: hash(original), target_sha256: hash(output),
  product_count: data.products.length,
  changed_products: changes.length,
  changed_names: changes.filter(c => c.before.name !== c.after.name).length,
  changed_descriptions: changes.filter(c => c.before.specs !== c.after.specs).length,
  records_deleted: 0, non_copy_fields_changed: 0,
  review_count: review.length, review, changes,
};
const reportDir = path.join(root, 'artifacts/catalog-copy');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, args.has('--check') ? 'check.json' : 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, changes: undefined, review: undefined }, null, 2));
if (args.has('--apply') && changes.length) {
  // A hash-verified backup is kept outside Git and outside the report artifact.
  const backupDir = path.join(root, '.local/celtronics/catalog-copy-backups');
  fs.mkdirSync(backupDir, {recursive: true, mode: 0o700});
  const backup = path.join(backupDir, `${hash(original)}.json`);
  if (!fs.existsSync(backup)) fs.writeFileSync(backup, original, {flag: 'wx', mode: 0o600});
  assert.equal(hash(fs.readFileSync(backup)), hash(original), 'Backup verification failed');
  const temporary = seed + `.catalog-copy-${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, output, {flag: 'wx', mode: 0o600});
    assert.equal(hash(fs.readFileSync(seed)), hash(original), 'Seed changed during planning');
    fs.renameSync(temporary, seed);
    assert.equal(hash(fs.readFileSync(seed)), hash(output), 'Written seed verification failed');
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
if (args.has('--check') && changes.length) process.exitCode = 1;
