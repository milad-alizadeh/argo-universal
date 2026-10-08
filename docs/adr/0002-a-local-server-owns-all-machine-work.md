# A local Server owns all machine work, and Apps connect to it directly

The phone, the web app, and the desktop app must have the same abilities. So the local Server owns Sessions, Agents, git, worktrees, and storage. Its deployable Supervisor and process startup live in `apps/server`; the reusable Engine implementation and domain work live in `packages/engine` (owner, 2026-10-09). Electron never does this work in its main process.

Every App connects to the Server over one WebSocket that carries every tRPC call (`wsLink`, `ws` with `applyWSSHandler`, Zod, no superjson). The one exception is a file upload: tRPC accepts a file only over HTTP, so a client's `splitLink` sends a call whose input is a file through `httpLink`, to the same router served by tRPC's `createHTTPHandler` on the same `node:http` server. A one-shot upload has no reconnect path. Plain HTTP serves only `GET /blobs/:id`, because an image needs a URL that returns its bytes. There is no HTTP framework (owner, 2026-10-03; this replaces Hono). The Electron renderer connects in the same way as the phone. There is no tRPC over Electron IPC. The preload script gives the renderer only the Server address and window controls.

The Server owns the only database: SQLite at `~/.argo/argo.db`, through Drizzle on `node:sqlite`. Apps keep no local database. The TanStack Query cache is enough. This follows Argo ADR-0043, where SQLite owns per-machine state.

For now the Server binds to `127.0.0.1` only and has no authentication. It checks `Host` on every request, and `Origin` on the WebSocket and on tRPC over HTTP, so a website open in a browser on the same machine cannot call it (owner, 2026-10-03). Pairing a real phone and authentication come later, with their own ADR.

## Considered Options

- Run the Server inside the Electron main process. Rejected: the phone cannot use it when desktop is closed, and Argo's current tRPC-over-IPC bridge is the code we want to remove.
- A custom JSON protocol over WebSocket, as Paseo does. Rejected: tRPC gives typed procedures and TanStack Query hooks for free.
- HTTP for queries and WebSocket only for subscriptions. Rejected: two transports means two reconnect paths.
- Uploads as base64 over the WebSocket. Rejected: a third larger, and a big image holds up the socket that streams the Feed.
- Hono for the plain HTTP routes. Replaced on 2026-10-03: once `/health` became a tRPC query, one blob route did not need a framework.
