# Celtronics V12: Final Constitution & Workspace Rules

This document defines the immutable architectural, design, and security standards for the Celtronics.pl transformation. Antigravity agents must adhere to these rules without exception.

## 1. Safety & Security Constitution
- **Human-in-the-Loop (H-I-L)**: No direct database writes to production (`db.json` or live SQL) without explicit user confirmation.
- **Environment Protection**: All `.env` and secret storage files MUST be ignored in Git commits.
- **Destructive Actions**: No file deletions without prior user approval.
- **Error Handling**: All external API calls must be wrapped in `try/catch` blocks with robust system logging.

## 2. Engineering Standards
- **Strict TypeScript**: 
  - `strict: true` is mandatory.
  - `any` is strictly prohibited. Use `unknown` with Type Guards if necessary.
  - `noImplicitAny` must be enabled.
- **Function/File Limits**:
  - Max **30 lines** per function.
  - Max **300 lines** per file.
  - Cyclomatic complexity must be **< 10**.
- **React Patterns**:
  - Prefer **Compound Components** and **Render Props**.
  - Encapsulate business logic in **Custom Hooks**.
  - Use `React.memo`, `useMemo`, and `useCallback` for performance optimization only after measurement.
- **Tailwind CSS v4**:
  - Use the rust-powered **Oxide engine**.
  - Adopt **CSS-first** configuration via `@theme`.
  - Prefer native utility classes over `@apply`.
  - Use **OKLCH** for all color definitions.

## 3. UI/UX Psychology (The "Antigravity Paradigm")
- **Hick’s Law**: Minimize alternatives to reduce decision time. Implement **Progressive Disclosure**.
- **Miller’s Law**: Chunk data into manageable portions (max ~7 units).
- **Fitts’s Law**: Target elements (CTAs) must be large with ample click zones, especially for mobile installs.
- **Von Restorff Effect**: Key alerts and CTAs must be visually distinct from the environment.
- **Color Rules**:
  - **60-30-10 Rule**: 60% Space (Whitespace/Neutral), 30% Supporting (Nav/Cards), 10% Interaction (CTAs/Alerts).
  - **PURPLE BAN**: Avoid purple as a primary color.
  - No "Matrix/Hacker" aesthetics. Prefer clean, trustworthy B2B security visuals.

## 4. Visual Physics & Motion
- **Glassmorphism**:
  - **Backdrop Blur**: Use `backdrop-blur-sm` (8px) to `xl` (24px) for spatial layering.
  - **Translucency**: Opacity between 10% and 40% only.
  - **Borders**: 1px thin borders with 30% white opacity to simulate glass edges.
- **Shadow Architecture**:
  - Use **Multi-Layer Shadows** (Key + Ambient).
  - Tokens: `--ks-shadow-sm` (Hover), `--ks-shadow-md` (Sidebar), `--ks-shadow-lg` (Modals).
- **Motion Design**:
  - **Easing**: Prefer `Ease-Out` (Locomotive Stop) and `Spring` (Kinetic).
  - **BOUNCE PROHIBITED**: Playful bouncing is banned in professional B2B security contexts.

## 5. Development Workflow
- **Master Check**: `task.md` is the source of truth for task decomposition.
- **Plan First**: No code changes allowed before `implementation_plan.md` is approved.
- **Evidence**: `walkthrough.md` must include screenshots or descriptions of verification steps.
