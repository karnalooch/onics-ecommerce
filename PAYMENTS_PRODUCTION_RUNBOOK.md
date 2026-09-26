# Payment Production Runbook

This runbook is the operational contract for the payment stack currently implemented in ONICS Ecommerce.

It covers the existing providers only:

- Stripe
- manual bank transfer
- Przelewy24

It does **not** authorize adding another provider, changing financial state manually in the JSON database, or running multiple application writers against the same file-backed store.

## 1. Supported deployment model

The current production persistence model is:

- one application writer / controlled single-instance concurrency,
- a durable writable volume for the JSON database,
- a durable private upload volume,
- file locking for every database mutation.

Required production storage:

```bash
CELTRONICS_DB_PATH=/persistent/celtronics/db.json
CELTRONICS_UPLOAD_ROOT=/persistent/celtronics/uploads
```

Optional backup destination:

```bash
CELTRONICS_DB_BACKUP_DIR=/persistent/celtronics/backups
```

Do not horizontally scale the application while it uses the file-backed database. A database migration is required before multi-instance writes.

## 2. Financial truth model

The customer redirect after an online payment is never authoritative.

### Stripe

Financial truth comes from signed Stripe webhook events and provider reconciliation.

Relevant webhook:

`POST /api/webhooks/stripe`

Checkout sessions are bound to the local order. Amount, currency, order identity and session identity are validated before local payment state is changed.

### Przelewy24

Financial truth comes from a signed P24 notification followed by a successful provider-side `transaction/verify`.

Relevant webhooks:

- `POST /api/webhooks/przelewy24`
- `POST /api/webhooks/przelewy24/refund`

The flow is:

`notification -> local signature/order validation -> durable verification intent -> transaction/verify -> atomic local settlement`

A browser return to `urlReturn` never marks an order paid.

### Bank transfer

Bank transfer is a manual-settlement provider. Payment and refund confirmation require an authenticated admin action. Shipment/return stock transitions still follow the same inventory invariants as online providers.

## 3. Provider configuration

### Stripe

Production requires:

```bash
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_APP_URL=https://shop.example.com
```

`NEXT_PUBLIC_APP_URL` must be a clean HTTPS origin.

The external Stripe webhook configuration must point to:

`https://<production-origin>/api/webhooks/stripe`

Do not remove the webhook secret merely because new Stripe checkout has been disabled. Existing orders may still need webhook/refund processing.

### Bank transfer

Requires:

```bash
BANK_TRANSFER_RECIPIENT=...
BANK_TRANSFER_ACCOUNT_NUMBER=...
```

The account number must normalize to a valid 26-digit Polish account number.

### Przelewy24

Production requires:

```bash
P24_MERCHANT_ID=...
P24_POS_ID=...
P24_API_KEY=...
P24_CRC=...
NEXT_PUBLIC_APP_URL=https://shop.example.com
```

P24 is disabled by default. A real `OFF -> ON` transition performs authenticated `GET /api/v1/testAccess` before the enabled state is persisted.

Failed credentials, provider rejection, malformed responses, network errors and provider 5xx responses leave P24 disabled.

The network probe is deliberately an activation-time check. `/api/health/ready` does not call external payment providers.

## 4. Control plane

The admin payment control plane has:

- a global ON/OFF switch,
- per-provider ON/OFF,
- maintenance messages,
- provider ordering/display settings,
- provider readiness/configuration diagnostics,
- reconciliation controls,
- operations counters/history.

Disabling new payments must not disable processing for already-created orders. Webhooks, refunds, RMA and reconciliation remain part of existing-order recovery.

### Emergency shutdown

Authenticated ADMIN endpoint:

`POST /api/payment-methods/emergency-shutdown`

Required confirmation body:

```json
{
  "confirm": "EMERGENCY_SHUTDOWN",
  "maintenanceMessage": "Płatności są tymczasowo niedostępne."
}
```

The operation first disables new payments globally and writes an audit entry.

It then attempts to expire eligible open **Stripe** Checkout Sessions and releases their local reservations only after safe provider/local checks.

Important limitation:

- emergency shutdown blocks **new** payments for all providers,
- it automatically expires eligible open sessions only for Stripe,
- Przelewy24 intentionally has no generic cancel capability in the current contract,
- already-started P24 transactions must continue to be handled by webhook/reconciliation,
- paid, refunded, shipped, returned or otherwise finalized orders are not blindly cancelled.

A response with HTTP 207 means the global kill switch succeeded but one or more Stripe sessions require follow-up.

## 5. Health and readiness

Operational endpoints:

- `GET /api/health/live` — process liveness,
- `GET /api/health/ready` — production readiness.

Readiness validates:

- required production secrets and lock settings,
- readable/writable valid JSON database,
- private upload storage,
- admin bootstrap state,
- local runtime configuration for every effectively enabled payment provider.

