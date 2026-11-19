# Hooks

Claude Code and Codex run one script, `tools/agent-hooks.mts`, from `.claude/settings.json` and `.codex/hooks.json`, in two modes: `after-edit` and `before-stop`. Hooks give early feedback only; the required CI check is the gate.

## What runs

- **After each edit:** oxlint checks the JavaScript and TypeScript files you just edited and reports without rewriting them. Every finding counts, warnings included, except unused imports and variables, because your next edit often adds the use. Fix a finding in your next edit.
- **Before you finish:** when a JavaScript, TypeScript, JSON, JSONC, CSS or YAML file changed, the hook formats changed files with oxfmt, runs type-aware oxlint on changed scripts, and runs `turbo run check-types --affected` if TypeScript changed. A failure blocks your stop once and shows the first lines of output: fix them. The formatter may have rewritten files, so re-read a file before you edit it. A second stop always passes, so report anything you leave failing.
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
- The test files that import a changed file, found by `vitest list --changed`. When more than 40 files depend on a change, verify selects tests under the touched folders. It keeps the changed Story files and at most 40 additional related Story files. Plain tests run first, then the browser tests. A failed static check exits immediately so the agent can fix it before entering the browser queue.

Several agents share this Mac, and under load a test can fail for no fault of its own: a harness test with "Plugin host exited (SIGKILL)", or a worker or test past its timeout. Run each such file again alone, `pnpm exec vitest run <file>` from its package; say in the PR which files you re-ran and how they ended.

When the change touches only paths `verify` does not read (Markdown, for one), it prints `verify: nothing checked.`, names the first paths, and says it is not a pass. It still exits 0, because a docs-only change has nothing to fail; the exit code means no check failed, not that one ran. `verify: nothing changed since <base>.` means the change is empty.

`verify` runs the two Operation gates and the Registry validators check. The other static gates live in `pnpm quality:lint`, which CI runs: `sherif` for workspace versions, then a `tools/check-*.mts` apiece for CanvasKit, rule allowlists (whose one type-aware oxlint run is also the lint gate, warnings included), comments, test suffixes, test-only imports, story titles, story gates and kit pairing, and `jscpd` for duplication. Each reads the tracked files, prints one line per problem, and exits non-zero. The story-title and story-gate checks also read story files git does not track yet, so a new story fails locally as it would in CI once added.

Two of the story gates read what a story draws rather than what it says, so they open a browser: the duplicate-render gate and the parent-may-not-vary-a-child gate. `pnpm check:story-renders` (`tools/check-story-renders.mts`) draws every presentation story once and a candidate pair twice more, which takes about seven minutes on a Mac, over twenty on a CI runner, and holds the browser-suite lock, so it is CI-only — its own `Story render gates` job, in four shards beside the sharded story tests — and not part of `pnpm quality:lint`, which must stay fast enough to run on every change. Both gates compare a file's drawings with each other, never with another file's, so `--shard=<n>/<total>` hands a runner a weighted share of the files and that runner judges its own drawings; no merge step. Run it by hand when you change a story's drawing, and pass a path fragment to narrow it to one file.

CI runs the full suites. Run `pnpm quality` locally only when the owner asks; it holds the browser-suite lock for its whole run ([storybook.md](storybook.md)).

## Measuring verification and PR time

Each local browser request records its arrival, acquisition and release in `~/.cache/argo-browser-suite/47291.log`. At release the suite prints its wait and hold times. Updated Checkouts take turns in arrival order and still share the port with older Checkouts.

From the repository, run `python3 tools/pr-latency.py --since <rollout-time-in-UTC>` to measure the first 100 local browser requests and the first 100 PRs merged to main after rollout. Use the same timestamp on each run. Targets are a browser queue p90 below five minutes and a median open-to-merge below 70 minutes. Incomplete requests appear separately. GitHub provides the merged PRs, changed-file counts, failed workflow links and rerun counts. For each failure, check whether the failing test was deferred locally or caught a later revision.

CI chooses unit-test groups for Plugin-only PRs from Turborepo's affected test tasks. It keeps the full matrix for shared changes, manifest changes, pushes and query failures. Keep a mergeable PR on its tested revision. Update its base when resolving a conflict or when the change needs something newly merged.

## Trust

- Claude Code: accept the workspace trust prompt for the folder.
- Codex: trust the project's `.codex/` folder, then approve both hooks in `/hooks`. Approval is by the hash of the hook entry, so an edit to `.codex/hooks.json` needs a new approval; an edit to `tools/agent-hooks.mts` does not.
- Untrusted hooks do not run; `pnpm verify` and CI still do.

## Changing the hooks

- `.claude/settings.json` and `.codex/hooks.json` hold the same hook body; change both in one PR.
- `tools/agent-hooks.mts` only checks that dependencies are installed; `tools/agent-hook-run.mts` reads its input by shape and names no vendor; `tools/hook-checks.mts` runs the tools.
- Call binaries from `node_modules/.bin` under the repository root, which follows a worktree. Use neither `pnpm exec` nor `CLAUDE_PROJECT_DIR`, which stays on the main checkout.
- Keep knip, Storybook, Vitest, Playwright, jscpd and `pnpm install` out of hooks: they are slow, and knip and Storybook rewrite the generated Storybook requires file.
