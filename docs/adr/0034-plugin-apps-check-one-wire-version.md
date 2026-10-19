# Plugin Apps check one wire version

This amends [ADR-0031](0031-the-plugin-wire-sends-keyed-patches-and-kit-parts-turn-stable-in-use.md) and [ADR-0027](0027-plugins-act-through-one-api-hook-core-and-replace-named-components.md) (owner, 2026-10-19). ADR-0031 gave every kit part its own version. Each App reported a version per part, and the Server lowered each tree to fit: it stripped props that App did not know and swapped new parts for older ones. ADR-0027 had each App report the wire types it draws. Every rename since then has added a legacy schema, a lowering function and a compatibility test, but no older App exists to need them: Argo has not shipped. The owner's ruling: "delete and we just define a minimum version that's it."

## Decision

- **One wire version and a minimum.** Contracts defines `pluginWireVersion` and `minimumPluginWireVersion`. On connecting, an App sends `{ platform, wireVersion }` as its Plugin surface.
  - An App at or above the minimum gets Plugin trees, checked against the one current schema set.
  - An App that reports no wire version, or one below the minimum, sees "Update Argo to see this" in place of every Plugin page and ordinary Slot. In a Replaceable Slot, core draws its own component.
  - `ctx.surface` keeps `platform` and also shows `wireVersion`. Plugins don't build a tree per part.
- **Each part has one schema.** There are no per-part versions, no legacy schemas and no lowering. The Server still prepares every tree with ADR-0025's rules: unknown leaves are dropped, a container that fails its schema shows "Update Argo to see this", and root-only parts are allowed only at the root. A Replaceable Slot tree is still refused whole when any node fails the current schemas (ADR-0027).
- **After the first release, wire changes are additive.** A new optional prop or a new part does not change the wire version: an older App ignores props it does not know and drops leaves it does not know. A change an older App can't draw, such as a renamed prop, a removed part or a new required prop, bumps the wire version, and bumps the minimum with it.
- **Proposed kit parts can still change.** While a kit part is proposed API (ADR-0031), renaming it or its props changes its one schema. Nothing older needs to be kept.

The design copies VS Code:

- `engines.vscode` is the one minimum an extension states.
- `vscode.d.ts` only ever grows: stable API is never removed or renamed.
- Proposed API can change freely, behind `enabledApiProposals`.
- The Remote server is pinned to the client's commit, so the two always speak the same protocol.

## Considered options

- **Keep per-part versions and lowering**, the Adaptive Cards model. Rejected. Adaptive Cards hosts are apps the card author doesn't control, so every card must fall back on every host. Argo ships both the App and the Server, so one minimum is enough, and the per-part machinery cost a legacy schema and a test for every rename.
- **No version at all.** Rejected. A phone left on an old Argo would draw a newer Server's trees wrong, and the Server would have no way to tell that App to update.
