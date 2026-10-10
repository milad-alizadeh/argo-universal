# Feed sync uses position for paging and revision for changes

Each Session update has a stable `id`, a `position` that the Server sets once, and the `revision` at which it last changed. `revision` is one counter for the whole Session. Paging uses `position`. Live updates and reconnect use `revision`. Each Session also has an integer `epoch`. The Server increases it only when it rebuilds the rows of a Session, and an App that sees a new epoch drops its cache for that Session.

Open rows live in Server memory. The live stream sends `row.upsert`, `row.append {id, field, off, text}`, and `row.patch`, batched every 60 ms. The Server writes a row to SQLite when it settles, on a short timer, and at shutdown, through one writer queue in WAL mode. On reconnect, the App sends its last revision, and the Server sends the newest version of each row that changed after it. Scrolling back pages by position, 40 rows by default and 200 at most.

Spec 0009 adds an ephemeral commit acknowledgement to an accepted Writer prefix. Session waits for its identity, Turn and local prompt row to commit before dispatching an ACP prompt. A failed write permanently rejects every acknowledgement behind that prefix; a later durable retry cannot restart the rejected submission. The acknowledgement contains no upstream completion promise or durable receipt (owner, 2026-10-09, #349).

A Turn completes through a nonterminal Feed publication barrier. Feed applies and settles the earlier accepted text rows, sends their waiting public changes, and only then acknowledges publication to Session. Session clears the active Turn and admits another prompt afterward. The Session callback remains attached throughout; terminal Feed flush remains reserved for Session closure (owner, 2026-10-09, #349).

Plans keep their original row position and Turn through later replacements. Their `_meta.argo.contentRevision` records the last whole content replacement independently of removal; removing an older Plan cannot displace the latest Plan. Removal retains stored history and clears active presentation. An unaddressed ACP Plan persists the narrow `unaddressedPlanAcpSessionId` marker so the existing live/queued/stored revision reconciliation can recover its local row after close/reopen. Existing payload version 1 and stored row IDs remain readable.

## Considered Options

- Send the whole row again on every change. Rejected: it costs 20 to 100 times more data, and the cost grows with the square of the message length.
- Paseo's per-event sequence ranges. Rejected: they need overlap repair on the Server and reconciliation in the App.
