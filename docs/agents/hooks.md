# Hooks

Claude Code and Codex run one script, `tools/agent-hooks.mts`, from `.claude/settings.json` and `.codex/hooks.json`, in one of two modes: `after-edit` and `before-stop`. Hooks give early feedback only; `pnpm quality` and the required CI check are the gate.

## What runs

- **After each edit:** oxlint checks the JavaScript and TypeScript files you just edited and reports; it never rewrites them. Every finding counts, warnings included, except unused imports and variables, because your next edit often adds the use. A finding comes back to you as feedback: fix it in your next edit.
- **Before you finish:** when a JavaScript, TypeScript, JSON, JSONC, CSS or YAML file changed, the hook formats the changed files with oxfmt, runs oxlint with type-aware rules on the changed scripts, and runs `turbo run check-types --affected` if TypeScript changed. A failure blocks your stop once and shows the first lines of output: fix them. The formatter may have rewritten files, so read a file again before you edit it. A second stop always passes, so report anything you leave failing.
- A finding in a folder that `tooling/oxlint/not-yet-cleared.json` lists is off for that folder; never add a folder or a rule to that list, fix the code.
- Run `node tools/not-yet-cleared.mts prune` after clearing a folder or rule; it removes stale waivers and empty entries.
- Hooks run no tests. Run the Vitest, Storybook or Playwright tests your change touches yourself, and `pnpm quality` before you hand back.

## Trust

- Claude Code: accept the workspace trust prompt for the folder.
- Codex: trust the project's `.codex/` folder, then approve both hooks in `/hooks`. Approval is by the hash of the hook entry, so an edit to `.codex/hooks.json` needs a new approval; an edit to `tools/agent-hooks.mts` does not.
- Untrusted hooks do not run; `pnpm quality` still does.

## Changing the hooks

- `.claude/settings.json` and `.codex/hooks.json` hold the same hook body. Change both in one PR.
- `tools/agent-hooks.mts` reads its input by shape and names no vendor; `tools/hook-checks.mts` runs the tools.
- Call binaries from `node_modules/.bin` under the repository root, which follows a worktree. Use neither `pnpm exec` nor `CLAUDE_PROJECT_DIR`, which stays on the main checkout.
- Keep knip, Storybook, Vitest, Playwright, jscpd and `pnpm install` out of hooks: they are slow, and knip and Storybook rewrite the generated Storybook requires file.
