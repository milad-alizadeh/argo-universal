# The App keeps each page's last Plugin tree

This narrows [ADR-0025](0025-plugins-run-on-the-server-and-draw-argo-components.md)'s "stores nothing about them": the App still writes nothing to the Device about a Plugin, and now holds the last tree of each page in memory. [ADR-0037](0037-plugins-declare-the-data-they-need.md) does not change: this cache is the App's, a Plugin cannot see it, `useData` and the Engine's cache work as before, and nothing about it appears in `@argo/plugin-kit`.

Opening a page starts a view on the Server, and nothing could draw until its first snapshot arrived. So a page seen a moment ago came back blank for as long as the Server took: a sidebar tap, a row, or a return to a section.

## Decision

- **Each page's last tree is kept in TanStack Query, in memory, per Connection.** The key is the Plugin, the path and the context (Session, Project). A page draws what is kept until its view opens, in the first frame, and the view's first snapshot replaces it in place. Nodes the snapshot left as they were stay the same objects, and no tree remounts from kept to live.
- **A tree remounts only when one live view replaces another,** such as after a Plugin reload, so a new view has no drafts from the old one.
- **A kept tree is dropped when it may no longer be true.** The Server names the Plugin on `plugins.listChanges` when it is turned on or off, reloads, is removed, or when an Account it provides or borrows signs in or out. The App also drops every tree when that stream starts, as it cannot know what changed while it was away, and drops the trees of a Plugin that the list no longer shows as enabled. A page drawing a dropped tree stops drawing it at once.
- **Taps wait for the live view, and do not run if what they were aimed at changed.** A tap on a kept tree is held. When the view opens, the tap goes to it only if the node with that key is exactly as it was drawn; otherwise it fails with a toast and runs no handler, because a Plugin may key rows by position and the same key can now close another Issue. A tap on a page the person has left never runs. `navigate` Actions need no view and run at once.

## Considered Options

- **Disable controls until the view is live.** Rejected: most returns take a few frames, so every control would dim and undim on each visit, or stay undimmed and swallow the tap with nothing to say why.
- **Send the tap straight to the old view's key.** Rejected: the Server refuses a view that has closed, and a new view's same key may not be the same thing.
- **Keep the views open.** Rejected: [ADR-0047](0047-a-sidebar-tap-replaces-the-page.md) closes them because live views for every visited page were what made the App slow.
- **Store trees on the Device.** Rejected: a tree can hold a Plugin's private data, and it would have to survive sign-out, disable and Server changes on a Device that was off at the time.
