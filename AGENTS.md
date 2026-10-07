# Argo Universal

Argo for iOS, Android, web, and macOS: one Expo app, an Electron shell, and a local Server.

## Where things are written down

- Words: `GLOSSARY.md`. Use its terms in code, docs, and messages.
- Decisions: `docs/adr/`. Name any ADR that your change contradicts, and ask before you contradict it.
- Specs: `docs/specs/`. Build a spec as written. When it is unclear or wrong, stop and ask.
- Storybook: before authoring stories or testing UI components, read `docs/agents/storybook.md`.
- Designs: Paper. Before you edit a Paper file or build UI from one, read `docs/agents/paper.md`. It holds until Paper ships component instances.
- Code shape: before you add a function, file or module, or answer the complexity alarm, read `docs/agents/code-shape.md`.
- Tests: before you write or change a test, read `docs/agents/testing.md`.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on this repo, managed with `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default label names: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

One `GLOSSARY.md` and one `docs/adr/` folder at the repo root ("single-context"). See `docs/agents/domain.md`.

## Rules Biome checks

`pnpm quality` fails on each of these. Fix the code; never suppress them.

- In source code, a vendor name (`claude`, `codex`) appears only inside `packages/agents/<agent>/`. Test mocks in `mocks/cli/<agent>/` carry it too. Shared code branches on capabilities that an adapter registers.
- Screens and components get tRPC from `useTRPC()` only: no `@trpc/client`, no tRPC client factory, no `useTRPCClient`.
- Only `packages/db` opens a database client.
- Tests fake outside dependencies at their port, and never `vi.mock` a relative or `@repo/*` module.
- End-to-end tests import no `vitest`, no `node:sqlite` and no `@repo/*` other than mocks. They await every action and never use `waitForTimeout`, `networkidle` or `force`.
- A function over cognitive complexity 25 or with more than four parameters fails. Answer it with `docs/agents/code-shape.md`.

## Rules that no tool checks

- Put all evidence and images in the PR body; upload images with `gh pr create --attach` or `gh pr edit --attach`, never commit them to Git.
- Claude and Codex Sessions draw the same UI. Parity is part of every Session change.
- End-to-end tests mock only the Agent CLI, with mocks in `mocks/cli/<agent>/`.
- Test assets live outside `src/`: `e2e/<flow>/`, `mocks/`, `tools/`. Call them mocks.
- Every XState machine has model-based tests from `xstate/graph` that walk all of its transitions.
- Use full words in names, except domain acronyms and platform-fixed names.
- Name code for what it does (`createTRPCClient`). The product name lives only in app config, environment variables, and UI text, so a rename stays small.
- Validate outside data at its boundary with Zod. Reject, report, and count unrecognised shapes. Before changing an adapter or its CLI mocks, read ADR-0015 and the installed SDK or generated protocol types; use those types for vendor payloads. The Feed checks every adapter change against the contract. Biome enforces the Zod import boundary, and flags a `JSON.parse(…) as` cast outside `packages/agents/<agent>/` and `mocks/cli/<agent>/`.
- Keep comments to one line unless a falsifiable fact needs more.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
