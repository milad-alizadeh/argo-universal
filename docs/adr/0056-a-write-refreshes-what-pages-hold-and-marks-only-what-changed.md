# A write refreshes what pages hold and marks only what changed

This amends [ADR-0037](0037-plugins-declare-the-data-they-need.md) and [ADR-0050](0050-plugin-pages-are-a-loader-and-a-pure-render.md) (owner, 2026-11-17, in spec #2189). Both said a write made every Query a Plugin keeps due and marked all of its Page addresses stale. That wipe ran far more often than writes happen: after every Operation run of any tier, on each `argo.changed()` that names nothing, and on each tick of a list's refresh clock. A Query that is due is waited on, so each wipe turned the next draw of every open page into network round trips, and with several Agents running the Plugin's page was redrawn about once per Session per interval. Argo carries this work (the principle of spec #2189), so no Plugin changes and the kit gains no API.

## Decision

- **A read-tier Operation run is no write.** The tier a Plugin declares in its manifest (ADR-0044) already says whether a run writes. A `read` run makes nothing due and marks nothing; an `act` run, or a run with no tier known, is a write. A handler that reads and still calls `argo.changed()` is a write by that call.
- **A write refreshes, and compares.** A write makes every Query the Plugin keeps due. The Queries a page holds (ADR-0037's Query holders) are then read again at once, and a mark goes only to the addresses that drew an answer that differs from the new one, as when a background pass finds a change. A Query no page holds is left due, so the next draw reads it and nothing is read that nobody wants. A write that changes no answer sends no mark, so a Turn-end `github.discover` that attaches nothing new redraws nothing. Only a new worker of a Plugin still marks every address: what the App kept came from older code.
- **Argo coalesces a Plugin's writes.** The first write opens a window of 200 ms, the writes inside it are absorbed, and the Plugin is settled once when it ends: its Queries are made due and the held ones read again together, and its items Slots ask again once. Five Sessions finishing Turns in a window cost one refresh and at most one redraw.
- **A page with a tree is served what was kept.** A draw whose address already drew a Query is served the kept answer when the Query is due from a write or old for the page's `every`, and the read runs behind it. When it answers differently the address is marked and the App draws again; when it answers the same, nothing happens. A first draw of an address, a pull to refresh and a background pass still wait for a fresh read, and so does a Query whose last read failed.
- **A list's clock ages, and asks for what it shows.** A tick no longer makes the Plugin's Queries due. It drops what the Plugin's Slots kept for the contexts the list shows, and makes due only the Query answers a Slot read that are as old as the list's interval (a tenth short, as a tick comes a little before the answer it caused is that old). Every other Query, and every other Slot context, stays as it was.

## Considered options

- **Let the Plugin name what changed**, as `argo.changed({ queries })`. Rejected: it is a performance-only API every author would have to get right, which spec #2189 rules out. Comparing answers needs nothing from the Plugin.
- **Keep the wipe and only coalesce it.** Rejected: it still sends every open page to the network after each window, when nothing changed.
- **Refresh every kept Query on a write.** Rejected: most hold no page, so their reads would be requests nobody waits for.

## Consequences

- A page whose Loader reads no Query is no longer redrawn by a write. Its data is not a Query, so Argo cannot tell that it changed; such a page reads through Queries, or draws on its `every`.
- A Query held by a page that has left the screen is still read again on a write until its address is released, as Argo does not know which pages are open. The cost is bounded by the Plugin's warm entries.
- A write is visible to the App up to one window later, 200 ms.
