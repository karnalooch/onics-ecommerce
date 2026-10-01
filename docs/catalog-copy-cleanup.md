# Existing catalog copy cleanup

## Owner request and scope

Clean the names and descriptions of existing CEL-TRONICS articles. This is an editorial cleanup of existing source text, not manufacturer research, specification certification, product deletion, category remapping or a production database migration.

Baseline: `7727013015992c96a44f93311fd32f430b1a4146`, development seed `src/data/db.json`.

Verified result:

- 426 records retained in the same order, with the same IDs and SKUs.
- 397 model-only titles changed to `SKU — readable description lead`.
- 397 substantive descriptions cleaned; 29 `Parametry standardowe` placeholders changed to an empty description, allowing the existing truthful missing-description UI/fallback.
- No remaining observed `| PLN | ...` import tail in the seed.
- No change to prices, stock, manufacturer, classification, revisions, timestamps, users, orders or other non-copy fields.
- No product deleted, merged, hidden or automatically treated as a confirmed valid article.

## Editorial rules

Use only the text already attached to the product. Preserve model spelling and variant/pack identifiers exactly in the SKU. Keep meaningful existing editorial titles rather than overwriting them. New titles retain the model and use a bounded phrase from the source; the complete description preserves compatibility, color, pack quantity, dimensions, negative temperatures and qualifications omitted from the short title.

Normalize whitespace, plain-text HTML entities and the observed `do128`, capacity-unit and barrier-separator typos. Repeated normalization must be a no-op. Deeply nested entities that do not converge within the bounded decoder are preserved, not partially decoded. This is plain-text normalization, not an HTML sanitizer; render the results as text, never via raw HTML insertion.

Recognize only the observed trailing signature: currency `PLN`, exactly four binary source columns, and an optional barcode. The binary column meanings are unknown and are not interpreted as technical specifications, price, availability or stock. Preserve the barcode text, including leading zeroes, as an explicitly labelled `EAN`. Unrecognized tails and non-binary values are retained for review. Original source columns remain recoverable from the baseline Git revision and the per-product before/after report; they are not exposed as purported device specifications.

No guessed brand, parameters, compliance claims or SEO marketing filler are added. The original specification statements themselves have not been independently checked against manufacturer documentation.

## Examples

- `INTEGRA-128-PLUS` → `INTEGRA-128-PLUS — płyta główna centrali alarmowej od 16 do 128 wejść i wyjść`.
- `INT-TSG2R-B` → `INT-TSG2R-B — manipulator z ekranem dotykowym 4,3"`; black color and compatibility remain in the full description.
- `ACTIVA-5` → `ACTIVA-5 — aktywna bariera podczerwieni – 5 wiązek`; the original length, color and EAN remain in the full description.

## Runtime and import boundary

`productCatalogView.ts` applies the shared copy normalization to the browsing projection. `getProductCatalogDescription` skips empty/placeholder source text and cleans the selected stored, knowledge or SEO description. This also handles a pre-existing persisted database without writing during a read.

The repository seed is genuinely edited, not merely masked with CSS. However, existing Docker volumes are not replaced by rebuilding the image. This work does not claim that a live database was migrated or that any public deployment occurred. Import writers and their ownership rules are unchanged; stale imported copy is normalized on the supported catalog read path rather than written back automatically. The parallel WF-Mag work is not modified.

## Offline seed maintenance and tests

Use Node 24. Stop any local writers before modifying the repository development seed.

```bash
node --test scripts/ci/test_catalog_copy.mjs
node scripts/ci/catalog_copy_seed.mjs
node scripts/ci/catalog_copy_seed.mjs --check
# Deliberate offline development-seed change only:
node scripts/ci/catalog_copy_seed.mjs --apply --seed-only
```

