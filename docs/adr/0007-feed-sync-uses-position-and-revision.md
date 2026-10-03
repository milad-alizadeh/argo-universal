# Feed sync uses position for paging and revision for changes

Each Session update has a stable `id`, a `position` that the Server sets once, and the `revision` at which it last changed. `revision` is one counter for the whole Session. Paging uses `position`. Live updates and reconnect use `revision`. Each Session also has an integer `epoch`. The Server increases it only when it rebuilds the rows of a Session, and an App that sees a new epoch drops its cache for that Session.

Open rows live in Server memory. The live stream sends `row.upsert`, `row.append {id, field, off, text}`, and `row.patch`, batched every 60 ms. The Server writes a row to SQLite when it settles, on a short timer, and at shutdown, through one writer queue in WAL mode. On reconnect, the App sends its last revision, and the Server sends the newest version of each row that changed after it. Scrolling back pages by position, 40 rows by default and 200 at most.

## Considered Options

- Send the whole row again on every change. Rejected: it costs 20 to 100 times more data, and the cost grows with the square of the message length.
- Paseo's per-event sequence ranges. Rejected: they need overlap repair on the Server and reconciliation in the App.
