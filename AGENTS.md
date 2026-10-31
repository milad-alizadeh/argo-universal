# Argo Universal

Argo for iOS, Android, web, and macOS: one Expo app, an Electron shell, and a local Server.

## Where things are written down

- Words: `GLOSSARY.md`. Use its terms in code, docs, and messages.
- Decisions: `docs/adr/`. Ask before contradicting an ADR, and name it.
- Specs: GitHub Issues, as transient briefs; never commit one. Build a spec as written; when it is unclear or wrong, stop and ask.
- Checks: several agents share one Mac, so run the test files you work on, then `pnpm verify` before you hand back. `docs/agents/hooks.md` says what `verify` runs and what is left to CI.
- Storybook: before authoring stories or testing UI components, read `docs/agents/storybook.md`.
- Designs: Storybook owns how built UI looks; Paper is for exploring a design before it is built, and its board is deleted once the design ships. Before drawing in Paper, read `docs/agents/paper.md`.
- Layout: before changing the rail, the content column, the Workbench or the Inspector, read `docs/agents/layout.md`. It holds the regions, the widths they give up in order, and the phone model.
- Android emulator: before booting or driving an Android emulator, read `docs/agents/android-emulator.md`.

## Agent skills

### Issue tracker

GitHub Issues on this repo, via `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default names: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: the root `GLOSSARY.md` and `docs/adr/`. See `docs/agents/domain.md`.

## PR rules

- One round of agent reviews per PR; another only when the user explicitly asks. Follow-up fixes, conflict resolution and CI failures do not start one.
- Put all evidence and images in the PR body; upload images with `gh pr create --attach` or `gh pr edit --attach`, never commit them.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