The default command plans only. `--check` fails if text still needs normalization. Apply refuses a production process, a configured `CELTRONICS_DB_PATH`, an arbitrary path argument or a symlink target. It verifies a private hash-named backup under `.local/celtronics/catalog-copy-backups`, asserts non-copy fields and record count are unchanged, checks the seed has not changed during planning, writes atomically and verifies the result. It is not a live-database migration tool or a substitute for stopping writers.

The per-product plan/report is under `artifacts/catalog-copy/`; the backup is not included in the report artifact. Site PR CI runs the 16 deterministic Node tests and the seed no-op check, followed by the application suite, build and existing browser role/viewport acceptance. Six application integration tests cover view-only normalization, placeholder fallback, preserved records, model/EAN search, five account states and knowledge-only products.

The one-time branch-scoped write workflow used to materialize the seed changes was removed after completion. No permanent auto-writing workflow is introduced.

## Migration evidence

Both GitHub Actions migration runs passed, including the no-op second invocation and assertions protecting all non-copy data:

- Run `36836113990`, artifact `11149626299`: first pass, 426 records touched, 397 titles, 393 descriptions; 65 review flags.
- Run `36836681587`, artifact `11149427049`: remaining recognized binary tails and punctuation; final review list reduced to 29 missing-description records.

Seed SHA-256 chain:

```text
baseline: cdb4c3b1fc0e38dd7a4982ad5d1e45dd47eb2d653e318e44a00f51ef8063343f
pass 1:   c5cc4080c61d12636aa9fd202a8cc7069e2fd26ff5f85f3f830d96a53ff65103
final:    54508fbd61ebb78afff4f1ee5a1a448543a662382d07f860b2447e7bf9848cec
```

Both report archives were downloaded and their SHA-256 values independently checked. Every second-pass `before` value matches its first-pass `after`. Final check reports zero further changes.

## 29 unresolved source records — not fabricated descriptions

Each has no substantive source description and zero price/stock. Many names resemble source section headings, but this cleanup does not decide deletion or product validity. Keep their IDs and original model/name for subsequent source reconciliation:

```text
INTEGRA
INTEGRA-–-PŁYTY-GŁÓWNE
INTEGRA-–-OBSŁUGA-I-NADZÓR-SYSTEMU
INTEGRA-–-MODUŁY-ROZBUDOWY-WEJŚĆ-I-WYJŚĆ
INTEGRA-–-ZASILACZE
INTEGRA-–-MODUŁY-KOMUNIKACYJNE
INTEGRA-–-MODUŁY-KOMUNIKACYJNE---ANTENY
INTEGRA-–-WERYFIKACJA-ALARMU
INTEGRA-–-KONWERTERY-MAGISTRAL
INTEGRA-–-MODUŁY-KONTROLI-DOSTĘPU
VERSA
VERSA---ZESTAWY
VERSA-–-PŁYTY-GŁÓWNE
VERSA-–-OBSŁUGA-I-NADZÓR-SYSTEMU
VERSA-–-MODUŁY-ROZBUDOWY-WEJŚĆ-I-WYJŚĆ
VERSA-–-MODUŁY-KOMUNIKACYJNE
PERFECTA
PERFECTA---ZESTAWY
PERFECTA-–-PŁYTY-GŁÓWNE
PERFECTA-–-OBSŁUGA-I-NADZÓR-SYSTEMU
PERFECTA-–-MODUŁY-ROZBUDOWY-WEJŚĆ-I-WYJŚĆ
PERFECTA---ANTENY-GSM
DWUKIERUNKOWY-BEZPRZEWODOWY-SYSTEM-ABAX-2-/-ABAX
MICRA---URZĄDZENIA-SYSTEMOWE
MICRA---KLAWIATURY-SYSTEMOWE
MICRA---STEROWANIE-(KOMUNIKACJA-JEDNOKIERUNKOWA)
MICRA-–-CZUJKI-RUCHU-(KOMUNIKACJA-JEDNOKIERUNKOWA)
MICRA-–-SYGNALIZATOR-(KOMUNIKACJA-DWUKIERUNKOWA)
MICRA-–-AKCESORIA
```
