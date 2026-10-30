# The Plugin wire sends keyed patches, and kit components turn stable once used

This amends [ADR-0025](0025-plugins-run-on-the-server-and-draw-argo-components.md) and [ADR-0027](0027-plugins-act-through-one-api-hook-core-and-replace-named-components.md), and builds on [ADR-0028](0028-plugins-draw-svg-charts-and-canvases-on-every-app.md) and [ADR-0030](0030-plugins-get-only-the-capabilities-their-manifest-declares.md) (Spec 0017 #959). Spec 0017 opens the whole UI kit to Plugins: lists, grids, tables, forms, media. A council review (Plugin authors, native platforms, wire protocol, design system) found that today's wire cannot carry it:

- the diff matches children by position, so adding one row resends the whole list;
- the App never draws `slots`, and a slot keeps only its first node;
- event ids are paths, and handlers are replaced on every commit, so a tap made just before a reorder can run another row's handler;
- every App shares one view per Plugin page, so a search typed on a phone filters the desktop;
- the schemas live in the App, so the Server can't validate a tree and Plugin JSX has no types;
- a new optional prop fails an older App's strict schema, and the node silently vanishes;
- a Plugin image would be fetched by the App from the Plugin's host, leaking the user's IP address, which ADR-0028 refuses for `Svg`.

ADR-0025's stability rule also blocks the spec: a kit component turns stable only once the Issue tracker and Atlas both use it, and Atlas will never use a DatePicker, Video or Table. The fixes below copy Shopify remote-dom, Phoenix LiveView, Raycast, Adaptive Cards and VS Code.

[ADR-0034](0034-plugin-apps-check-one-wire-version.md) (owner, 2026-10-19) amends this: per-kit-component versions and lowering are gone, and each App reports one Plugin wire version, which the Server checks against a minimum.

## Decision

- **Lists are expanded on the Server.** Plugin JSX lists (List and Table) take `items` and `renderItem`, as Argo's own kit does. The Plugin kit runs `renderItem` in the worker and sends keyed children; no function ever crosses the wire. Every child of a list needs a `key`, and a list child without one is refused with one log line naming the Plugin. Copied from Raycast, whose `List.Item`s are children, not templates.
- **Patches are keyed.** Children are matched by `key`, falling back to position only where a parent has no keyed children. A patch is a list of ops:
  - `insert` (parent, index, node), `remove` (key), `move` (key, parent, index);
  - `setProps` (key, changed props only);
  - `replace` (key, node), only when a node's type changes.

  Adding, removing or moving one row sends one op. Copied from remote-dom's mutation records and LiveView streams.
- **Commits are coalesced and capped.** The worker sends at most one patch per frame per view. Each message and each page's tree have size caps, set in #983 from measurement and checked on the Server. A message over the cap is refused and logged, and the page shows its fallback. These caps sit above the per-kit-component caps of ADR-0028.
- **The App draws slots.** A slot holds any number of nodes, in order. A prop whose value is an element or an array of elements (`leading`, `media`, `accessories`) becomes a slot of that name. This replaces today's "first node only".
- **Taps name the node, not the path.** A dispatch carries `{ pluginId, path, revision, key, event, payload }`.
  - The Server looks the handler up by the node's `key` and event name in the view's current revision.
  - When that node no longer exists, the tap is refused, never run on another row.
  - `payload` is typed per event by the kit component's schema, for example `onChangeText: string` or `onSelectionChange: string[]`. The App and the Server both check it against that schema.
  - A node's key and the event name are the whole address; there are no nested paths inside a node. Kit components with several tappable entries, such as SplitButton, take them as keyed `Action` children. Amended by the owner on 2026-10-19 (#1052).
  - Dispatch returns when the handler settles: `ok`, or an error the App shows as an error toast. Pending states wait for it. A Switch or Checkbox flips at once and reverts when the handler fails.
- **Views belong to a Connection.** The Server keeps one view per Connection, Plugin and page, so each App renders its own tree. That makes ADR-0027's `ctx.surface` work per App: a tree is built for that App's platform. UI state is the App's own: search text, selection, scroll position, open or closed, and input drafts. The Plugin hears it only through events it opts into:
  - throttled `onSearchTextChange` (otherwise the App filters the list itself);
  - `onSelectionChange`;
  - a field's throttled `onChange`;
  - a Form's submit, which sends every field's value;
  - `onOpenChange` on Alert, Dialog, Sheet, Popover and Collapsible, which never blocks the App.

  Plugin overlays are ordinary tree nodes whose open state the App owns, not a separate wire action: there is no imperative alert, dialog or sheet call. Amended by the owner on 2026-10-19 (#1052). The Server never overwrites a field that has focus. Copied from Raycast's built-in filtering and `onSearchTextChange`, and LiveView's `phx-debounce`.
- **The schemas live in Contracts.** Every Plugin-tier kit component has one schema in Contracts: its props, Slots and what each Slot accepts, and its events with their payloads.
  - The Server validates each tree before sending it, using ADR-0025's rules for pages and ordinary Slots and ADR-0027's for Replaceable Slots.
  - Plugin JSX types are generated from the schemas, so a wrong prop fails in the author's editor, and `argo plugin validate` (#824) checks trees with them.
  - The schema is the only definition of a kit component's Plugin-facing props, including each prop's description. The kit component's props type is derived from it: one mapped type in the client turns events into callbacks and Slots into React nodes, and a component adds its kit-only props (such as ListItem's `accessory`) by intersection. Changing a Plugin-facing prop means changing the schema; there is nothing to keep in step. Amended by the owner on 2026-10-18.
  - Plugin JSX types and the per-kit-component docs are generated from the same schemas. Both outputs are ignored by Git. `pnpm generate:plugin-kit` generates `components.gen.d.ts`, including each prop's description as a hover hint. Install and consumer tasks generate or restore declarations before use, including editor types after a clean install. `pnpm docs:build` also generates the reference pages. CI checks missing-output recovery, schema changes, deterministic generation, cache restoration, and consumer types. Amended by the owner on 2026-10-29 (#1369).
  - The App keeps only the renderers. Its registry maps each wire type straight to its kit component, and one generic renderer reads the schema to turn events into callbacks and Slots into nodes. App-owned state such as drafts, optimistic toggles and selection is handled there once, from schema metadata, never in a per-kit-component adapter. Amended by the owner on 2026-10-18 (#1050).
- **One wire version, not per-kit-component versions.** Each App reports one Plugin wire version, and an App below the minimum sees "Update Argo" (ADR-0034, which replaced the per-kit-component versions and lowering first decided here).
  - A container whose props fail to parse shows "Update Argo to see this", like an unknown container, instead of vanishing.
- **Media comes through the Server.** Images, Avatars, Video and Audio name either a Plugin asset or a remote URL.
  - Assets are served from an authenticated Server route, by content hash, so Apps cache them forever.
  - Remote URLs go through a Server proxy that checks the Plugin's fetch Capabilities (ADR-0030) on every hop. The Plugin's credentials stay on the Server, so private images such as GitHub avatars load.
  - The App never fetches from a Plugin's host, and the Plugin never learns the user's IP address.
  - Copied from VS Code's `asWebviewUri` and `localResourceRoots`, and GitHub's image proxy.
- **Kit components turn stable once used.** This changes ADR-0025's rule for kit components only.
  - A proposed kit component becomes stable once one first-party Plugin and one Argo screen both use it.
  - The rest of the Plugin API (`argo`, Hooks, Slots) keeps ADR-0025's rule: stable once the Issue tracker and Atlas both use it.
  - Proposed kit components stay first-party only, as ADR-0025 says.
- **Web views stay a last resort.** ADR-0025 kept web views as a later desktop/web escape hatch. Spec 0017 narrows that: they are for things no kit component can draw, such as a full calendar or a map. A later spec decides them, and they never come to phones. Video and Audio are kit components drawn by the stock players.

## Considered options

- **Templates evaluated in the App** (Adaptive Cards templating), so a list sends one template and data. Rejected: it needs a binding language in every App, and Raycast proves expanded children work.
- **Sending only the rows in view.** Deferred until a Plugin needs lists of tens of thousands of items. Keyed ops and caps cover the Issue tracker and Atlas.
- **Positional patches with a revision check.** Rejected: a reorder would still resend the list, and every tap after it would be refused.
- **One shared view per page.** Rejected: two Apps would fight over search, selection and drafts, and ADR-0027's per-App surfaces could not differ.
- **The App fetches images directly.** Rejected: it leaks the user's IP address to the Plugin's host, bypasses ADR-0030's Capabilities, and can't carry the Plugin's credentials.
- **Schemas stay in the App.** Rejected: the Server could not validate trees, and Plugin authors would have no types.
- **Kit props declared separately, with a type test keeping them, the schemas and Plugin JSX in step,** as first accepted. Rejected by the owner: two definitions of one kit component, with a test patching over the gap. Deriving the kit props from the schema leaves one.
- **Strict schemas without versions.** Rejected: every new optional prop would blank that kit component on older Apps. Under ADR-0034 an older App ignores props and leaves it does not know, and only a change it can't draw bumps the one Plugin wire version.
- **Keep "the Issue tracker and Atlas" for kit components.** Rejected: most of Spec 0017's kit components would stay proposed forever.
- **A proposed-API opt-in for third-party Plugins,** as VS Code's `enabledApiProposals`. Not now: third-party Plugins don't load until ADR-0030's operating-system boundary exists.
