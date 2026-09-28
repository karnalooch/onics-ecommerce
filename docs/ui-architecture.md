# ONICS UI architecture

## Status

This document is the design and implementation contract introduced by T216. It treats the existing backend as the stable product engine and replaces the presentation model with three intentionally separate surfaces.

## 1. Product surfaces

### Field / installer

Route: `/field`

Primary environment: a phone used on-site, frequently with one hand, in poor lighting or while standing on a ladder.

The primary tasks are:

1. find a device by model, SKU, manufacturer or technical property;
2. see the account-specific price immediately;
3. see stock and the smallest useful set of technical facts;
4. read a verified procedure when one exists;
5. see the source of technical knowledge.

The Field surface must not fabricate installation procedures. A procedure is shown only when the stored source contains explicit ordered steps. When no verified procedure exists, the UI says so.

Touch targets should normally be at least 44 px. Search is the first-class navigation model. Charts, marketing blocks, dashboard KPIs and decorative cards are out of scope.

`Tryb drabiny` intentionally enlarges the high-value information and hides secondary prose.

### Admin / operations

Route prefix: `/admin`

The admin surface is an operations console, not an e-commerce dashboard.

It optimizes for:

- exceptions requiring operator action;
- catalog quality;
- knowledge/storage integrity;
- partner approval;
- order/payment lifecycle;
- repairs and RMA;
- explicit destructive actions.

The admin home must not contain revenue charts, sales growth widgets, gamified KPI tiles, glassmorphism, animated hover scaling or decorative commerce language.

Counts are allowed when they are queues or integrity indicators.

### Public storefront

Public routes keep their existing public navigation and footer until migrated separately. Public commerce presentation must not leak into Field or Admin.

## 2. Chrome isolation

`AppChrome` decides whether public chrome is present. Operational routes do not render the public navbar/footer.

Admin and Partner/Field layouts own their navigation.

This prevents the previous state where a public storefront navbar/footer wrapped an admin sidebar.

## 3. Visual language

Use:

- neutral solid surfaces;
- one accent for interaction;
- semantic amber/red/green only for real state;
- 1 px borders for hierarchy;
- restrained 8-12 px radii;
- Inter for UI copy;
- JetBrains Mono for SKU, model, addresses, IDs and technical values;
- tabular numerals for operational numbers.

Avoid on operational surfaces:

- blur/acrylic/mica;
- radial decorative gradients;
- large shadows;
- hover-scale;
- oversized marketing headings;
- icon-only destructive actions;
- hidden actions that appear only on hover.

The scoped `admin/operations.css` neutralizes legacy Fluent utilities while old admin subpages are incrementally migrated.

## 4. Data truth rules

### Pricing

Field search uses `buildProductCatalogView`, therefore BIZ users receive the same account pricing rules as the existing commerce backend. Admin users see base catalog pricing.

Do not calculate ad-hoc discounts in the Field client.

### Technical facts

`fieldProduct.ts` may extract explicitly present values such as PoE, IP rating, MP, voltage, SATA and EAN from stored technical descriptions.

It may not infer capabilities that are absent from the source.

### Procedures

`extractVerifiedProcedure` accepts only explicit ordered steps such as `1.`, `2)` or `Krok 1`.

Narrative product copy must never be converted into guessed installation instructions.

### Knowledge provenance

When a knowledge entry contains source provenance, Field exposes the source filename. The admin knowledge screen exposes storage/invariant state and uses the fail-closed reconciler introduced by T214.

## 5. Information architecture

Admin:

- Operacje
- Katalog
- Wiedza
- Klienci
- Zamówienia
- Płatności
- Serwis
- Struktura

Partner:

- Szukaj urządzenia
- Moje konto
- Zamówienia
- Serwis
- Ustawienia

Field product detail:

- identity / model;
- account price and stock;
- key facts;
- verified procedure;
- source description and provenance.

## 6. Component rules

Operational components should be task-oriented rather than generic marketing cards.

Preferred patterns:

- queue row;
- status strip;
- technical fact grid;
- dense data table;
- explicit empty state;
- source/provenance line;
- large search input;
- bounded confirmation dialog.

Destructive actions must be visible, explicit and separated from routine navigation.

## 7. Migration strategy

T216 establishes the new shell, Field flow, admin home, knowledge operations screen and a scoped de-slop layer.

Legacy admin subpages remain functional inside the new shell. They should be migrated one by one without changing their backend contracts. During migration:

1. preserve endpoint semantics and security fences;
2. remove decorative dashboard wrappers;
3. move primary actions above tables;
4. keep filters/search visible;
5. keep dangerous actions explicit;
6. add visual regression/contract tests when practical.

