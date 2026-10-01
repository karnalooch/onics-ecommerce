# Production Deployment

This runbook describes the supported internet-facing deployment for the current
file-backed ONICS/CEL-TRONICS architecture.

It is intentionally a **single application instance / single writer** design.
Do not scale the `celtronics` service horizontally while persistence is stored
in the JSON file.

## 1. Topology

The supported edge path is:

```text
Internet -> Caddy :80/:443 -> celtronics:3001 (Docker network only)
```

`docker-compose.production.yml` does not publish the application port to the
host. Only Caddy receives public traffic.

The bundled Caddy profile is for a host reached **directly from the Internet**.
If a CDN, Cloudflare, cloud load balancer or another reverse proxy is placed in
front of Caddy, do not reuse the client-IP configuration unchanged. Configure
that upstream as a trusted proxy and re-verify the client identity contract
before enabling public traffic.

## 2. Host prerequisites

Required:

- Linux host with Docker Engine and Docker Compose v2;
- a public DNS A/AAAA record for the production hostname pointing to the host;
- inbound TCP 80 and TCP/UDP 443 allowed to Caddy;
- one durable host directory for application state;
- outbound HTTPS access for certificate issuance and optional payment providers.

Caddy obtains and renews HTTPS certificates automatically when the hostname is
publicly resolvable and ports 80/443 reach the host.

## 3. Production environment

Create the deployment environment from the committed template:

```bash
cp .env.production.example .env.production
chmod 600 .env.production
```

Set at minimum:

```bash
CELTRONICS_DOMAIN=shop.example.com
CELTRONICS_DATA_ROOT=/srv/celtronics
AUTH_SECRET=<independent-random-secret>
NEXTAUTH_SECRET=<different-independent-random-secret>
ADMIN_BOOTSTRAP_PASSWORD=<strong-initial-admin-password>
```

Generate independent session secrets, for example:

```bash
openssl rand -base64 48
openssl rand -base64 48
```

Do not commit `.env.production`.

`ADMIN_BOOTSTRAP_PASSWORD` is required only while an active ADMIN record is
unsealed. The production runtime refuses to generate or print a bootstrap
password. After the first successful bootstrap login has persisted a bcrypt
hash, the variable can be removed.

## 4. Durable storage

Create the host directory before starting the non-root application container:

```bash
sudo install -d -o 1000 -g 1000 -m 700 /srv/celtronics
```

Use a different path if required, but keep `CELTRONICS_DATA_ROOT` on storage
that survives container recreation and host maintenance.

The production profile maps that directory to `/app/var/celtronics` and keeps
the database, private uploads and backups underneath it.

## 5. Validate before starting

Render the Compose model without starting containers:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  config --quiet
```

Validate the edge configuration:

```bash
docker run --rm \
  --env-file .env.production \
  -v "$PWD/Caddyfile.production:/etc/caddy/Caddyfile:ro" \
  caddy:2.11.4-alpine \
  validate --config /etc/caddy/Caddyfile --adapter caddyfile
```

## 6. Start production

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  up -d --build
```

Inspect state:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  ps
```

Then verify through the public HTTPS origin:

```bash
curl --fail --show-error --silent https://$CELTRONICS_DOMAIN/api/health/live
curl --fail --show-error --silent https://$CELTRONICS_DOMAIN/api/health/ready
```

Do not accept normal traffic while readiness returns HTTP 503.

## 7. Proxy/client identity contract

Application rate limiting reads client identity from:

1. `CF-Connecting-IP`,
2. `X-Real-IP`,
3. the first `X-Forwarded-For` address.

For the direct-to-Caddy topology, the committed Caddyfile:

- removes any client-supplied `CF-Connecting-IP`;
- overwrites `X-Real-IP` with the immediate remote client address;
- relies on Caddy's built-in anti-spoof handling for `X-Forwarded-For`.

Do not expose the application container directly and do not add another proxy
layer without re-validating these assumptions.

## 8. SMTP and payments

SMTP quote notification is optional. Leave `SMTP_HOST`, `SMTP_USER`,
`SMTP_PASS` and `ADMIN_EMAIL` all empty to disable it. Partial SMTP
configuration makes application readiness fail.

Payment providers remain disabled until configured and explicitly enabled in the
ADMIN control plane. Before enabling production payments, follow
`PAYMENTS_PRODUCTION_RUNBOOK.md`, including provider-side webhook setup,
backup, readiness and a controlled payment/refund smoke.

## 9. Backup before deploys

Before a risky deployment or maintenance operation:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  exec -T celtronics npm run db:verify

docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  exec -T celtronics npm run db:backup
```

Backups created inside `/app/var/celtronics/backups` live on the durable host
directory. Maintain an additional off-host backup policy appropriate for the
production environment.

## 10. Deploy an update

```bash
git pull --ff-only

docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  build --pull

docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  up -d
```

Re-run both health endpoints after every update.

## 11. Stop without deleting state

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  down
```

Do **not** add `--volumes` as a routine production operation. Caddy certificate
state uses named volumes, and application state lives in the durable host bind
mount.

## 12. Current boundary

This profile solves the current single-host edge/runtime gap. It does not turn
the JSON store into a multi-writer database, does not configure an external CDN
and does not activate payment providers. Those remain separate production
decisions with their own acceptance criteria.
