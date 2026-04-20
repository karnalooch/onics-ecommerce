# Celtronics Rebuild Constitution: Technical Blue Paradigm

This document defines the architectural, design, and security standards for the Celtronics.pl "Mission Control" rebuild.

## 1. Safety & Security Constitution
- **Human-in-the-Loop (H-I-L)**: No direct database writes to production (`db.json` or live SQL) without explicit user confirmation.
- **Environment Protection**: All `.env` and secret storage files MUST be ignored in Git commits.
- **Error Handling**: All external API calls must be wrapped in `try/catch` blocks with robust system logging.

## 2. Engineering Standards
- **Strict TypeScript**: `strict: true`, no `any`, max 30 lines per function, max 300 lines per file.
- **Tailwind CSS v4**: Oxide engine, CSS-first via `@theme`, prefer native classes over `@apply`.
- **Intelligent Import Preservation**: `src/lib/knowledge/parser.ts` is the source of truth for catalog intelligence. Do not refactor its core logic without specific mandate.

## 3. UI/UX Paradigm (Compact & Horizontal)
- **Hick’s Law**: Implementation of **Progressive Disclosure**.
- **1366x768 Optimization**: Interface must be usable on legacy laptops. Zero vertical scroll on main dashboards.
- **Dense UI**: Scale of 1.125-1.200. Minimal margins, compact tables.
- **Navigation**: Horizontal top-level navigation only. Sidebars allowed only as "Slim Icon Bars" in admin panels.
- **PURPLE & NAVY BAN**: Avoid deep purple and heavy navy.
- **Colors (Technical Blue)**: 
    - 60% White/Light Gray base.
    - 30% Sky/Medical Blue shades.
    - 10% Technical Blue accents (CTAs).

## 4. Visual Physics (Flat over Glass)
- **Glassmorphism**: Restricted to critical modals only. Discard from primary UI surfaces.
- **Shadows**: Minimal elevation (Flat design).
- **Motion**: Snap-to-action easing (150-200ms). No playful bounces.

## 5. Development Workflow
- **task.md**: Source of truth for execution.
- **Evidence**: `walkthrough.md` must document visual changes.
