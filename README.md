# CEL-TRONICS e-commerce

Next.js application for the CEL-TRONICS public site, B2B ordering, administration, pricing, knowledge ingestion and optional Stripe checkout.

## Local development

Requirements:

- Node.js 24
- npm
- writable local filesystem

Setup:

```bash
cp .env.example .env.local
npm ci
npm run dev
```

The development server runs on http://localhost:3001.

When `CELTRONICS_DB_PATH` and `CELTRONICS_UPLOAD_ROOT` are omitted in development, the app uses repository-local fallback paths. Knowledge uploads are stored under `.local/celtronics/uploads`, outside `public/`, so uploaded supplier files are not exposed as static assets.

## Validation

The pull-request gates run:

```bash
npm ci
npm test -- --run
npm run build
npm audit --audit-level=high
```

The platform gate also runs blocking ESLint checks over the security-, commerce-, payment- and knowledge-critical server code.

## Production storage contract

The current persistence layer is file-backed. Production therefore **must** provide explicit durable, writable paths:

```bash
CELTRONICS_DB_PATH=/persistent/celtronics/db.json
CELTRONICS_UPLOAD_ROOT=/persistent/celtronics/uploads
```

If either path is missing while `NODE_ENV=production`, the application fails closed instead of silently writing to repository-local files.

The configured locations must survive application restarts and deployments. Do not treat an ephemeral/serverless function filesystem as durable storage. `CELTRONICS_UPLOAD_ROOT` must also remain outside the application's `public/` directory; startup fails closed when it points at a public static-assets path.

### File-store lock tuning

The single-instance file store serializes mutations with a lock file. Defaults are tuned for short critical sections:

```bash
CELTRONICS_DB_LOCK_RETRY_MS=25
CELTRONICS_DB_LOCK_TIMEOUT_MS=15000
CELTRONICS_DB_LOCK_STALE_MS=10000
CELTRONICS_DB_LOCK_HEARTBEAT_MS=2000
CELTRONICS_DB_LOCK_WARN_WAIT_MS=500
CELTRONICS_DB_SLOW_TX_MS=1000
```

Invalid timing values fail closed. The heartbeat interval must remain lower than the stale-lock threshold. The server emits warnings when lock acquisition or a transaction exceeds the configured warning threshold.

### Backup and recovery

The file-backed store includes explicit maintenance commands:

```bash
npm run db:verify
npm run db:backup
npm run db:restore -- --from /persistent/celtronics/backups/db-YYYY-MM-DDTHH-MM-SS-sssZ.json --confirm
```

`db:backup` validates the current JSON before copying it and writes backups with restrictive file permissions. By default backups go to a `backups/` directory next to `CELTRONICS_DB_PATH`; set `CELTRONICS_DB_BACKUP_DIR` to use another durable location.

Before restore, stop application writers. `db:restore` refuses to run while the database lock file exists, validates the selected backup, preserves the current database as a `pre-restore-*.json` safety copy when present, replaces the live database atomically, and verifies the restored checksum.

The Platform Audit CI runs a recovery drill that backs up the development seed, corrupts a disposable live copy, verifies detection, proves restore is blocked by an active lock, restores the backup, and compares the recovered file byte-for-byte with the original.

### Important limitation

The file-backed store is an interim persistence layer. It is suitable only for a deployment model that provides a durable writable volume and controlled application concurrency. A future database migration should replace it before horizontal scaling or multi-instance writes.

## Authentication

Required secrets include:

```bash
AUTH_SECRET=...
NEXTAUTH_SECRET=...
ADMIN_BOOTSTRAP_PASSWORD=...
```

Do not commit real secrets. `.env.example` contains placeholders only.

## Stripe

Online Stripe checkout additionally requires:

```bash
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_APP_URL=https://your-production-host.example
```

Checkout sessions are linked to local order IDs. Signed webhook events update the local payment truth and reject mismatched order IDs, sessions, currencies or amounts.

## Storage files

The repository contains development seed data under `src/data/db.json`. It is not a production persistence target.

Knowledge/catalog uploads are limited and validated by the server. Production uploads must use `CELTRONICS_UPLOAD_ROOT` on durable storage.

Historical catalog corpora used by parser development live under `fixtures/catalogs/`, outside the Next.js `public/` tree. They are repository fixtures, not runtime uploads. Local harvesting writes transient downloads under `.local/celtronics/harvest/`, which is ignored by Git. Platform Audit CI rejects tracked files under `public/uploads/catalogs/` so supplier files cannot silently become deployable static assets again.
