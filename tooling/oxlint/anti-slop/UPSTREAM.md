# Vendored anti-slop

Source: [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop), commit `c44ef22` (2026-09-10), MIT (`LICENSE`).

Installed with the repository's own skill, `node skills/install-anti-slop/scripts/install.mjs tooling/oxlint/anti-slop`, which copies `skills/install-anti-slop/assets/anti-slop/`. At this commit those assets are identical to upstream `src/` without its tests. `vendor/eslint-stylistic/` keeps its own `LICENSE` and `UPSTREAM.md`.

Unchanged from upstream: every file in this folder except this record and the root `LICENSE` copy.

Argo's configuration (`../argo.json`):

- The `anti-slop` plugin is registered with every generic rule at `error`, plus `oxc/no-accumulating-spread`, as the install skill enables them.
- `anti-slop/no-runtime-typeof` is off; `argo.json` says why.
- The `anti-slop-effect` plugin is not registered: no package depends on Effect.
- `.oxlintrc.json` and `.oxfmtrc.json` ignore this folder, so it keeps upstream's style and future updates diff cleanly.

To update, follow upstream's `skills/install-anti-slop/references/update.md` against the commit above, then update this record.
