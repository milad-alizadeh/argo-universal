# Argo Universal

Argo for iOS, Android, web, and macOS: one Expo app, an Electron shell, and a local Server.

## Where things are written down

- Words: `GLOSSARY.md`. Use its terms in code, docs, and messages.
- Decisions: `docs/adr/`. Name any ADR that your change contradicts, and ask before you contradict it.
- Specs: GitHub Issues, as transient briefs for implementation; never commit one. Build a spec as written. When it is unclear or wrong, stop and ask.
- Tests: before adding, changing or auditing tests, fixtures or test wrappers, read `docs/agents/testing-seams.md`.
- Storybook: before authoring stories or testing UI components, read `docs/agents/storybook.md`.
- Designs: every new UI or visible state needs a Paper design. Before changing UI or editing Paper, read `docs/agents/paper.md` and identify its design source.
- Prickles: before you write or review code, read the pillar files in `docs/agents/prickles/`, the Prickles canon v2.0 verbatim (https://prickles.org, CC BY-NC 4.0). It wins over everything else here; ADR-0016 records how it applies where it cannot as written.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on this repo, managed with `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default label names: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

One `GLOSSARY.md` and one `docs/adr/` folder at the repo root ("single-context"). See `docs/agents/domain.md`.

## Rules that no tool checks

- Put all evidence and images in the PR body; upload images with `gh pr create --attach` or `gh pr edit --attach`, never commit them to Git.
- Claude and Codex Sessions draw the same UI. Parity is part of every Session change.
- Screens take controls from Argo's primitives only, never from `@expo/ui` or `@rn-primitives`. System controls draw natively on iOS and Android; content Argo draws stays React Native views with Uniwind (ADR-0020).
- Use LegendList (`@legendapp/list/react-native`) by default for lists in the App.
- Test assets live outside `src/`: `e2e/<flow>/`, `mocks/`, `tools/`. Call them mocks.
- Every XState machine has model-based tests from `xstate/graph` that walk all of its transitions.
- The product name lives only in app config, environment variables and UI text, so a rename stays small. The Session branch prefix in `packages/git` is stored data and stays as it is.
- Reject, report and count unrecognised outside data. Before changing an adapter or its response mocks, read ADR-0015 and the installed SDK or generated protocol types.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
