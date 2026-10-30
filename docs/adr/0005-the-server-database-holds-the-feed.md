# The Server database holds the Feed, and the vendor transcript is only a source

The Server converts each vendor event to a Session update and stores it as a row. SQLite's `feed_row` table is the one source of truth for what a user sees. Each row references its vendor record, so the Server can rebuild rows while the vendor file exists. Raw vendor events are not stored.

Images and large tool output go to content-addressed files at `~/.argo/blobs/<sha256>`. A row holds a blob reference `{blobId, mime, bytes, width?, height?}`, not a URL; the App builds the URL from the Server address. Tool output in a row is capped at 64 KB, keeping the head and tail with a `truncated` flag. Tool input is never capped. SQLite read models follow Argo ADR-0048.

Spec 0009 builds the cap for ACP tool rows (owner, 2026-10-10, #358). Text content and `rawOutput` over 64 KB each keep their first and last 32 KB, cut on whole characters and joined by a `\n…\n` mark; a capped `rawOutput` becomes that preview of its JSON. The whole value of each capped field is a JSON Blob, named in `_meta.argo.fullOutput.content` or `.rawOutput`, beside `_meta.argo.truncated`. A later update recaps only the fields it supplies, and the Writer stores a row only after its Blob files. User input, tool input and diff content are not capped. Other oversized content is not cut: each ACP frame is bounded at 32 MiB instead (ADR-0016). Showing the full output in the App is a later change.

Claude deletes its transcripts after 30 days by default; the Feed then stays readable from our rows, but the Session cannot resume. Mirroring the transcript through the SDK `SessionStore` is deferred until we measure real Session sizes.

Under ACP (Spec 0009, #356), reading a Feed never opens the Agent. A Session from the native integration reopens with its stored upstream id. Argo uses `session/resume` when the Agent supports it, and falls back to `session/load` when it does not. Argo discards the history replayed during `session/load`; the stored Feed remains authoritative. Argo never lists Agent sessions to rebuild a Feed. The owner approved this fallback on 2026-10-29. When the Agent cannot resume it, the Session fails with the Agent's reason, its Feed stays readable from our rows, and no prompt is sent.

## Considered Options

- Vendor transcript plus memory, as Paseo does. Rejected: it loses history after the 30-day sweep, it breaks when a vendor changes its file format, and it needs epochs and gap repair on every resume.
- Raw vendor events in SQLite, converted on each read, as Nimbalyst does. Rejected: about 7 GB in 10 months, and a parser for every old vendor shape forever.
