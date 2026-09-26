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
npm run test:payments
npm test -- --run
npm run build
npm audit --audit-level=high
```

The platform gate also runs blocking ESLint checks over the security-, commerce-, payment- and knowledge-critical server code. The named `Payment production acceptance` step exercises the critical payment lifecycle/recovery invariants before the general suite. After the production build the platform gate starts the built application, smoke-tests both health endpoints over HTTP, and verifies the production security headers.

For production payment configuration, incident handling, reconciliation, emergency shutdown, backup/restore and go-live sign-off, see [PAYMENTS_PRODUCTION_RUNBOOK.md](./PAYMENTS_PRODUCTION_RUNBOOK.md).

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

## Health and readiness

The application exposes two uncached operational endpoints:

- `GET /api/health/live` — process liveness only; returns HTTP 200 while the Next.js server can answer requests.
- `GET /api/health/ready` — production readiness; returns HTTP 200 only when required session secrets and lock settings are valid, the JSON database is readable/writable and valid, the private upload root exists and is readable/writable, any unsealed active admin still has a bootstrap secret available, and every payment provider that is effectively enabled by the persisted global/per-provider control plane has complete local runtime configuration. Disabled providers do not affect readiness. The health endpoint never contacts an external payment provider; network credential probes remain an explicit activation-time operation. Otherwise readiness returns HTTP 503.

The readiness payload reports only coarse check states (`ok` / `error`) and does not expose filesystem paths, secrets or raw exception messages.

## Authentication throttling

Public credential work is protected by an in-process fixed-window limiter before expensive bcrypt verification:

- registration: 5 attempts per client / 15 minutes and 3 attempts per normalized e-mail / hour; blocked registration returns HTTP 429 with `Retry-After`
- credentials login: 30 attempts per client / 15 minutes and 20 attempts per existing account / 15 minutes; blocked login remains indistinguishable from invalid credentials

Client identity is taken from `CF-Connecting-IP`, then `X-Real-IP`, then the first `X-Forwarded-For` value. The production reverse proxy **must strip and overwrite** these incoming headers so clients cannot spoof them. If none is available, the limiter intentionally falls back to one shared `unknown` bucket.

The limiter is bounded in memory and is appropriate for the current single-instance file-backed deployment. It is not a replacement for edge/shared rate limiting when the application moves to multiple processes or instances.

## HTTP security hardening

Production responses apply `nosniff`, deny framing, use a strict-origin referrer policy, disable camera/microphone/geolocation permissions by default, and send one-year HSTS. The default Next.js `X-Powered-By` header is disabled.

Image optimization does not allow remote image sources, does not allow local IP access, does not follow redirects, limits upstream image bodies to 5 MB, and keeps the Next.js 16 quality allowlist explicit at `[75]`. Add future remote image hosts only as narrow HTTPS `remotePatterns` with explicit port/path/query constraints.

Public payment webhook ingress is bounded to 256 KiB per request. The application rejects oversized declared `Content-Length` values before consuming the body and also enforces the same limit while streaming the actual body, so chunked requests or understated lengths cannot bypass the cap. Stripe signature verification still receives the exact raw body bytes decoded as UTF-8 text, while Przelewy24 JSON is parsed only after the bounded read completes.

Successfully handled payment/refund webhook events are also recorded in a durable, bounded replay ledger. The ledger stores only a SHA-256 event fingerprint, provider, event kind and timestamp; it does not persist raw webhook payloads, Stripe event IDs, Przelewy24 signatures or provider secrets. Replay detection and the corresponding financial state transition happen under the same file-store lock, preventing concurrent or non-consecutive retries from applying stock/payment mutations twice. The ledger retains the newest 500 events; older events continue to rely on the terminal/idempotent order and inventory state machines.

## Authentication

Required session secrets include:

```bash
AUTH_SECRET=...
NEXTAUTH_SECRET=...
```

`ADMIN_BOOTSTRAP_PASSWORD` is a controlled one-time bootstrap secret. It is required only while an active ADMIN record has no `passwordHash`. On the first successful bootstrap login, the application bcrypt-hashes the supplied password outside the database lock and atomically persists the hash. Subsequent logins use only the stored hash, so the bootstrap environment variable can then be removed. If sealing cannot be persisted safely, authentication fails closed.

Do not commit real secrets. `.env.example` contains placeholders only.

## Stripe

Online Stripe checkout additionally requires:

```bash
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_APP_URL=https://your-production-host.example
```

Stripe is optional, but production payment configuration is fail-closed: enabling it requires `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and an explicit HTTPS `NEXT_PUBLIC_APP_URL` containing only the application origin. Production checkout never derives success/cancel URLs from the incoming request host. Checkout sessions are linked to local order IDs. Signed webhook events update the local payment truth and reject mismatched order IDs, sessions, currencies or amounts.

## Przelewy24

Przelewy24 is an optional payment provider and is disabled by default. Production configuration requires:

```bash
P24_MERCHANT_ID=...
P24_POS_ID=...
P24_API_KEY=...
P24_CRC=...
NEXT_PUBLIC_APP_URL=https://your-production-host.example
```

The admin control plane fails closed before enabling Przelewy24. After validating local configuration it calls the provider's authenticated `GET /api/v1/testAccess` endpoint **before** acquiring the file-store write lock or persisting the enabled state. Invalid credentials, provider rejection, malformed responses, network failures and provider outages leave the provider disabled. The response exposed to the admin contains only a safe failure category; credentials and raw provider payloads are never returned.

Payment capture is notification-driven: a customer redirect never marks an order paid. A signed status notification is validated locally, then `transaction/verify` must succeed before the local order becomes `PAID` and its inventory reservation is finalized. Refunds use durable request identities and signed asynchronous refund notifications. Provider-aware reconciliation can recover missed payment notifications and safely retry unresolved refund requests without inventing meanings for undocumented refund status codes.

## Storage files

The repository contains development seed data under `src/data/db.json`. It is not a production persistence target.

Knowledge/catalog uploads are limited and validated by the server. Production uploads must use `CELTRONICS_UPLOAD_ROOT` on durable storage.

Supplier/catalog corpora used for manual parser research are intentionally **not stored in Git**. Put local copies under `.local/celtronics/catalog-fixtures/` or set `CELTRONICS_FIXTURE_ROOT` to another private directory. Manual parser scripts read from that location. Local harvesting writes transient downloads under `.local/celtronics/harvest/`, which is ignored by Git. Platform Audit CI rejects supplier catalog binaries under both `public/uploads/catalogs/` and `fixtures/catalogs/`.
