# ONICS / CEL-TRONICS documentation

This directory is the documentation entry point for the repository.

Gumball is adopted in **preserve-local / release-critical** mode. Existing ONICS controls remain authoritative when they are stronger or more product-specific than the shared platform baseline.

## Authority map

| Area | Authoritative document |
|---|---|
| Current architecture, persistence, deployment and handover state | `HANDOVER.md` |
| Local development and Docker runtime | `README.md` |
| Payment production configuration, operations and incident handling | `PAYMENTS_PRODUCTION_RUNBOOK.md` |
| Public/admin UI architecture | `docs/ui-architecture.md` |
| XML order import contract | `docs/order-import-xml-v1.md` |
| Gumball consumer contract | `gumball.yaml` + `.gumball/` |
| CI / merge validation | `.github/workflows/` |
| Agent/tooling rules | `AGENTS.md` |

Historical snapshots and evidence never override the current source of truth above.

## Gumball adoption rule

ONICS keeps its application-specific payment, file-store recovery, production-build and Docker-runtime proof downstream. Gumball owns reusable repository policy, governance, lifecycle/labels, release lineage, shared security baseline and promotion flow.

The final **Aggregate CI gate remains caller-local and fail closed**.

## CI Cost Governor routing

The caller-local Aggregate CI gate derives the required proof set from the exact changed paths and fails closed when required evidence is missing, failed, cancelled or unexpectedly skipped.

- Gumball consumer validation runs for every pull request.
- Documentation and Gumball-candidate-only changes stay on the light lane.
- Platform Audit runs for application/server changes.
- Site PR CI runs for public/shared UI and relevant frontend-toolchain changes.
- Docker Runtime CI runs for container, bootstrap, authentication/health runtime and relevant toolchain changes.
- Changes to `.github/**` or `scripts/ci/**` force the complete proof set independently of the path planner.
- Superseded pull-request runs are cancelled to avoid paying for stale revisions.

The routing contract and workflow/filter alignment are tested by `scripts/ci/test_onics_ci_plan.py` and `scripts/ci/test_onics_ci_wiring.py`.

