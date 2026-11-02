# A sidebar tap replaces the page

This amends [ADR-0025](0025-plugins-run-on-the-server-and-draw-argo-components.md) for a section's pages on a wide window, and changes the owner's 2026-10-19 rule that pages push further pages within a section. ADR-0025's stack per nav item on phone stands.

Every click on a Plugin's sidebar used to push a page, and every page drew its own copy of the list. So a click built a new route, a new view on the Server and a new sidebar, the Projects were listed again, and the stack held every view open. Measured on the Issue tracker, a fifth page meant five live views, and a deep link could leave the sidebar on its loading title when the root drew second.

## Decision

- **A sidebar tap replaces the detail page, and no Back is shown for it.** The page beside the list is where the person is, not one step on a path. A page's own links still push, and Back appears only after a push, or on a page opened for a Session or a Project.
- **A section holds one live list.** The root's `ListDetail` declares it, the host keeps that one view alive for as long as the section is on screen, and detail pages change beside it. A Plugin writes one root and registers it once.
- **The root's `ListDetail` also names where the section lands.** Its optional `landing` prop is the path of the page to open, so a section on a wide window opens on a page, not on an empty state. Without it the wide window shows `empty` until a row is picked. Compact windows open on the list.
- **The host says which row is selected.** It derives the selected row from the current page, and a Plugin passes no selection per page.
- **A view stays open only for a page on screen or the page directly below it.** A page further down the stack closes its `plugins.view` subscription, keeps its last tree and opens again when the person returns to it. The Plugin's local state on that page starts again.
- **Phones keep native push.** On a compact window the list is a page in the stack, its rows push, and each nav item keeps its own stack.
- **A claim on the sidebar waits until focus is known, and a shown page's claim is never lost to a hidden one.**

## Considered Options

- **Keep pushing and close views below the top.** Rejected: Back would walk through every filter the person had looked at, and each step would rebuild the page it returned to.
- **A layout enum on the section's manifest entry.** Rejected: the root's `ListDetail` already says everything the host needs, and a second declaration could disagree with it.
- **Close every hidden view, including the page directly below.** Rejected: Back is the most common way out of a pushed page, and it would reopen the page and lose its state every time.