Public storefront redesign is a separate project and must not be bundled into the operational UI work.


## 8. T218 legacy-screen migration

The following operational surfaces have completed the second-wave presentation reset:

- Clients: dense partner registry with explicit status, pricing conditions, block/delete actions and CSV export.
- Catalog taxonomy: category/subcategory editor with plain hierarchy and visible destructive actions.
- Repairs: service register with compact lifecycle counts and a plain add-RMA dialog.
- Orders: lifecycle wording is preserved, but presentation uses ordinary order/fulfillment language rather than command-stream metaphors.
- Payments: provider state, reconciliation and emergency shutdown remain explicit, with danger actions retaining semantic contrast.
- Quotes: CPQ workspace uses customer/line-item/offer language; Blueprint/Mission Control naming is forbidden.
- Price lists: export/print capability remains, but operational UI uses catalog/tier/markup language.
- Product import: WF-Mag, knowledge sources and staging are presented as data-source/import workflows rather than an AI command center.

### Anti-slop rule

Operational UI must describe the task or state literally.

Forbidden patterns include invented system-version labels, military/command-center metaphors, fake telemetry labels, decorative all-caps identifiers, and hover-only primary actions.

Examples of prohibited copy:

- `MISSION_CONTROL_MATRIX`
- `Blueprint_Gen_v9`
- `TRANSACTION_QUEUE_STREAM`
- `STAGING_TERMINAL`
- `NODE_SELECTED`

A regression test protects the migrated surfaces from these terms.

### Lifecycle safety during visual migration

Presentation work must not rename backend enum values, loosen authorization, bypass current-admin fences, change idempotency tokens, alter payment/RMA transitions, or silently change destructive-action behavior.

Display labels may be humanized. Machine state remains unchanged.


## 9. T220 product workspace and partner surfaces

T220 finishes the visual migration of the catalog workspace and partner-facing operational surfaces.

Completed rules:

- Product administration uses one shared Operations shell. Product detail pages must not render a nested sidebar, logo shell or independent admin navigation.
- Product filters are literal catalog controls: search, stock, category, subcategory and manufacturer.
- Import structure approval is a bounded confirmation dialog, not a command-center workflow.
- Batch staging actions remain explicit and visible, with ordinary labels for category/manufacturer updates and commit.
- Partner catalog uses a technical register with SKU, product, manufacturer, stock, account price and one explicit action.
- Partner orders expose lifecycle status, payment instructions, items, delivery timing and values without ecommerce card styling.
- Partner RMA and settings use the same restrained field visual language as `/field`.

Additional prohibited presentation language includes:

- `CRT v4.6_PRO`
- `Systemowy Węzeł Ewidencji`
- `Filtrowanie IQ`
- `Universal Structure Hub`
- `MASOWA_AUTORYZACJA`
- `Masowy katalog sprzętowy V2`
- `Centrum RMA`

The partner surface may support cart/quote actions as business capabilities, but its primary presentation remains technical and task-oriented rather than storefront-oriented.


## 10. T222 CEL-TRONICS-first public surface

The public product hierarchy is explicit:

- **CEL-TRONICS** is the user-facing company, brand and service relationship.
- **ONICS** is an internal implementation/platform name and must not lead public navigation, authentication, registration, catalog or service presentation.
- Partner capabilities belong to the **CEL-TRONICS partner area**, not to a generic SaaS or marketplace identity.

Public presentation rules:

- use the real CEL-TRONICS logo/wordmark where brand identification is primary;
- describe services, catalog, pricing, orders and support in literal CEL-TRONICS language;
- keep ecommerce mechanics subordinate to technical catalog and customer-service tasks;
- avoid invented tiers, premium-shop language, mission-control metaphors, fake product previews and gamified/cart-themed wording;
- authenticated catalog surfaces should prioritize SKU, product identity, availability, account price and the next explicit action.

Registration is a company-access request to CEL-TRONICS. Login is entry to the CEL-TRONICS partner area. The services page is a company capability map, not a template marketing grid.

Forbidden public presentation patterns include:

- `OnboardingMissionControl`
- `Celtronics Pro`
- `Preview Model`
- `Pusty Magazynek`
- `Modern Retail & B2B Shop`
- `Premium Styling`
- `Finalizuj Wybór`

Business behavior remains unchanged during brand migration: authentication, registration payloads, account approval, pricing, cart quantity limits, quote semantics and checkout rules stay authoritative in their existing backend/domain modules.
