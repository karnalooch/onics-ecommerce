# GEMINI.md

This file defines the high-priority rules for Antigravity in this project.
It incorporates the core modules of the SoftSpark AI Toolkit.

## Safety Constitution

### Article I: Safety First
- Never delete files without verification.
- Never run generated code without review.
- Max 3 autonomous loop iterations.

### Article II: Hierarchy of Truth
- Repository code and `kb/` are source of truth.
- Verify before guessing.

### Article III: Operational Integrity
- Definition of Done = Verified/Green.
- Maintain audit logs.

### Article V: Resource Governance
- Destructive commands (`rm`, `DROP`) require user approval.

## Engineering Standards

- **Conventional Commits**: `type(scope): description`.
- **TypeScript**: Strict typing, no `any`, use `unknown` if needed.
- **Next.js**: Use App Router patterns, server components by default.
- **Styling**: Tailwind CSS with clear hierarchy.

## Slash Commands (Patterns)

- `/commit`: Generate commit messages.
- `/tdd`: Implement features with tests first.
- `/refactor`: Improve code quality using small, safe steps.
- `/skill-audit`: Check for security risks in current context.

## Verification Checklist
1. Static analysis (lint/typecheck).
2. Functional verification (run command/check output).
3. User approval for UI changes.

## Data Extraction Excellence (V9)
- **Engine Priority**: Always prefer the local Universal Catalog Parsing V9 engine over one-off AI prompts for distributor price lists.
- **Rules of Integrity**: 
  - **Letter Mandate**: All models must contain at least one character (A-Z).
  - **Hardened Pricing**: No scientific notation or EAN codes allowed in the Price column.
  - **Specs Merging**: Aggregate all technical columns between Model and Price for rich descriptions.

## Elite Engineering Standard (The Golden Master)

> [!IMPORTANT]
> The **B2B Authorization Screen** is the absolute ultimate visual reference ("top of the top") for the entire Celtronics platform. All subsequent UI/UX architecture must strictly derive from its specific tokens, spacing, and physics.

### 1. The Golden Master Tokens (Derived from B2B Auth)
- **Golden Layout**: Architectural 50/50 visual split for distinct Informational vs. Operational zones.
- **The Navy-Slate Gradient**: The deep immersive background `bg-gradient-to-b from-[#1e2335] to-[#cbd5e1] text-white` (deep navy to metallic grey) for branding and trust anchors.
- **The Pure White Canvas**: Operational zones (forms, tables, dashboards) are strictly `#FFFFFF` with no decorative backgrounds.
- **The Pastel Input Base**: Inputs **must** use a light blue fill tint (e.g., `bg-blue-50/60` or `bg-slate-50`) with transparent borders, removing visual clutter.
- **The Vivid CTA Glow**: Primary actions use a highly saturated active blue (`bg-blue-500` or `#2b8aeb`) combined with a matching colored drop-shadow (e.g., `shadow-lg shadow-blue-500/40`) to create floating depth, rejecting flat gray shadows.
- **Typographic Authority**: Technical caps for labels (`text-xs font-semibold uppercase tracking-wider text-slate-500`), heavily weighted dark headers (`text-slate-900 font-extrabold`). 

### 2. Architectural Foundations
- **Fluid Grid & Scalability**: Mandatory responsive design using **Tailwind v4 Container Queries**. Optimize for 1366x768 (installers) up to 4K (ops centers).
- **Compact Scaling**: Use a density factor of **1.125 - 1.200**. Minimal margins, 14px compact font.
- **Horizontal Workflow**: Purge sidebars. Use horizontal alignment with action buttons (pills) at the end of rows.
- **Data Density**: Zero horizontal scroll on 1366x768. Collapse low-priority columns to icons with hover-expand.

### 3. Layout Patterns
- **Iconic Navigation (DHL Pattern)**: Horizontal top bar with large circular icons and short labels. Active tab marked with a high-contrast technical underline.
- **Action Bars & Inline Filters**: Bulk action buttons (solid blocks) placed directly above tables. **Inline Filters**: Search inputs must be built directly into table headers below the title.
- **Data Cards (Satel Pattern)**: Pure white work zones (#FFFFFF) on light gray backgrounds (`bg-background`). Rows separated by whitespace and subtle lines, no harsh black borders.
- **Fixed Contextual Panel**: "Contact Support" card docked to the right on high-resolution screens.

### 4. Physical Interaction & Physics
- **Physical Feedback**: All interactive elements must react via `active:scale-[0.98]` and `shadow-inner` (physical depression illusion).
- **The Colored Glow**: Hover states on primary elements should use a colored shadow matching the element's background.
- **Timing**: Use `ease-out` easing with 150-200ms duration `transition-all`.

## Strategic Operational Instruction (Walkthrough)

### Phase 1: Setup & Design Tokens
Establish Tailwind v4 configuration with Container Queries. Define the color palette (Dark Slate, Light Blue Fill, Vivid Sky Blue) and interaction physics (scale-97).

### Phase 2: Priority Blueprint (Public Hub & Auth)
Rebuild the login screen as the visual master:
- **Left**: Dark Slate/Navy gradient informational panel.
- **Right**: Pure white operational form with `bg-blue-50` inputs and Vivid Sky Blue CTA.
- **Verification Node**: Bordered box with blue typographic accents.

### Phase 3: Dashboard & Iconic Navigation
Implement the DHL-style iconic top bar and Satel-style context support panel. Ensure maximum vertical space preservation.

### Phase 4: High-Density Data Grids
Build responsive B2B tables with inline filters and action pills. Verify zero-scroll on 1366x768.

### Phase 5: Pricing & CPQ Logic
Implement discount matrices and quote generation with physical feedback states.

### Phase 6: RMA & System Audit
Final validation of fluidity and strict color adherence across all service modules.