If global payments are OFF, provider configuration does not make the whole application unready.

If global payments are ON, every individually enabled provider must be locally configured.

Readiness returns only coarse `ok/error` checks. It does not expose paths, credentials or provider payloads.

## 6. Webhook ingress and replay protection

All public payment webhooks have a 256 KiB request-body limit.

Protection is applied as:

`Content-Length precheck -> bounded streaming read -> parse/signature verification -> financial handler`

The streamed byte count is authoritative, so missing, chunked or understated `Content-Length` cannot bypass the limit.

Successfully processed payment/refund webhooks are recorded in a durable replay ledger.

The ledger stores only:

- SHA-256 event fingerprint,
- provider,
- event kind,
- timestamp.

It does not store raw payloads, Stripe event IDs, P24 signatures or provider credentials.

Replay detection and the financial mutation are protected by the same file-store write lock. The newest 500 events are retained. Older-event safety falls back to terminal/idempotent order and inventory state machines.

## 7. Inventory invariants

The payment layer must preserve these invariants:

1. Checkout/order creation reserves inventory atomically.
2. Successful payment finalizes an existing reservation; it does not decrement stock twice.
3. Failed/expired unpaid checkout releases its reservation at most once.
4. A late Stripe payment after a released reservation must re-reserve stock before becoming locally final.
5. If that stock is no longer available, the late payment path fails closed with manual intervention required.
6. A successful refund/restock is exactly-once.
7. A shipped order is never treated as physically returned merely because a refund succeeded.
8. RMA stock is restored only after the return flow allows it.
9. Once refund stock has been restored, late payment events cannot reserve/decrement it again.

Never correct an inventory/payment mismatch by editing `db.json` manually.

## 8. Reconciliation

Generic authenticated ADMIN endpoint:

`POST /api/payment-methods/reconcile`

Provider-wide reconciliation:

```json
{
  "provider": "STRIPE"
}
```

or:

```json
{
  "provider": "PRZELEWY24"
}
```

Single-order reconciliation adds:

```json
{
  "provider": "STRIPE",
  "orderId": "ORD-..."
}
```

Use targeted reconciliation first during an incident. Bulk reconciliation is bounded and reports truncation when more candidates remain.

### Stripe reconciliation

Reconciliation can recover:

- missed paid checkout state,
- expired checkout state,
- non-terminal refund state.

A completed-but-not-yet-paid/final checkout is surfaced conservatively for manual review instead of guessing provider truth.

### Przelewy24 reconciliation

Reconciliation can recover:

- a durable staged notification after a crash,
- a missed payment notification using transaction lookup plus mandatory verify,
- a pending refund whose request result was ambiguous.

For a pending P24 refund:

- if provider lookup finds no refund, the same durable request identity can be reissued,
- if provider lookup finds refund data whose numeric status semantics are not safely documented by the application, the order is surfaced for manual review,
- the signed refund callback remains the automatic path to final `REFUNDED/RETURNED`.

Do not invent a meaning for an unknown provider status code.

## 9. Crash and race recovery

### P24 verify succeeds remotely, process crashes before local PAID

The notification is staged in `p24VerificationPending` before the external verify call.

Action:

1. keep the order unchanged manually,
2. run targeted P24 reconciliation,
3. allow reconciliation to replay verification from the durable staged notification,
4. verify the resulting order/inventory state.

### Webhook and reconciliation arrive concurrently

Both paths re-read fresh state under the file-store lock before mutating local state.

Expected result is an idempotent terminal state, not a second stock transition.

### Duplicate/non-consecutive webhook replay

The replay ledger blocks retained `A -> B -> A` duplicates. Terminal state-machine checks remain the backstop after ledger retention ages an event out.

### Late paid Stripe event after reservation release

If inventory can be re-reserved, payment may safely finalize.

If inventory cannot be re-reserved, the mutation fails closed. Do not force the order to PAID and do not make stock negative. Resolve inventory/customer/provider truth explicitly.

## 10. Refund and RMA operations

### Stripe

A succeeded refund is terminal for financial state.

For shipped goods:

- an external refund may update financial truth without inventing a physical return,
- stock returns only through a valid received-return/RMA state.

### Bank transfer

Before shipment, manual refund confirmation can cancel the order and release the active reservation.

After shipment, use the RMA lifecycle:

`SHIPPED + PAID -> REQUESTED -> RECEIVED -> refund confirmation -> RETURNED + REFUNDED`

The final stock restoration is exactly-once.

### Przelewy24

RMA lifecycle:

`SHIPPED + PAID -> REQUESTED -> RECEIVED -> REFUND_PENDING -> signed refund callback -> RETURNED + REFUNDED + COMPLETED`

Refund attempts use durable request identities. An explicitly rejected refund becomes retryable with a fresh identity. An ambiguous request keeps its existing identity for safe retry/reconciliation.

