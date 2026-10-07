# Hooks

Claude Code and Codex run one script, `tools/agent-hooks.mts`, from `.claude/settings.json` and `.codex/hooks.json`. Hooks give early feedback only; `pnpm quality` and the required CI check are the gate.

## What runs

- **After each edit:** Biome checks the files you just edited and reports; it never rewrites them. Unused imports and variables are skipped, because your next edit often adds the use. A finding comes back to you as feedback: fix it in your next edit.
- **Before you finish:** when a `.ts`, `.tsx`, `.mts`, `.mjs`, `.json` or `.jsonc` file changed, the hook formats the changed files, runs the full Biome check on them, and runs `turbo run check-types --affected` if TypeScript changed. A failure blocks your stop once and shows the first lines of output: fix them. The formatter may have rewritten files, so read a file again before you edit it. A second stop always passes, so report anything you leave failing.
- Hooks run no tests. Run the Vitest, Storybook or Playwright tests your change touches yourself, and `pnpm quality` before you hand back.

## Trust

- Claude Code: accept the workspace trust prompt for the folder.
- Codex: trust the project's `.codex/` folder, then approve both hooks in `/hooks`. Approval is by the hash of the hook entry, so an edit to `.codex/hooks.json` needs a new approval; an edit to `tools/agent-hooks.mts` does not.
- Untrusted hooks do not run; `pnpm quality` still does.

## Changing the hooks

- `.claude/settings.json` and `.codex/hooks.json` hold the same hook body. Change both in one PR.
- `tools/agent-hooks.mts` reads its input by shape and names no vendor.
- Call binaries from `node_modules/.bin` under the repository root, which follows a worktree. Use neither `pnpm exec` nor `CLAUDE_PROJECT_DIR`, which stays on the main checkout.
- Keep knip, Storybook, Vitest, Playwright, jscpd and `pnpm install` out of hooks: they are slow, and knip and Storybook rewrite the generated Storybook requires file.
