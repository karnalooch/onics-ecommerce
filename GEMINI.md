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

## Elite Engineering Standard (The Fluent Master)

> [!IMPORTANT]
> The **Windows 11 Fluent Design** is the absolute ultimate visual reference. All UI/UX architecture must strictly derive from its specific tokens: Mica material, rounded corners (12-16px), and Electric Blue accents.

### 1. The Fluent Master Tokens
- **Acrylic & Mica**: Use `glass-mica` (defined in globals.css) for parent containers. Layers of depth via soft borders and background blurs.
- **The Electric Blue Accent**: Primary actions use `#0078d4` (Electric Blue).
- **The Fluent Card**: Operational zones use `fluent-card` with rounded corners (12-16px) and subtle elevations (`shadow-2xl` on hover).
- **Typographic Airy Mode**: Move away from heavy black headers. Use balanced, professional typography with ample whitespace and technical caps for metadata.
- **Interaction Physics**: Mandatory `active:scale-[0.98]` and `transition-all duration-300` for physical feedback.

### 2. Architectural Foundations
- **Layout Grid**: Airy 50/50 splits for auth, and immersive 12-column grids for dashboards.
- **Zero Industrial Clutter**: Remove sharp black borders, brutalist overlays, and high-contrast "industrial" grids unless specifically requested for a technical diagnostic view.
- **Data Density**: Maintain high density but use vertical rhythm and whitespace instead of hard lines.

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
