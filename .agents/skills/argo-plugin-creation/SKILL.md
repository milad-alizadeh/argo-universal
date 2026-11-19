---
name: argo-plugin-creation
description: Create or extend an Argo Universal Plugin in an Argo repository checkout. Use for scaffolding Plugins, building their pages or contributions, and validating them with the Plugin test kit.
---

# Create an Argo Plugin

Work in an Argo repository Checkout. The Plugin kit resolves from the workspace. Start with the generated guide for the installed Argo version.

```sh
argo run plugin.guide --wait
argo run plugin.guide --params '{"components":["Screen","List"]}' --wait
```

Request only the components the Plugin uses. If the Operation is unavailable, read `packages/contracts/src/plugins/plugin-blueprint.ts`, the declarations in `packages/plugin-kit/src/`, and the closest first-party Plugin and its tests.

## Build and check

1. Choose the Plugin id and the page, Slot or other contribution that satisfies the brief. For a new Plugin, scaffold once from the active Argo Session.

   ```sh
   argo run plugin.new --params '{"id":"my-plugin"}' --wait
   ```

   Use the returned directory. Run `pnpm --filter @argo/<id> check` on the scaffold before adapting it. For an existing Plugin, work in its current directory.

2. Read the relevant sections of [authoring.md](references/authoring.md). Start with **The Plugin realm**, **Source validation**, and **Plugin tests**. For a service integration use **Declared data** and **Accounts and OAuth**. For a UI contribution use the section named for its surface. Read [assets.md](references/assets.md) when resolving local or remote media.

3. Adapt the nearest working example. Use the Issue tracker for lists, details and Queries, Jira for Boards, and `templates/plugins/github-sign-in` for device sign-in. Declare only the Capabilities and contributions the Plugin needs. Use loaders for reads and pure Render functions for UI. Run `pnpm types` in the Plugin after changing its Operation declarations.

4. Test the user journey with the Plugin harness. Open the page and act through its controls. Stub external services and check the resulting page or Operation outcome. Run `pnpm --filter @argo/<id> check` and `pnpm verify`. When an App is available, inspect the relevant states at desktop and phone widths.

Treat the kit schemas, code and executable tests as authoritative when a reference example differs. Follow ADRs for the decisions behind the APIs.
