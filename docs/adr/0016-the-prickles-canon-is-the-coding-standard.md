# The Prickles canon is the coding standard

The Prickles canon v2.0, kept verbatim in `docs/agents/prickles/`, is Argo's coding standard. Where it conflicts with `AGENTS.md`, another ADR or a `docs/agents/` doc, the canon wins, including its literal caps: 15-line functions, cyclomatic complexity 3, depth 3, 10 statements, 3 parameters and 150-line files (owner, 2026-10-07). Debt lists and per-occurrence suppressions go; a cap that is wrong changes globally, with the reason written down, as S2 says.

Where the canon cannot apply as written, these are the recorded applications (owner, 2026-10-07):

1. **Tests.** Test files get one documented global cap in the linter config, not a list of exempt files.
2. **XState.** `setup({ types: {} as … })` has no cast-free form in XState v5. One override for `*machine.ts` files covers that cast and the file cap; it is T2's written-down exception.
3. **Vendor payloads.** Provider SDK types and generated protocol types own method arguments and responses. Native SDK messages stay typed through the adapter; do not replace them with shadow types or revalidate them in each mapping helper. Production raw transport JSON is decoded once using runtime schemas generated mechanically from the pinned provider's types and a standard validator. A schema that omits required TypeScript fields cannot justify a typed value. Dynamic SDK dictionaries stay unknown until their translated Argo fields pass the canonical Argo schemas. The shared Agent intake checks non-Feed outputs before lifecycle mutation; the Feed checks the completed row after applying its change. Database hydration and tRPC command input remain separate trust boundaries. This supersedes the predicate-per-tool requirement and ADR-0015's allowance for vendor-message casts, while keeping its decision against handwritten vendor schemas and per-adapter machines (owner, 2026-10-08).
4. **React components.** The function cap applies to components; long ones split into named subcomponents and hooks.
5. **Unit and integration tests.** Vitest runs a `unit` project under TS7 (no database, network, clock, filesystem or environment) and an `integration` project under TS4, where the composition, database and git tests keep real SQLite and real git.
6. **Gherkin.** Acceptance criteria in spec issues are written as Given/When/Then. End-to-end tests the owner reads use Scenario Outlines.
7. **Pattern names.** PT1 names apply only where the pattern is unmistakable. "Repository" keeps its `GLOSSARY.md` meaning, a git repository.
8. **Server Components.** A8 is met by ADR-0002: the Server owns the data and the logic beside it. The Expo app stays a bundled UI with no React Server Components, which is the canon's native default.

9. **A2 folder mapping.** The existing folders implement the three tiers (Spec 0006, Owner #9, option (a)); no tier folder is renamed or added for this mapping.

   | Tier | Packages | Inside a package |
   |---|---|---|
   | Local | the apps; each Agent adapter folder | client `screens/` and `components/<feature>/`; Server `services/<domain>/`, `engine/`, `supervisor/` |
   | Product | contracts, db, api, the shared Agent module, git, client | client `feed/`, `trpc/`, `connection/`, `navigation/`; a Server domain's `index.ts` |
   | Generic | machine-log, uniwind, `tooling/*` | client `src/lib/` and the vendored `src/primitives/`; Server `src/lib/` |

   Git is product because Checkout is a `GLOSSARY.md` term (ADR-0008). Shell and Turn have UI homonyms, so their word matches need a person. Switch to `lib/generic/` and `lib/product/` when three or more shared product modules need a home outside the client's four named product folders.

   The accepted exceptions are `millisecondsPerSecond` defined once per package, and the Composer importing the Plan proposal card from `requests/` for its card swap (Spec 0006, Owner #17).

   oxlint enforces the import direction with `no-restricted-imports` blocks in `tooling/oxlint/argo.json`; add a block when a tier folder is added. When to hoist and whether a name belongs to the product stay with code review, as A2 and TA1 leave them.

10. **Thin Session handlers.** A5 permits the Session tRPC procedure to resolve its actor, apply the current admission checks, send one validated event and return the existing acknowledgement (Spec 0008, owner, 2026-10-08). This routing work stays beside the Session domain. Substantive rules, persistence and native lifecycle belong to domain operations and machines; there is no mandatory forwarding service or actor request/reply protocol.

11. **Router type delivery.** The Server owns the one operational tRPC initialization, context, root and domain routers. The App infers procedure inputs and outputs through `import type { AppRouter } from '@repo/server/router'`, derived from that real router (Spec 0008, owner, 2026-10-08). This narrow type dependency is the application of A2/A3: oxlint rejects Server runtime imports and unrelated Server types in App production code. Canonical schemas stay in Contracts. Tests may load the real router; API mocks and the shared runtime-directory entry remain supported without an API-to-Server package cycle. App typechecks and web/native builds prove the type graph and bundle boundary.

Enforcement lands through a spec issue, folder by folder, so CI stays green.

## Considered Options

- Argo's own rules win where they conflict (the first `AGENTS.md` pointer). Rejected: the owner wants the canon applied as written.
- Adapted rule docs (`docs/agents/code-shape.md`, `docs/agents/testing.md`). Removed: they restated the canon in other words and disagreed with it.
