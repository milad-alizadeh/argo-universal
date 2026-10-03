# The Server database holds the Feed, and the vendor transcript is only a source

The Server stores each Session update after it converts it from the vendor event, as a row. The `feed_row` table in SQLite is the one source of truth for what a user sees. Each row keeps a reference back to its vendor record, so the Server can rebuild rows while the vendor file exists. The Server does not store raw vendor events.

Images and large tool output go to content-addressed files at `~/.argo/blobs/<sha256>`. A row holds a blob reference `{blobId, mime, bytes, width?, height?}`, not a URL. The App builds the URL from the Server address. Tool output in a row is capped at 64 KB, with the head and the tail kept and a `truncated` flag. Tool input is never capped. Read models in SQLite follow Argo ADR-0048.

Claude deletes its transcripts after 30 days by default. After that, the Feed stays readable from our rows, but the Session cannot resume. A mirror of the transcript through the SDK `SessionStore` is deferred until we measure real Session sizes.

## Considered Options

- Vendor transcript plus memory, as Paseo does. Rejected: it loses history after the 30-day sweep, it breaks when a vendor changes its file format, and it needs epochs and gap repair on every resume.
- Raw vendor events in SQLite, converted on each read, as Nimbalyst does. Rejected: about 7 GB in 10 months, and a parser for every old vendor shape forever.