## 11. Backup and restore

Before risky maintenance:

```bash
npm run db:verify
npm run db:backup
```

Restore:

```bash
npm run db:restore -- --from /persistent/celtronics/backups/db-YYYY-MM-DDTHH-MM-SS-sssZ.json --confirm
```

Before restore, stop application writers.

Restore intentionally refuses to run with an active database lock and creates a pre-restore safety copy when replacing an existing database.

A database restore can rewind local payment truth relative to Stripe/P24. After a restore involving payment-era data:

1. do not enable new payments immediately,
2. confirm `/api/health/ready`,
3. reconcile affected Stripe/P24 orders against provider truth,
4. inspect manual-review/failure results,
5. only then reopen payment creation.

## 12. CI production acceptance

The blocking payment safety command is:

```bash
npm run test:payments
```

Platform Audit CI runs it as the named `Payment production acceptance` step.

The acceptance gate covers the critical payment contract, including:

- provider contract completeness,
- Stripe/P24 reconciliation selection,
- P24 capture/refund/recovery behavior,
- webhook ingress size limits,
- durable replay ledger,
- inventory exactly-once transitions,
- Stripe refunds,
- bank-transfer lifecycle/RMA,
- cross-provider RMA restock exactly-once,
- terminal refunded state under late payment signals,
- fail-closed late Stripe settlement when stock cannot be safely re-reserved.

A green CI run proves deterministic application behavior under these tested scenarios. It does not prove that production credentials, external dashboard/webhook configuration or third-party provider availability are correct.

## 13. Go-live checklist

Before enabling production payments:

- [ ] deployment is single-writer/single-instance for the file-backed database,
- [ ] `CELTRONICS_DB_PATH` points to durable writable storage,
- [ ] upload storage is private and durable,
- [ ] `npm run db:verify` passes,
- [ ] a fresh `npm run db:backup` succeeds,
- [ ] Site PR CI is green,
- [ ] Platform Audit CI is green,
- [ ] Aggregate CI gate is green,
- [ ] `Payment production acceptance` is green,
- [ ] `GET /api/health/live` returns 200,
- [ ] `GET /api/health/ready` returns 200,
- [ ] Stripe production secret/webhook secret and HTTPS origin are configured before Stripe is enabled,
- [ ] the external Stripe webhook endpoint targets `/api/webhooks/stripe`,
- [ ] bank recipient/account data are verified before bank transfer is enabled,
- [ ] P24 merchant/pos/API key/CRC and HTTPS origin are configured,
- [ ] P24 activation preflight succeeds before P24 becomes enabled,
- [ ] an operator knows how to run targeted reconciliation,
- [ ] an operator knows how to invoke emergency shutdown,
- [ ] payment audit/operations dashboard is visible to an ADMIN,
- [ ] a controlled provider-environment payment/refund smoke has been completed before accepting normal production traffic.

## 14. Incident checklist

When payment state looks wrong:

1. **Do not edit the JSON database by hand.**
2. Determine whether the incident affects new checkout only or existing financial state.
3. If new payments are unsafe, disable the affected provider or use global emergency shutdown.
4. Keep webhook/refund/reconciliation processing available for existing orders unless the incident specifically requires isolation.
5. Run targeted reconciliation for the affected order/provider.
6. Check payment status, refund status, return status and inventory reservation/restock markers together.
7. If reconciliation returns manual review, do not guess provider status.
8. Back up the database before any recovery action that could replace persistent state.
9. Re-run `npm run test:payments` before deploying a payment hotfix.
10. Re-enable new payments only after readiness and the affected provider flow are verified.

## 15. What not to do

Do not:

- mark an order PAID from a browser redirect,
- bypass signature verification,
- treat P24 register/return as settlement,
- remove provider credentials/webhook secrets to implement a kill switch,
- manually restock a refunded order without checking its inventory markers,
- retry a P24 ambiguous refund with a new identity,
- infer undocumented P24 refund status values,
- run provider HTTP calls inside the file-store write lock,
- start a second writer instance against the same JSON database,
- restore an old database and immediately reopen payments without provider reconciliation.

## 16. Current architecture boundary

Within the current single-instance, durable-volume deployment model, the payment stack has explicit:

- provider registry/capability contracts,
- control plane and emergency shutdown,
- configuration/readiness gates,
- provider activation preflight,
- verified payment capture,
- refund and RMA flows,
- reconciliation/recovery,
- inventory reservation and exactly-once safeguards,
- bounded webhook ingress,
- durable replay protection,
- audit/operations visibility,
- backup/recovery drill,
- blocking production acceptance tests.

The next architectural boundary is a real transactional database for multi-instance/horizontal scaling. That migration is intentionally outside the scope of this payment-hardening series.
