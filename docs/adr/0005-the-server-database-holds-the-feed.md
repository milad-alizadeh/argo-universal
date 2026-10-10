# The Server database holds the Feed, and the vendor transcript is only a source

The Server stores each Session update after it converts it from the vendor event, as a row. The `feed_row` table in SQLite is the one source of truth for what a user sees. Each row keeps a reference back to its vendor record, so the Server can rebuild rows while the vendor file exists. The Server does not store raw vendor events.

Images and large tool output go to content-addressed files at `~/.argo/blobs/<sha256>`. A row holds a blob reference `{blobId, mime, bytes, width?, height?}`, not a URL. The App builds the URL from the Server address. Tool output in a row is capped at 64 KB, with the head and the tail kept and a `truncated` flag. Tool input is never capped. Read models in SQLite follow Argo ADR-0048.

Spec 0009 builds the cap for ACP tool rows (owner, 2026-10-10, #358). The text blocks of `content`, read end to end, and the JSON of `rawOutput` are each capped as one field: over 64 KB, a field keeps its first and last bytes within 64 KB in all, cut on whole characters and joined by one `\n…\n` mark, and text blocks wholly between them are left out; a capped `rawOutput` becomes that preview of its JSON. The whole value of each capped field is a JSON Blob, named in `_meta.argo.fullOutput.content` or `.rawOutput`, beside `_meta.argo.truncated`. A later update recaps only the fields it supplies, the Feed keeps only the newest Blob of each field in memory, and the Writer stores a row only after its Blob files. User input, tool input and diff content are not capped. Other oversized content is not cut: each ACP frame is bounded at 32 MiB instead (ADR-0016). Showing the full output in the App is a later change.

Claude deletes its transcripts after 30 days by default. After that, the Feed stays readable from our rows, but the Session cannot resume. A mirror of the transcript through the SDK `SessionStore` is deferred until we measure real Session sizes.

Under ACP (Spec 0009, #356), reading a Feed never opens the Agent. A Session from the native integration resumes with `session/resume` and its stored upstream id; Argo never loads or lists Agent sessions to rebuild one. When the Agent cannot resume it, the Session fails with the Agent's reason, its Feed stays readable from our rows, and no prompt is sent.

## Considered Options

- Vendor transcript plus memory, as Paseo does. Rejected: it loses history after the 30-day sweep, it breaks when a vendor changes its file format, and it needs epochs and gap repair on every resume.
- Raw vendor events in SQLite, converted on each read, as Nimbalyst does. Rejected: about 7 GB in 10 months, and a parser for every old vendor shape forever.
