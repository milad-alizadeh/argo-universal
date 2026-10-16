# Plugins act through one API, hook core behaviour and replace named components

This amends [ADR-0025](0025-plugins-run-on-the-server-and-draw-argo-components.md) (owner, 2026-10-16, Spec 0016 #725). ADR-0025 lets Plugins use Node directly, fill declared Slots and nothing else, and leaves Plugin authoring by Agents out of scope. Claude Code's plugins, which change Claude's own app through function hooks, show a model that is safer for the Server and lets Plugins change behaviour as well as add UI. The owner's rule still holds: copy it, don't invent. [ADR-0030](0030-plugins-get-only-the-capabilities-their-manifest-declares.md) (owner, 2026-10-16) amends this: the Server checks every `argo` call against the Capabilities the manifest declares. Everything below starts as proposed API, as ADR-0025 says, and becomes stable once the Issue tracker and Atlas both use it.

## Decision

- **Plugins reach the machine only through `argo`.** Plugin code runs in its worker with no `require`, `process`, `fs` or other Node globals. Its entry exports `register(argo)`, and `argo` is the only way out:
  - `argo.fs`: read, write, list and stat files;
  - `argo.process.run` and `argo.process.spawn`: run a command by argv, never through a shell;
  - `argo.fetch`: HTTP requests;
  - `argo.projects`, `argo.storage`, `argo.secrets`, `argo.settings`: ADR-0025's API, unchanged;
  - `argo.ui`: toasts and opening the Plugin's pages.

  The Server caps each call (read size, output size, timeout), logs it with the Plugin's id, and kills a Plugin's child processes and timers when the Plugin reloads, is turned off or crashes. Copied from Claude Code, whose plugins have no Node and reach everything through `$`. This replaces ADR-0025's "Plugins may use Node directly". ADR-0030 adds the permission list: Capabilities in the manifest, checked on every call.
- **Hooks change core behaviour.** `argo.on(event, matcher?, hook)` adds a hook, and every hook is `(ctx, e, next)`. Hooks on one event form a middleware chain over core's own behaviour:
  - `next(e)` runs the hooks beneath and then core, and resolves to the result;
  - `next({ ...e, ... })` rewrites what the rest of the chain sees, within what the event allows;
  - returning without `next` answers for core.

  The first events are `session.start`, `prompt.submit` (before the prompt reaches the Agent), `tool.call` (when the Agent asks for a Permission request, ADR-0006), `turn.complete` (after ADR-0024 settles the Turn) and `process.spawn` (every `argo.process` call, so a Plugin can watch or block other Plugins' commands; ADR-0030 makes this a Capability). Hooks run in worker order, first-party Plugins first. A hook that throws, answers the wrong shape or misses its time budget is skipped and core goes on; a hook that guards declares a handler that refuses instead. Copied from Claude Code's hook chain and VS Code's `onWill*` events.
- **Some core components can be replaced.** A Replaceable Slot is a Slot placed around a core component instead of beside it. Its frozen context carries the props core would draw it with. A Plugin's `ui.render` hook on that Slot can:
  - pass it through with `next(e)`, and core draws its own;
  - rewrite its props with `next({ ...e, props })`, and core draws its own with them;
  - return a tree of kit components, drawn in its place.

  When the tree is refused or throws while drawing, core draws its own at that one place, and the Server logs one line naming the Plugin, the Slot and the reason. A broken Plugin can never blank a core page. The first Replaceable Slots are `argo/feed/tool-call/v1`, `argo/feed/message/v1` and `argo/composer/above/v1`. Copied from Claude Code's `ui.render` on named components with its engine fallback. This widens ADR-0025's "Slots in core pages", which only adds content.
- **Each App says which kit components it draws.** On connecting, an App sends the list of wire types its registry draws. A hook sees that list in `ctx.surface` and builds its tree from it. In a Replaceable Slot, a tree with a type the App lacks is refused whole and core draws its own. Pages and ordinary Slots keep ADR-0025's rule: unknown leaves are dropped and an unknown container shows "Update Argo to see this". Copied from Claude Code's per-surface element sets.
- **Plugins can be written and checked by an Agent.** Argo ships three tools:
  - `argo plugin validate <dir>` reads the manifest and entry as the loader will, and reports the hooks, `argo` calls and Slots it uses and everything the Server would refuse;
  - `argo plugin test <dir>` runs a Plugin's tests against a test kit with a fake clock, storage, settings and Session. `mount({ slot | page, surface })` draws a Plugin tree for a chosen App, with `find` and `press`;
  - a dev Plugin hot-reloads when the Agent Turn that edited it ends, instead of on every file change.

  Copied from Claude Code's `plugin validate`, `plugin test` and its testing kit.

## Considered options

- **Keep Node in the worker and add hooks only.** Rejected: the Server could not log, cap or stop what a Plugin does, and a policy Plugin could not see other Plugins' commands.
- **A permission list in the manifest now,** as browser extensions have. Rejected for v1: first-party Plugins are trusted, and `argo` is what makes a later permission list possible. Superseded by ADR-0030.
- **Let any core component be replaced.** Rejected: only named, versioned Replaceable Slots can be kept stable, and core pages must keep their layout.
- **Drop unknown types inside a Replaceable Slot,** as ADR-0025 does for pages. Rejected: half of a replaced tool call is worse than core's own.
- **Hot reload on every file change for Agent-written Plugins.** Rejected: an Agent writes several files per Turn, and reloading between them loads a broken Plugin.
