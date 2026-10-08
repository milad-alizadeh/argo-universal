# The Prickles canon is the coding standard

The Prickles canon v2.0, kept verbatim in `docs/agents/prickles/`, is Argo's coding standard. Where it conflicts with `AGENTS.md`, another ADR or a `docs/agents/` doc, the canon wins, including its literal caps: 15-line functions, cyclomatic complexity 3, depth 3, 10 statements, 3 parameters and 150-line files (owner, 2026-10-07). Debt lists and per-occurrence suppressions go; a cap that is wrong changes globally, with the reason written down, as S2 says.

Where the canon cannot apply as written, these are the recorded applications (owner, 2026-10-07):

1. **Tests.** Test files get one documented global cap in the linter config, not a list of exempt files.
2. **XState.** `setup({ types: {} as … })` has no cast-free form in XState v5. One override for `*machine.ts` files covers that cast and the file cap; it is T2's written-down exception.
3. **Vendor payloads.** Type predicates over the vendor SDK types or generated protocol types satisfy T3. This supersedes ADR-0015's allowance for casts on vendor messages and keeps its decision against Zod schemas for vendor shapes.
4. **React components.** The function cap applies to components; long ones split into named subcomponents and hooks.
5. **Unit and integration tests.** Vitest runs a `unit` project under TS7 (no database, network, clock, filesystem or environment) and an `integration` project under TS4, where the composition, database and git tests keep real SQLite and real git.
6. **Gherkin.** Acceptance criteria in spec issues are written as Given/When/Then. End-to-end tests the owner reads use Scenario Outlines.
7. **Pattern names.** PT1 names apply only where the pattern is unmistakable. "Repository" keeps its `GLOSSARY.md` meaning, a git repository.
8. **Server Components.** A8 is met by ADR-0002: the Server owns the data and the logic beside it. The Expo app stays a bundled UI with no React Server Components, which is the canon's native default.

Enforcement lands through a spec issue, folder by folder, so CI stays green.

## Considered Options

- Argo's own rules win where they conflict (the first `AGENTS.md` pointer). Rejected: the owner wants the canon applied as written.
- Adapted rule docs (`docs/agents/code-shape.md`, `docs/agents/testing.md`). Removed: they restated the canon in other words and disagreed with it.
