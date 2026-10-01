/** CI-only disposable fixture; never edits the repository seed or a live store. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import { encode } from 'next-auth/jwt';

const root = resolve('.ci/public-proof');
if (process.env.CI !== 'true' ||
    resolve(process.env.CELTRONICS_DB_PATH ?? '') !== resolve(root, 'db.json') ||
    resolve(process.env.CELTRONICS_UPLOAD_ROOT ?? '') !== resolve(root, 'uploads') ||
    !process.env.AUTH_SECRET) {
  throw new Error('Public proof requires its explicit CI-only disposable paths and secret');
}
const db = JSON.parse(await readFile('src/data/db.json', 'utf8'));
if (!Array.isArray(db.users) || !Array.isArray(db.products) || !Array.isArray(db.categories)) {
  throw new Error('Invalid repository seed for public proof');
}
await mkdir(resolve('.ci'), { recursive: true });
// Fail on a reused target: do not reset or overwrite any existing database.
await mkdir(root, { mode: 0o700 });
await mkdir(resolve(root, 'uploads'), { mode: 0o700 });
const password = randomBytes(24).toString('base64url');
const passwordHash = await bcrypt.hash(password, 10);
const accounts = {};
for (const name of ['biz', 'admin', 'pending', 'blocked']) {
  const user = {
    id: `ci-public-proof-${name}`,
    email: `${name}@public-proof.example.invalid`,
    username: `CI ${name}`,
    companyName: `CI — konto demonstracyjne ${name}`,
    roleType: name === 'admin' ? 'ADMIN' : 'BIZ',
    isApproved: name !== 'pending',
    isBlocked: name === 'blocked',
    discount: name === 'biz' ? 17 : 0,
    tierName: 'BASIC',
    nip: '1112223332',
    passwordHash,
  };
  if (db.users.some(existing => existing.id === user.id || existing.email === user.email)) {
    throw new Error('Public proof fixture identity already exists');
  }
  db.users.push(user);
  accounts[name] = { id: user.id, email: user.email, role: user.roleType };
  if (name === 'pending' || name === 'blocked') {
    // A stale, formerly approved session. Stored account state must still win.
    accounts[name].staleCookie = await encode({
      secret: process.env.AUTH_SECRET,
      salt: 'authjs.session-token',
      maxAge: 3600,
      token: { sub: user.id, id: user.id, email: user.email, name: user.companyName,
        role: 'BIZ', isApproved: true, discount: 99, tierName: 'BASIC' },
    });
  }
}
const product = {
  id: 'ci-public-proof-device', sku: 'CI-PUBLIC-PROOF-001',
  name: 'Urządzenie kontrolne CI — dane demonstracyjne', manufacturer: 'CI fixture',
  price: 100, stock: 7, categoryId: db.categories[0]?.id ?? null,
  specs: 'Wyłącznie syntetyczne dane testu przeglądarkowego. To nie jest oferta handlowa.',
};
if (db.products.some(existing => existing.id === product.id || existing.sku === product.sku)) {
  throw new Error('Public proof fixture product already exists');
}
db.products.push(product);
await writeFile(resolve(root, 'db.json'), JSON.stringify(db), { flag: 'wx', mode: 0o600 });
// Password and session cookies are outside artifacts and are never printed.
await writeFile(resolve(root, 'identities.json'), JSON.stringify({ password, accounts, product }),
  { flag: 'wx', mode: 0o600 });
console.log('Prepared isolated public browser fixture (four synthetic accounts, one product).');
