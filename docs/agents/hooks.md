# Hooks

Claude Code and Codex run one script, `tools/agent-hooks.mts`, from `.claude/settings.json` and `.codex/hooks.json`, in two modes: `after-edit` and `before-stop`. Hooks give early feedback only; the required CI check is the gate.

## What runs

- **After each edit:** oxlint checks the JavaScript and TypeScript files you just edited with oxlint's native rules only and reports without rewriting them. The JS plugins (sonarjs, unicorn's JS rules, stylistic, anti-slop, Argo's own and Playwright's) took over a second to load on every edit, so `tools/hook-native-config.mts` copies the config without them to `.oxlintrc.native.json`, beside `.oxlintrc.json` so override globs still match, and rebuilds it when a config changes; before-stop and verify run them all. Every finding counts, warnings included, except unused imports and variables, because your next edit often adds the use. Fix a finding in your next edit.
- **Before you finish:** when a JavaScript, TypeScript, JSON, JSONC, CSS or YAML file changed, the hook formats changed files with oxfmt, then runs type-aware oxlint on changed scripts and, if TypeScript changed, `turbo run check-types --affected`, side by side. A tree that already passed exits at once: before-stop and `pnpm verify` record a fingerprint of `HEAD`, `git diff HEAD` and each untracked file's path and modification time in the worktree's `.git/argo-checks-passed` (`tools/verify-stamp.mts`) when their checks pass, and the next stop with the same fingerprint skips every check. A failure blocks your stop once and shows the first lines of output: fix them. The formatter may have rewritten files, so re-read a file before you edit it. A second stop always passes, so report anything you leave failing.
- In a Checkout without `node_modules`, such as an Argo Session worktree, both hooks pass quietly.
- Hooks run no tests. Run the test files you work on yourself, and `pnpm verify` before you hand back.

## Verify

`pnpm verify` (`tools/verify.mts`) checks the change since the merge base with the branch's base, uncommitted files included, and first prints which base it chose. The base is, in order:

1. The ref you pass with `pnpm verify --base <ref>` or `VERIFY_BASE=<ref>`, as given, then as `origin/<ref>`. It fails when neither has a merge base with `HEAD`.
2. The open PR's base branch, read with `gh api`, as `origin/<base>`, then the local `<base>`. A stacked PR therefore checks only its own commits, not the unmerged PRs beneath it.
3. `origin/main`, then `main`, then `HEAD` in a checkout with no main, which checks only uncommitted files.

The lookup finds no PR before you open one, on a detached `HEAD`, for a PR from a fork, or when `gh` is offline or signed out; verify then says `no open PR found` beside the base. On a stacked branch with no PR yet, pass `--base` with the lower branch. Turbo's `--affected` type checks use the same base, through `TURBO_SCM_BASE`.

