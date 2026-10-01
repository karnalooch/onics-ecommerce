# CEL-TRONICS presentation rebuild

Owner direction, 2026-10-01: replace the presentation, not merely repaint it. Preserve the company's approved red/black mark with subtle gloss and thin white outline. Earlier UI approval labels do not preserve old layouts.

## Implemented public routes

- `/`: new corporate homepage, actual services and contact actions.
- `/uslugi`: service scope and collaboration process.
- `/kontakt`: contact topics, phone, email and directions; mailto actions explicitly do not claim to send messages.
- `/produkty`: searchable, category-filtered catalog, 24 records per page, shareable filter/page URLs and separate empty/error states.
- `/produkty/[id]`: device identification, description and account-authoritative purchase controls, with a return to the filtered list.
- `/logowanie`: stable labels, password reveal, request-in-flight protection, generic credential errors and validated session response.
- `/rejestracja`: complete company request form, shared backend-aligned validation, accessible errors, retained input on retry and privacy-preserving acknowledgment.

Public header/footer have been replaced rather than wrapped in legacy style aliases. Operational route isolation is unchanged. Partner/Field PR #268 and WF-Mag PR #267 are separate work, not overwritten by this implementation. This does not claim completion of their internal workspaces or a production deployment.

## Functional boundaries

No payment, pricing, authorization, stock, account approval, cart ownership or order/RMA state transition implementation changed. Both catalog routes call the same request-scoped loader and existing authoritative projection. No account-specific view is globally cached. Missing visibility is fail-closed; an unknown/zero price is not represented as a ready-to-buy price. Database/projection failure is an outage, not an empty search result.

Registration retains the existing payload, NIP checksum, company and optional contact bounds, eight-character password minimum and 72-byte UTF-8 maximum. Required terms and optional electronic-invoice consent retain their meanings. Success remains generic for new/existing accounts; no activation is claimed.

## Brand provenance

`public/assets/logo.svg` is an outlined reconstruction of the owner-approved raster, not an original vector master. It contains paths, local gradients and clipping only: no raster, fonts, scripts or network dependencies. `BrandLogo` preserves the 2045:515 viewBox aspect ratio.

Approved raster SHA-256: `93502c1b7f4805b6f385fc93bfa5c2a3f03e46513dbfe5f2c141572a6da8b6df`.
SVG SHA-256: `961b9bfac9277cd956e9a70e73cb2a682779560a0f606db6e6705cf1e9a8161e`.

No invented portfolio, testimonials, certifications, opening hours or generated installation photos. Typography provides the visual direction until verified company photography is available. Existing Inter is reused; there is no extra font download dependency.

## Evidence and acceptance

Site PR CI tests and builds its exact checked-out head, then runs real Chromium at 320, 390, 768 and 1440 px. Browser coverage includes all listed public pages, logo ratio, horizontal overflow, keyboard skip link, mobile disclosure/Escape/focus, device navigation, no-result and missing-device states, password visibility, invalid registration, HTTP error/retry and generic acknowledgment.

Registration HTTP responses in this browser test are intercepted; no account or production data is created. Backend registration, authentication and business invariants remain covered by the existing suites. Browser proof is not a real paid transaction or a complete WCAG audit.

PNG artifacts include the checkout SHA, browser version, dimensions and checksums. They are review candidates, not automatically approved screenshot baselines. Final acceptance is recorded in PR #269 only after current-head checks pass and actual screenshots are inspected.

The implementation uses scoped CSS Modules and the existing Next/React stack. Out-of-date source-location tests were extended to follow the extracted server loader; pricing, identity and anti-self-fetch assertions are retained, alongside executable failure/isolation tests. No tests were removed to obtain a green result.
