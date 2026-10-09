# OXC replaces Biome

Biome could not run the Prickles pack, whose rules are ESLint rules. oxlint runs them, mostly natively and the rest through the pack's own ESLint plugins, so oxlint does all linting and oxfmt all formatting (owner, 2026-10-07). This amends ADR-0001, where Biome did lint and format, and the parts of ADR-0015 where Biome enforces the adapter import boundary: oxlint enforces it now.

- `.oxlintrc.json` extends three files in `tooling/oxlint/`. `prickles.json` is the pack as `@oxlint/migrate@1.87.0 --type-aware` writes it, with the pack's comments. `argo.json` adds Argo's rules: oxlint's correctness category, the rules Biome enforced, the import boundaries D1 to D11, the zod and tRPC blocks, ADR-0016's test and machine caps, and the `argo` JS plugin, which ports eight GritQL plugins and has RuleTester tests. `unicorn/consistent-function-scoping` and `import/no-nodejs-modules` replace the other two. Argo is stricter than the pack on T2: no `!` and no `as` other than `as const`. `not-yet-cleared.json` comes last.
- `not-yet-cleared.json` is how ADR-0016's folder-by-folder enforcement lands. Generated from a type-aware oxlint run, it turns off, for the files directly in one folder, only the rules that folder still breaks. Its historical waiver identities and rule sets only shrink; a cap never changes to fit the code. The approved ownership moves below preserve those identities through exact path relocations.
- `pnpm quality` runs `oxfmt --check`, `oxlint --type-aware --deny-warnings`, then `node tools/not-yet-cleared.mts check`, which checks that historical waiver identities and rules only shrink against the merge base with `origin/main` and still have findings; type-aware rules run through oxlint-tsgolint. oxlint reports unused disable directives, and `tools/check-comments.mts` refuses a directive without exact rule names, or on a cap rule.
- oxfmt keeps Biome's style: two spaces, single quotes, 80 columns, imports in one sorted block. It formats JavaScript, TypeScript, JSON, JSONC, CSS and YAML, never Markdown, so the canon files stay verbatim.

Where the pack could not run as written:

- `prettier/prettier` is dropped: oxfmt formats, and `oxfmt --check` gates.
- `import-x/no-restricted-paths` is dropped: oxlint has no such rule, and its zones name `src/lib/generic` and `src/lib/product`, which Argo does not have. D1 to D11 hold Argo's import directions.
- `unicorn/no-for-each`, `unicorn/no-for-loop` and `unicorn/prefer-switch` run from eslint-plugin-unicorn, and `line-comment-position` and `multiline-comment-style` from @stylistic/eslint-plugin, as JS plugins. The sonarjs rules run the same way, without the type information a few of them read under ESLint.
- `import/namespace` and `jsx-a11y/prefer-tag-over-role` are off: oxlint cannot follow the re-exports of `@rn-primitives`, and React Native has no semantic tags.

Biome also linted CSS and JSON, and nothing does now. The exact pins are oxlint 1.87.0, oxlint-tsgolint 7.0.2003, @oxlint/plugins 1.87.0, oxfmt 0.72.0, eslint-plugin-sonarjs 4.2.2, eslint-plugin-unicorn 77.0.0, @stylistic/eslint-plugin 5.10.0 and eslint-plugin-playwright 2.12.1. JS plugins are alpha and outside semver, and oxfmt is before 1.0, so an upgrade is its own pull request that shows the lint and format output does not change.

## Engine package extraction

The owner approved relocating existing Engine debt while separating `packages/engine` from the deployable `apps/server` (Spec 0008 #315, 2026-10-09): “Ok move them for now we’ll get back to them.” The guard recognizes only these nine exact old/new paths as the same historical identity:

| Original folder entry | Engine folder entry |
|---|---|
| `apps/server/mocks/*` | `packages/engine/mocks/*` |
| `apps/server/src/engine/*` | `packages/engine/src/engine/*` |
| `apps/server/src/services/*` | `packages/engine/src/services/*` |
| `apps/server/src/services/agents/*` | `packages/engine/src/services/agents/*` |
| `apps/server/src/services/blob/*` | `packages/engine/src/services/blob/*` |
| `apps/server/src/services/feed/*` | `packages/engine/src/services/feed/*` |
| `apps/server/src/services/projects/*` | `packages/engine/src/services/projects/*` |
| `apps/server/src/services/sessions/*` | `packages/engine/src/services/sessions/*` |
| `apps/server/src/services/system/*` | `packages/engine/src/services/system/*` |

Each rule set stays identical or shrinks. Simultaneous old/new entries, duplicate historical identities, added rules and unlisted or broadened globs are rejected. No generic rename escape exists; Supervisor debt remains at its app path. Existing stale-rule check and prune still apply. Retained process bootstraps pass without these waivers. Relocated debt is not clearance or code reduction; remaining burn-down tickets still own it. Prickles rules, caps and comment restrictions stay unchanged.

## App mocks ownership move

Spec 0009 #347 moves the unchanged App mocks from `packages/api/mocks` to the existing shared mocks package at `mocks/app` (owner, 2026-10-09). The orchestrator approved preserving this exact historical waiver identity during the move:

| Original folder entry | Shared mocks folder entry |
|---|---|
| `packages/api/mocks/*` | `mocks/app/*` |

Only the existing `complexity`, `max-lines` and `max-lines-per-function` rules remain waived. The original one-folder scope stays identical. The guard rejects duplicate aliases, added rules and broader or unlisted globs. Its existing stale-rule check and prune still apply.

## Considered Options

- ESLint with the pack as published. Rejected by the owner for the OXC toolchain, which runs the same rules natively where it can (2026-10-07).
- Biome with the pack's rules rewritten as GritQL plugins. Rejected: a second copy of the pack that drifts from it.
