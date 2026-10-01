# Public presentation: role and runtime evidence

Companion to [the public rebuild](public-presentation-rebuild.md).

## Why the guest proof was not sufficient

The `3b0ac79c` artifact had 51 PNGs and passed the guest viewport assertions, but its server log contained 488 `UntrustedHost` failures. It was not evidence for authenticated presentation or a healthy session endpoint. The prior green workflow must not be treated as role acceptance.

## Acceptance gate

`Site PR CI` builds the exact checkout, then `public_acceptance.py` runs the existing guest suite and a 5-by-4 role matrix at 320, 390, 768 and 1440 px:

- guest: no prices or purchase button;
- approved BIZ: real credentials login; the synthetic 100 PLN product is 83 PLN after its stored 17% discount;
- ADMIN: real credentials login; that product stays at 100 PLN;
- pending and blocked: real credentials login is denied with generic copy and no session; an explicitly synthetic stale approved cookie then proves that current stored account state still suppresses catalog/detail prices and purchase controls.

Every role covers both filtered catalog and device detail. Both rejected accounts also have login-error screenshots. Combined evidence requires exactly 99 PNGs, 20 successful role/viewport cases, a complete guest matrix, matching checkout SHA and screenshot hashes. Missing or duplicated cases, missing screenshots, unexpected failure images, changed guest hashes and failed receipts block acceptance.

`acceptance.json` is the overall machine receipt. `manifest.json` is the narrower guest receipt. Neither automatically approves appearance for the owner.

The gate requires a healthy anonymous `/api/auth/session`, checks exact authenticated identity, rejects browser exceptions and unexpected auth HTTP errors/server 5xx, and rejects server auth errors other than the deliberately exercised `CredentialsSignin` denials. Thus `UntrustedHost` cannot be hidden behind successful HTML rendering again. Pure contract unit tests exercise these rejection paths.

## Isolation and limits

`prepare_public_proof.mjs` creates a fresh CI-only `.ci/public-proof` store from the repository seed, adds four clearly synthetic accounts and one synthetic device, and refuses existing destinations or non-CI paths. The repository seed hash is checked after the proof. Random fixture passwords and short-lived stale-session cookies remain outside the uploaded artifact directory.

`AUTH_TRUST_HOST=true` and the canonical loopback auth URL are scoped to the browser-proof step. The application auth configuration, production defaults, account approval, server pricing, cart ownership, orders, payments and RMA are unchanged. The server binds only to `127.0.0.1`.

Registration responses are still intercepted; no real account is created. No cart/order/payment mutation is exercised. The stale-session checks prove current public pricing visibility, not a claim that every protected API revokes every stale session. Existing backend suites remain responsible for those broader authorization invariants. This is Chromium evidence, not a cross-browser audit, an owner visual approval or a production deployment.
