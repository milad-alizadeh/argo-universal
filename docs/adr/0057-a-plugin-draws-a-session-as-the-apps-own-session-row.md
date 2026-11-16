# A Plugin draws a Session as the App's own Session row

This extends [ADR-0025](0025-plugins-run-on-the-server-and-draw-argo-components.md), [ADR-0030](0030-plugins-get-only-the-capabilities-their-manifest-declares.md) and [ADR-0042](0042-field-groups-and-lists-are-separate-kit-components.md) (owner, 2026-11-15, spec #2217). A Plugin can attach a Session to something it owns, as the Issue tracker does, but had to draw the row itself: a `FieldGroup.Link` with a title and branch it copied when the Session was attached. The copy goes stale and shows none of what the Sessions list's row shows.

## Decision

- **`SessionRow` is a kit component:** `{ sessionId, onPress? }`. The Plugin sends the id; the App draws the Sessions list's own row from the live Session, under this Device's Slot choices, so other Plugins' items and the chosen Activity line show on it too. Pressing it opens the Session unless `onPress` says otherwise.
- **The App reads the Session, the Plugin does not send it.** `session.list` takes an optional `sessionId`, so one row is one live query that refreshes with the list's own updates. It lists top-level Sessions only, so a child Session draws nothing, as does one that is gone or archived out of sight: no new visible state is invented for it.
- **It needs `sessions:read`.** The Server drops a `SessionRow` from a page whose Plugin does not hold the Capability and logs why, as it does a secret bound where it may not go. Reading is not scoped to a Project, as `argo.sessions.get` is not.
- **The kit holds no Session data.** `SessionRow` draws through a context the App fills around a Plugin's page or card with its connected row, so `@repo/kit` stays free of the App's data; with none set it draws nothing.

## Consequences

- The Issue tracker's attached Sessions use `SessionRow` in place of its hand-built row.
- A Replaceable Slot's tree does not get the context yet, so a `SessionRow` there draws nothing.
