# Hooks

Claude Code and Codex run one script, `tools/agent-hooks.mts`, from `.claude/settings.json` and `.codex/hooks.json`, in two modes: `after-edit` and `before-stop`. Hooks give early feedback only; the required CI check is the gate.

If the stop hook reports a problem, reread the changed files before editing. The hook may have formatted them.

## Verify

Run the relevant test files, then `pnpm verify`. For a stacked branch without a PR, use `pnpm verify --base <lower-branch>`.

Rerun a test alone if the shared Mac times out a worker or kills a Plugin host. Record the rerun result in the PR. Run `pnpm quality` locally only when the owner asks because it holds the browser suite lock.

Read `tools/verify.mts` and its tests for verification behavior. The CI workflows declare the checks that run on GitHub.

## Trust

- Claude Code: accept the workspace trust prompt for the folder.
- Codex: trust the project's `.codex/` folder, then approve both hooks in `/hooks`. Approval is by the hash of the hook entry, so an edit to `.codex/hooks.json` needs a new approval; an edit to `tools/agent-hooks.mts` does not.
- Untrusted hooks do not run; `pnpm verify` and CI still do.

## Changing the hooks

- `.claude/settings.json` and `.codex/hooks.json` hold the same hook body; change both in one PR.
- Call binaries from `node_modules/.bin` under the repository root, which follows a worktree. Use neither `pnpm exec` nor `CLAUDE_PROJECT_DIR`, which stays on the main checkout.
- Keep knip, Storybook, Vitest, Playwright, jscpd and `pnpm install` out of hooks: they are slow, and knip and Storybook rewrite the generated Storybook requires file.
