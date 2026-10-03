# A local Server owns all machine work, and Apps connect to it directly

The phone, the web app, and the desktop app must have the same abilities. So one local Node process, the Server (`apps/server`), owns Sessions, Agents, git, worktrees, and storage. Electron never does this work in its main process.

Every App connects to the Server over one WebSocket that carries every tRPC call (`wsLink`, `ws` with `applyWSSHandler`, Zod, no superjson). The Server serves plain HTTP only for `GET /health` and `GET /blobs/:id`. The Electron renderer connects in the same way as the phone. There is no tRPC over Electron IPC. The preload script gives the renderer only the Server address and window controls.

The Server owns the only database: SQLite at `~/.argo/argo.db`, through Drizzle on `node:sqlite`. Apps keep no local database. The TanStack Query cache is enough. This follows Argo ADR-0043, where SQLite owns per-machine state.

For now the Server binds to `127.0.0.1` only and has no authentication. Pairing a real phone and authentication come later, with their own ADR.

## Considered Options

- Run the Server inside the Electron main process. Rejected: the phone cannot use it when desktop is closed, and Argo's current tRPC-over-IPC bridge is the code we want to remove.
- A custom JSON protocol over WebSocket, as Paseo does. Rejected: tRPC gives typed procedures and TanStack Query hooks for free.
- HTTP for queries and WebSocket only for subscriptions. Rejected: two transports means two reconnect paths.
