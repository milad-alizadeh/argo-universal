# Plugins contribute data that Argo draws

Argo connects to outside services through Plugins (owner, 2026-10-12). Linear, Jira and GitHub Issues are the first, and they ship with Argo as built-in Plugins. Later, anyone can write a Plugin that adds to Argo's existing UI: an issue tracker Argo does not support, an item in the sidebar, or a widget in the Inspector. Built-in Plugins use the same Plugin API that outside Plugins will use, so the first ones prove it.

## Plugins run on the Server

A Plugin is a package with a manifest. The Server loads and runs it, as it does all machine work (ADR-0002). An App never runs Plugin code. A Plugin's calls to its outside service, its sign-in and its secrets stay on the Server, so every App gets the same Plugins and no device holds a Plugin's credentials.

The manifest names the Plugin, its logo, its description and the contribution points it uses. Settings lists every Plugin the Server has, built-in or added, with its state.

## Plugins contribute through contribution points

A contribution point is a named place where a Plugin adds to Argo. Each has a fixed shape in `packages/contracts`, and Argo's own UI draws what a Plugin sends through it. The first two are:

- **Account**: how the Plugin signs in to its service — an existing CLI login, a device sign-in, or a token — and who it is signed in as. The Plugin's Settings page draws it.
- **Issue tracker**: Issues, their statuses and their links. Argo's Issues UI draws them, so a tracker from a Plugin looks and behaves like every other tracker.

Sidebar items, Inspector widgets and Settings sections come later, each with its own shape, designed in Paper before it is built.

## Plugins send data, not UI code

A Plugin describes what to show as data. Where a contribution point needs a view of its own, such as an Inspector widget, the Plugin sends a description built from Argo's primitives: lists of ListItem rows, FieldGroups, forms, buttons and chips. The App draws it with the same primitives as every other screen (ADR-0020).

This is the only design that works on every platform. Apple does not let an iOS app download and run code that changes its features (App Store Review Guideline 2.5.2), so UI code shipped by a Plugin could run on desktop and web only. Plugins would then differ between devices, and the phone, the web app and the desktop app must have the same abilities (ADR-0002). Drawing with Argo's primitives also keeps Plugin views in Argo's design, light and dark, on every platform.

## Plugin data is outside data

Everything a Plugin sends is outside data. The Server checks it against the contribution point's schema; it rejects, reports and counts what it does not recognise, as it does for Agents (ADR-0015). A Plugin that fails or stops answering shows an error state on its Settings page; it does not stop the Server.

## Settings shows Plugins

Settings › Accounts becomes Settings › Plugins. Each Plugin is one row: logo, name, state, and a chevron that opens its page. The page keeps the layout of today's Account page: a header with the Plugin's name and a back button, the identity card (logo, description, status chip and the one action its state needs), an Account section when the Plugin signs in, a section listing what it adds, and Enable and Remove. Built-in Plugins can be turned off but not removed.

## Open questions

These need the owner's decision before the first outside Plugin:

- **GitHub.** Pushing, pull requests and CI checks are core to Sessions, and the Session header depends on them. The proposal is that GitHub's sign-in and pull requests stay core and GitHub Issues is a Plugin.
- **Isolation.** The proposal is that each outside Plugin runs in its own process, not in the Engine, and talks to it over a typed protocol, so a crash or a hang cannot take the Engine down. Built-in Plugins may run in the Engine.
- **Permissions.** What a Plugin may reach (network hosts, the Project's files, git) and how the person grants it.
- **Distribution.** Where outside Plugins come from (a folder, npm, or a registry like the ACP Registry) and how the Plugin API is versioned.

## Considered options

- **Plugins ship UI code**, as VS Code extensions ship webviews. Rejected: iOS cannot run downloaded code, so Plugins would work on desktop and web only, and their views would drift from Argo's design.
- **Plugins run in the App.** Rejected: every device would need the Plugin's code and its secrets, and an App that is not open could not sync.
- **Integrations stay hand-built features with no Plugin API.** Rejected: every new tracker becomes Argo's work, and nobody else can add one.
- **MCP as the Plugin protocol.** Rejected as the Plugin API: MCP gives tools to Agents, not data to Argo's UI. A Plugin may still offer an MCP server to Agents as a later contribution point.
