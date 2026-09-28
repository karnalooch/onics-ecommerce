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