- The Operation mutation gate, the generated Operation procedures check and the generated Registry validators check. A new hand-written tRPC mutation must become an Operation.
- oxfmt `--check` and type-aware oxlint on the changed files, and `turbo run check-types --affected` when TypeScript changed.
- The test files that import a changed file, found by `vitest list --changed`. Past `DEPENDENT_LIMIT` in `tools/verify-scope.mts` (a primitive's edit reaches most story files; a `package.json` or Vitest config edit reaches every test), it runs only those in the touched folders and below, and says how many it left to CI.

Several agents share this Mac, and under load a test can fail for no fault of its own: a harness test with "Plugin host exited (SIGKILL)", or a worker or test past its timeout. Run each such file again alone, `pnpm exec vitest run <file>` from its package; say in the PR which files you re-ran and how they ended.

When the change touches only paths `verify` does not read (Markdown, for one), it prints `verify: nothing checked.`, names the first paths, and says it is not a pass. It still exits 0, because a docs-only change has nothing to fail; the exit code means no check failed, not that one ran. `verify: nothing changed since <base>.` means the change is empty.

`verify` runs the two Operation gates and the Registry validators check. The other static gates live in `pnpm quality:lint`: `sherif` for workspace versions, then a `tools/check-*.mts` apiece for CanvasKit, rule allowlists (whose one type-aware oxlint run is also the lint gate, warnings included), comments, test suffixes, test-only imports, story titles, story gates and kit pairing, and `jscpd` for duplication. Each reads the tracked files, prints one line per problem, and exits non-zero. The story-title and story-gate checks also read story files git does not track yet, so a new story fails locally as it would in CI once added.

Two of the story gates read what a story draws rather than what it says, so they open a browser: the duplicate-render gate and the parent-may-not-vary-a-child gate. `pnpm check:story-renders` (`tools/check-story-renders.mts`) draws every presentation story once and a candidate pair twice more, which takes about seven minutes on a Mac, over twenty on a CI runner, and holds the browser-suite lock, so it is CI-only — its own `Story render gates` job, in four shards beside the sharded story tests — and not part of `pnpm quality:lint`, which must stay fast enough to run on every change. Both gates compare a file's drawings with each other, never with another file's, so `--shard=<n>/<total>` hands a runner a weighted share of the files and that runner judges its own drawings; no merge step. On a pull request the job passes `--changed=<base commit>`, and the gate draws only the presentation files whose imports reach the change, which `vitest list --changed` names from the module graph; a change to the Storybook app, `tooling/`, a `package.json`, the lockfile, a stylesheet or the gate's own files draws every one, and a change that reaches none passes without opening a browser. A push to main or `release/*` draws every file. Run it by hand when you change a story's drawing, with `--changed=origin/main` for what CI will draw or a path fragment to narrow it to one file.

## CI

`.github/workflows/ci.yml` chooses its jobs from the change: a pull request's since its base, a push's since the commit before it. A push that starts a branch or rewrote history, and the nightly run at 03:00 UTC, run every job. Turbo cannot see root files, `.github/` or `patches/`, so one of those changing runs the Engine, story and web e2e jobs too, except the configs only Quality reads: `.oxlintrc.json`, `.oxfmtrc.json`, `.jscpd*.json`, `knip.jsonc`, `skills-lock.json` and `.gitignore`.

- **Quality** runs each `quality:lint` gate as its own step, each after a failed one too, so one run names every failing gate. It leaves out `sherif`, which the install's postinstall already ran, and the CanvasKit check, which cannot fail after the install copies CanvasKit. Then dead code, the Plugin reference docs, the Plugin generation check (only when `turbo.json`, the generator, `tools/plugin-typecheck.mts` or the check changes), and `git status --porcelain` for generated files. **Type checks** are their own job.
- **Unit tests** run each package's Vitest projects on every core, one package at a time. A package lists the files that measure time, such as the Feed workload's event-loop delay or plugin-kit's Hook budgets, as `budget` in `createNodeTestProjects` (`tooling/vitest/node.ts`); they run in a `budget` project with one worker after the rest. **Engine tests** run in two shards.
- **Secret store contract** runs on macOS only when the keyring adapter, the lockfile or the workflow changes, and nightly.
- **Web e2e** builds @repo/e2e's dependencies once into the Remote Cache, then runs six shards against it; the HTML report is merged only when a shard failed. The Electron e2e runs on main, `release/*` and nightly, and the `@mac-only` Electron scenarios run nightly on a macOS runner.

CI runs the full suites. Run `pnpm quality` locally only when the owner asks; it holds the browser-suite lock for its whole run ([storybook.md](storybook.md)).

## Trust

- Claude Code: accept the workspace trust prompt for the folder.
- Codex: trust the project's `.codex/` folder, then approve both hooks in `/hooks`. Approval is by the hash of the hook entry, so an edit to `.codex/hooks.json` needs a new approval; an edit to `tools/agent-hooks.mts` does not.
- Untrusted hooks do not run; `pnpm verify` and CI still do.

## Changing the hooks

- `.claude/settings.json` and `.codex/hooks.json` hold the same hook body; change both in one PR.
- `tools/agent-hooks.mts` only checks that dependencies are installed, then starts `agent-hook-run.mts` as a second Node process. That costs under a tenth of a second; importing it instead would need a runtime `import()`, which `argo/static-imports` refuses (ADR-0017), and a static import crashes before the check in a Checkout without dependencies (#580).
- `tools/agent-hook-run.mts` reads its input by shape and names no vendor; `tools/hook-checks.mts` runs the tools.
- Call binaries from `node_modules/.bin` under the repository root, which follows a worktree. Use neither `pnpm exec` nor `CLAUDE_PROJECT_DIR`, which stays on the main checkout.
- Keep knip, Storybook, Vitest, Playwright, jscpd and `pnpm install` out of hooks: they are slow, and knip and Storybook rewrite the generated Storybook requires file.
