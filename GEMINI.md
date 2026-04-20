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

## Elite Engineering Standard (Satel/DHL Hybrid)

- **Utility over Decoration**: Purge all blur, gradients, and decorative layered depth. Use clean white work zones on light gray backgrounds (`bg-background`).
- **Iconic Navigation (DHL Pattern)**: Standardize on a horizontal top bar with iconic modular caps. Save vertical space.
- **Data Density**: 14px compact font. Use inline table headers for filtering instead of sidebars. Ensure zero horizontal scroll on 1366x768.
- **Physical Interaction**: Native physics mandate. All interactive elements must react via `active-press` (scale-97) and `active-inset` (inset shadow).
- **OKLCH Palette**: Mandatory use of perceived-brightness whites, Dark Slate texts, and Technical Blue/Yellow accents.
