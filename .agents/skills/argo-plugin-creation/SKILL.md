---
name: argo-plugin-creation
description: Create or extend an Argo Universal Plugin in an Argo repository checkout. Use for scaffolding Plugins, building their pages or contributions, and validating them with the Plugin test kit.
---

# Create an Argo Plugin

Use an Argo repository checkout. The Plugin kit resolves from the pnpm workspace. Follow the checkout's `AGENTS.md`. Use code and executable tests for behavior and ADRs for decision rationale.

## Scaffold

Run `argo run plugin.guide --wait` for the blueprint and component index. Request the props of the components you plan to use with `argo run plugin.guide --params '{"components":["Screen","List"]}' --wait`. If Argo is unavailable or the installed version differs from the checkout, use `packages/contracts/src/plugins/plugin-blueprint.ts`, the kit declarations in `packages/plugin-kit/src/`, and the examples below.

For a new Plugin, choose an unused id starting with a lower-case letter and containing only lower-case letters, digits and dashes. From the active Session run:

```sh
argo run plugin.new --params '{"id":"my-plugin"}' --wait
```

The Operation writes to the calling Session's Checkout. Supply `sessionId` when calling outside a Session to target a specific writable Session. Use the returned `directory` and run `pnpm install` from that checkout's root to link the new package and generate the kit declarations. When no Argo Session is available, use the repository [template fallback](references/authoring.md#scaffold-without-a-session). An existing Plugin starts in its current directory.

Proceed when the scaffold's `pnpm --filter @argo/<id> check` passes. Keep the lockfile changes for the new workspace package.

## Build

Start from the closest executable example. Open only the reference sections needed for the brief.

| Need | Example and reference |
| --- | --- |
| Pages, navigation, lists and details | `plugins/issue-tracker/` and [Page frames](references/authoring.md#page-frames) |
| Boards and card moves | `plugins/jira/issue-board.tsx` and [Boards](references/authoring.md#boards) |
| Reads, writes and shared data | `plugins/issue-tracker/github-reads.ts`, [Declared data](references/authoring.md#declared-data) and [Operations](references/authoring.md#operations) |
| Data that survives a worker restart | [Plugin storage](references/authoring.md#plugin-storage) |
| Slot or Hook contributions | [Session Workbench card](references/authoring.md#session-workbench-card), the relevant Session surface section, or [Hooks](references/authoring.md#hooks) |
| Service sign-in | `templates/plugins/github-sign-in/` for device flow and [Accounts and OAuth](references/authoring.md#accounts-and-oauth) for other flows |
| Local or remote media | [Plugin assets](references/assets.md) |

The manifest declares what the Plugin contributes and which Capabilities it needs. Register the matching handlers in the entrypoint. Put reads in loaders and draw through pure Render functions using the kit's action values. For runtime restrictions, see [The Plugin realm](references/authoring.md#the-plugin-realm). After editing the manifest's Operations, run `pnpm types` in the Plugin and keep the generated declaration changes. Finish when the requested contribution works through its normal entry point and the sample notes page, Operation and tests have been adapted or removed.

## Verify

Use the [Plugin harness](references/authoring.md#plugin-tests) to exercise the requested user journey. Open the page or contribution, perform the action, and assert the visible result or Operation outcome. Stub external services. Cover applicable empty, failure and signed-out paths.

Run the Plugin's check script and `pnpm verify`. If the App is available, [load the development Plugin](references/authoring.md#dev-reload) and check the affected states at desktop and phone widths. Report which checks ran and any App verification that was unavailable.
