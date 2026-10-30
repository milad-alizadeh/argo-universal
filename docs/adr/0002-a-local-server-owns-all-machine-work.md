# A local Server owns all machine work, and Apps connect to it directly

The phone, the web app, and the desktop app must have the same abilities ([ADR-0022](0022-server-device-and-paired-devices.md), proposed, amends this: a short list of actions works only on the Server Device, owner, 2026-10-12). So the local Server owns Sessions, Agents, git, worktrees, and storage. Its deployable Supervisor and process startup live in `apps/server`; the reusable Engine implementation and domain work live in `packages/engine` (owner, 2026-10-09). Electron's main process does none of this work.

Every App connects to the Server over one WebSocket carrying every tRPC call (`wsLink`, `ws` with `applyWSSHandler`, Zod, no superjson). The one exception is file upload: tRPC accepts a file only over HTTP, so a client's `splitLink` sends a call whose input is a file through `httpLink` to the same router, served by tRPC's `createHTTPHandler` on the same `node:http` server. A one-shot upload has no reconnect path. Plain HTTP serves only `GET /blobs/:id`, because an image needs a URL that returns its bytes. There is no HTTP framework (owner, 2026-10-03; this replaces Hono). The Electron renderer connects like the phone, with no tRPC over Electron IPC; the preload script gives it the Server address, window controls, and App presentation services: system symbol drawing and the macOS native share menu for text and HTTP(S) URLs. Native sharing exposes no file paths or filesystem access (owner, 2026-10-18, #739).

The Server owns the only database: SQLite at `~/.argo/argo.db`, through Drizzle on `node:sqlite`, following Argo ADR-0043 (SQLite owns per-machine state). Apps keep no local database; the TanStack Query cache is enough.

The Engine starts one Registry actor beside the open Sessions actor and the Writer. Agents owns Registry fetching, validation and platform support. The actor fetches on startup when no copy is stored. Opening the Agents page refreshes that copy. Concurrent refreshes share one fetch.

SQLite stores the complete accepted Registry in one `registry_cache` row. The Writer commits replacements. A failed refresh preserves the stored copy. Apps show that copy without an error; an empty cache shows the friendly error and Retry. Search and filters run on the Device. Lists refetch when opened; there is no App catalog change stream.

`agent_servers` stores each installed Agent's Registry id and environment. Install saves the choice; Remove deletes it. Launch reads these rows and resolves the Registry's current version. The first launch downloads the Agent; browsing and Install launch nothing. Fresh Servers have no installed Agents (Spec 0014 #721, owner, 2026-10-16).

Migration B copies saved Registry definitions, includes disabled choices, and excludes removed choices. It converts environment overrides to an object and drops argument overrides. Sessions keep their Feed and receive the Registry id when their Agent id changes. Custom definitions are deleted. Their Sessions remain readable, and Send reports that the Agent is not installed.

The Writer commits every live Registry, Session, Feed and Blob metadata write. Fetching holds no SQL transaction. A failed write waits through the Writer's retry cycle. Shutdown stops Registry admission, aborts fetching and drains the Writer before closing SQLite. Blob bytes remain files, and metadata is acknowledged after its Writer receipt.

For now the Server binds to `127.0.0.1` only, without authentication. It checks `Host` on every request, and `Origin` on the WebSocket and on tRPC over HTTP, so a website in a browser on the same machine cannot call it (owner, 2026-10-03). Pairing a real phone and authentication come later, with their own ADR.

[ADR-0044](0044-argo-is-driven-through-one-operation-registry-and-the-argo-cli.md) (owner, 2026-10-28) amends this: the `argo` CLI calls `operations.list` and `operations.run` through tRPC over HTTP, and those two refuse a call without a token, either a Session's own or the user's from `~/.argo/control.token`. The rest of tRPC stays open until Pairing.

[ADR-0045](0045-pairing-gives-every-device-its-own-key.md) (owner, 2026-10-30) is that ADR, and it replaces the paragraph above and part of the transport. The Server binds `127.0.0.1` until the owner turns on Local network access, and every Connection beyond loopback is authenticated by the Device's own key. `Host` checking (`requestHostAllowed`) is deleted rather than kept beside the handshake; the `Origin` check stays, narrowly, for the browser case. Plain HTTP serves nothing: `GET /blobs/:id` and `/plugin-assets/*` move onto the authenticated channel. On native Apps that channel is the transport rather than a `ws://` WebSocket, because a release Android build refuses cleartext HTTP to a local address; tRPC rides inside it. Web and the desktop renderer keep the WebSocket described above.

## Considered Options

- Run the Server inside the Electron main process. Rejected: the phone cannot use it when desktop is closed, and Argo's current tRPC-over-IPC bridge is the code we want to remove.
- A custom JSON protocol over WebSocket, as Paseo does. Rejected: tRPC gives typed procedures and TanStack Query hooks for free.
- HTTP for queries and WebSocket only for subscriptions. Rejected: two transports means two reconnect paths.
- Uploads as base64 over the WebSocket. Rejected: a third larger, and a big image holds up the socket that streams the Feed.
- Hono for the plain HTTP routes. Replaced on 2026-10-03: once `/health` became a tRPC query, one blob route needed no framework.
