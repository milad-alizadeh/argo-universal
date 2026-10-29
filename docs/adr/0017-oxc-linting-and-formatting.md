# OXC linting and formatting

The Prickles pack uses ESLint rules. oxlint runs them, mostly natively and the rest through the pack's own ESLint plugins, so oxlint does all linting and oxfmt all formatting (owner, 2026-10-07). This amends ADR-0001’s lint and format choice and ADR-0015’s adapter import enforcement: oxlint enforces the boundary.

- `.oxlintrc.json` extends two files in `tooling/oxlint/`. `prickles.json` is the pack as `@oxlint/migrate@1.87.0 --type-aware` writes it, with the pack's comments. `argo.json` adds Argo's rules: oxlint's correctness category, the existing lint rules, the import boundaries D1 to D11, the zod and tRPC blocks, ADR-0016's test cap and machine exception, and the `argo` JS plugin, which ports eight GritQL plugins and has RuleTester tests. `unicorn/consistent-function-scoping` and `import/no-nodejs-modules` replace the other two. Argo is stricter than the pack on T2: no `!` and no `as` other than `as const`. `argo.json` also registers [anti-slop](https://github.com/dmmulroy/anti-slop), vendored in `tooling/oxlint/anti-slop/` with its source commit in `UPSTREAM.md`, with every generic rule on except `no-runtime-typeof` (owner, 2026-10-13). `argo.json` extends the kit-styling allowlist.
- `argo/static-imports` rejects runtime `import()` and inline TypeScript `import(...)` types in owned source. Dependencies use top-level static `import` or `import type` declarations (owner, 2026-10-10). Generated files retain their existing exclusions. The Canvas and Orb deferred renderer imports below are owner-approved exceptions.
- The folder waiver list and its checks were removed on 2026-10-29 after all folders met the rules.
- `pnpm quality` runs type-aware oxlint and treats warnings as errors. The kit-styling allowlist check measures that rule without its exception.
- oxlint reports unused disable directives. `tools/check-comments.mts` refuses a directive without exact rule names, or on a cap rule.
- oxfmt uses the owner's style: two spaces, single quotes, 80 columns, imports in one sorted block. It formats JavaScript, TypeScript, JSON, JSONC, CSS and YAML, never Markdown, so the canon files stay verbatim.

Where the pack could not run as written:

- `prettier/prettier` is dropped: oxfmt formats, and `oxfmt --check` gates.
- `import-x/no-restricted-paths` is dropped: oxlint has no such rule, and its zones name `src/lib/generic` and `src/lib/product`. D1 to D11 hold Argo's import directions, and `no-restricted-imports` in `argo.json` guards `@repo/kit` and the client's `lib/product` folder.
- `unicorn/no-for-each`, `unicorn/no-for-loop` and `unicorn/prefer-switch` run from eslint-plugin-unicorn, and `line-comment-position` and `multiline-comment-style` from @stylistic/eslint-plugin, as JS plugins. The sonarjs rules run the same way, without the type information a few of them read under ESLint.
- `import/namespace` and `jsx-a11y/prefer-tag-over-role` are off: oxlint cannot follow the re-exports of `@rn-primitives`, and React Native has no semantic tags.

CSS and JSON have no lint checks. The exact pins are oxlint 1.87.0, oxlint-tsgolint 7.0.2003, @oxlint/plugins 1.87.0, oxfmt 0.72.0, eslint-plugin-sonarjs 4.2.2, eslint-plugin-unicorn 77.0.0, @stylistic/eslint-plugin 5.10.0 and eslint-plugin-playwright 2.12.1. JS plugins are alpha and outside semver, and oxfmt is before 1.0, so an upgrade is its own pull request that shows the lint and format output does not change.

## Ownership moves

Spec 0014 #710 uses `utils/`, `stores/`, `api/` and `types/` for Client feature state. The Connection keeps its tRPC client in `api/trpc/`.
Spec 0011 #437 moves Client source into `features/` and `lib/{product,generic}`. ADR-0016 item 9 defines the tiers.
Spec 0011 #449 moves the Writer into `packages/engine/src/storage/`. That folder imports no module.
Spec 0011 #451 flattens Engine modules and moves Session read models into `sessions/list/`.

Spec 421 groups each component with its platform files, props, styles, stories, mocks and unit tests.
Primitives are grouped by kind. Each primitive folder has an `index.ts` for its public exports.
Code outside a primitive folder imports its public path. oxlint bans deeper paths and relative imports into another folder (owner, 2026-10-14).

## Considered Options

- ESLint with the pack as published. Rejected by the owner for the OXC toolchain, which runs the same rules natively where it can (2026-10-07).
- Rewriting the pack as GritQL plugins. Rejected: a second copy of the pack that drifts from it.

## Canvas deferred renderer

The owner approved Canvas implementation on 2026-10-19 (#836), including ADR-0028's deferred web loading.
`packages/kit/src/primitives/visual/canvas/canvas-loader.web.tsx` may import only `./canvas-renderer` at runtime, after `WithSkiaWeb` initializes CanvasKit.
The lint rule checks both literal paths. It still refuses other runtime imports in that file and Canvas imports elsewhere.

## Orb deferred renderer and ported engine

The owner approved both on 2026-10-22.
`packages/kit/src/primitives/status/orb/orb-loader.web.tsx` may import only `./orb-renderer` at runtime, after `WithSkiaWeb` initializes CanvasKit, under the same check as Canvas.
`packages/kit/src/primitives/status/orb/engine/` is ported line for line from [RareFormLabs/thinking-orbs](https://github.com/RareFormLabs/thinking-orbs) (MIT, licence beside it), so `.oxlintrc.json` and `.jscpd.json` ignore it to keep it diffable against the original. `orb-engine.test.ts`, which is linted, pins its output to the original's frames instead. The rest of the orb folder takes the full rules.
