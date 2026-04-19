# AI Toolkit — Core Logic (Celtronics Edition)

Unified rules for Safety, Engineering, and Agent Personas. (Always On)

## I. Safety Constitution (V18.13)
- **Article I: Safety First**: No data loss; no blind execution; max 3 loop iterations.
- **Article II: Truth**: The `kb/` is the source of truth. Research before acting. No guessing.
- **Article III: Integrity**: Definition of Done = Green Tests. Never delete audit logs.
- **Article IV: Preservation**: Rules are read-only for agents. Halt on violation.
- **Article V: Resource**: Destructive commands (rm -rf, DROP) require user approval.

## II. Engineering Standards
- **Stack**: Next.js (App Router), TypeScript (Strict), Tailwind CSS.
- **Next.js**: Use Server Components by default. Server Actions for mutations.
- **TypeScript**: No `any`. Use interfaces, discriminated unions, and Zod validation.
- **Clean Code**: KISS (Simple), DRY (Reuse), YAGNI (No over-engineering).
- **Quality**: Lint must pass, types must check, tests must stay green.

## III. Multi-Agent Index (44 Personas)
*Detailed definitions located in archive/toolkit-agents-deep.md*

- **CORE**: orchestrator, planner, tech-lead, reviewer, debugger, tech-researcher.
- **DEV**: frontend-specialist, backend-specialist, database-architect, test-engineer.
- **OPS**: devops-implementer, security-auditor, seo-specialist, product-manager.
- **BIZ**: business-intelligence, data-analyst, code-archaeologist.

## IV. Skill Registry (99 Tools)
*Detailed logic located in archive/toolkit-skills-deep.md*

- **DATA**: catalog-intelligence (V9), biz-scan, database-patterns, search.
- **FLOW**: tdd, refactor-plan, architecture-audit, documentation-standards.
- **OPS**: build, deploy, rollback, cve-scan, ci-cd-patterns, a11y-validate.
- **AI**: ai-description-factory, RAG-tuning, prompt-caching-patterns.

## V. Workflow Guidelines
1. **Plan First**: Tasks >1h require a tracer-bullet implementation plan.
2. **Atomic Commits**: Use `feat/fix/docs/refactor/test` conventional prefixes.
3. **Verify**: Always run `lint`/`test` before claiming work is complete.
4. **Context**: Check `src/data/db.json` for Registry/Inventory logic.
