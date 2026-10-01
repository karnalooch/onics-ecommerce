# CEL-TRONICS presentation rebuild

Owner direction, 2026-10-01: replace the presentation, not merely repaint it. Preserve the company's approved red/black mark with subtle gloss and thin white outline. Earlier UI approval labels do not preserve old layouts.

## Execution contract

The branch must deliver the public homepage, services, contact, catalog, login and partner registration as a consistent responsive site. Header/footer isolate operational routes as before. Partner/Field PR #268 and WF-Mag PR #267 are parallel work, not permission to overwrite their changes.

Current first commit installs the outlined logo, new public shell and homepage, behavioral component tests and actual Chromium proof in Site PR CI. Remaining public routes are being migrated in subsequent commits on this same branch. This document is not a declaration of completion.

No payment, pricing, authorization, stock, account approval, cart ownership or order/RMA state transition changes are authorized by presentation migration. Public catalog errors must not masquerade as zero search results. Tests must protect functionality, not freeze rejected aesthetics.

## Brand provenance

`public/assets/logo.svg` is an outlined reconstruction of the owner-approved raster, not an original vector master. It has paths, local gradients and clipping only: no raster image, external fonts, scripts or network dependencies. ViewBox is 2045 by 515; `BrandLogo` preserves that aspect ratio.

Approved raster SHA-256: `93502c1b7f4805b6f385fc93bfa5c2a3f03e46513dbfe5f2c141572a6da8b6df`.
SVG SHA-256: `961b9bfac9277cd956e9a70e73cb2a682779560a0f606db6e6705cf1e9a8161e`.

No fictional portfolio, testimonials, certifications, operating-hours promises or generated installation photos. Typography provides the initial visual direction until verified company photography is available.

## Verification

New components use scoped CSS Modules and the existing Next/React stack. Site PR CI tests and builds its exact checked-out revision, then visits the built site in Chromium at 320, 390, 768 and 1440 px. It checks overflow, logo ratio, keyboard skip link, mobile disclosure/Escape/focus and contact navigation. PNG artifacts include a SHA-linked manifest; they are candidate visual proofs, not automatically approved baselines or a full WCAG audit.

Merge requires green current-revision gates, reviewed browser proofs, completed public routes and no lost business behavior. No production deployment or live database mutation is performed by this branch.
