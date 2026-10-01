# Owner-approved removal of 29 catalog source headings

## Decision and boundary

On 2026-10-01 the owner explicitly requested deletion of the 29 unresolved records identified by the previous catalog-copy review. This supersedes the earlier decision to retain them pending review. The authoritative removal set is `src/data/catalog-retired-headings.json`, with exact IDs and SKUs; a blank description alone is never a deletion criterion.

The change is to `src/data/db.json`, the **repository development seed**, not a live database. Rebuilding an existing Docker volume does not migrate that volume. No customer data, payments, orders, uploads, category assignments or production credentials are modified.

## Verified data result

- Before: 426 products. Removed: exactly 29. After: 397 products.
- Every retained product object is unchanged and retains its original position relative to other retained products.
- All non-product collections are unchanged.
- No remaining references to the removed IDs, including nested values/map keys, or SKU fields matching the retired headings.
- No heuristic deletion and no broad removal of the INTEGRA, VERSA, PERFECTA or MICRA product families. For example, `INTEGRA-128-PLUS` remains.

```text
source commit: 4b20bad48790e79adfe640d37e47d3fd218c314e
source SHA256: 54508fbd61ebb78afff4f1ee5a1a448543a662382d07f860b2447e7bf9848cec
target SHA256: b85d57e721a574c509c32dea22533c78f67267fb85be5ebda9305faeb65377a7
seed commit:  3f3e2f753cbea8f65a9def0278c9b71c11ca0135
```

GitHub Actions run `36845623610` applied the deletion on the dedicated branch. Artifact `11152574362` contains the report, removed records, verified source backup and source snapshot. Its ZIP digest is `b6f2f6f21b693812de5ba04823e186951ed94ee14b5a436598f51afacfd3de72`. The downloaded backup and resulting seed were independently compared: the only data change is filtering the 29 approved IDs from `products`.

## Safety and regression checks

```bash
node --test scripts/ci/test_catalog_heading_removal.mjs
node scripts/ci/catalog_heading_removal.mjs --check
```

The 15 Node tests cover exact deletion, no input mutation, no-op replay, preserving real products with blank descriptions, edited target identities, partial removal, duplicate IDs, reintroduced SKUs under new IDs, references from orders and unknown collections, and invalid data. Site PR CI runs these tests and the read-only seed check permanently.

The offline `--apply` path accepts only the fixed development seed, refuses a symlink or production process, requires the exact approved source checksum and record count, acquires an exclusive lock, verifies a private backup, rechecks the source before an atomic replacement, and verifies the result. It is not a live-data migration tool. Stop local writers first. Repeating it after successful removal performs no writes.

The one-time branch-scoped writer workflow was removed after success. The permanent CI job has read-only repository permissions and does not modify catalog data. Its seed check prevents the approved identities or matching SKUs from returning to the committed seed; it is not a blanket runtime import blacklist.

## Production acceptance

This closes the 29-record seed-cleanup item only. It does not certify prices/specifications, deploy a server, migrate an existing persistent volume, validate SMTP/provider credentials, or replace the deployed customer/payment/recovery acceptance in `PAYMENTS_PRODUCTION_RUNBOOK.md`.
