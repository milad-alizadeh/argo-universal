# XState runs the Server lifecycles, and the Server address lives in a file

XState runs only on the Server: the supervisor, the Session machines, and Agent lifecycles. Apps use TanStack Query and React state, with no machines.

The supervisor is an XState machine in `apps/server`, next to the worker that it starts. Its states are `starting`, `running`, `backingOff`, `failed`, and `stopping`. It restarts the worker after a missed heartbeat, with exponential backoff that has a cap. Electron starts the supervisor, not the worker. Electron reuses a running Server with the same version, restarts one with a different version, and stops only a Server that it started.

The supervisor writes `~/.argo/server.json` atomically with `{pid, port, version, startedAt}`. The PID and port are runtime facts, so they are not in SQLite. Electron can then find the Server without the database package, and a crash leaves no stale row.

## Considered Options

- No supervisor, Electron starts the Server directly. Rejected by the owner: the lifecycle must be an explicit machine from the start.
- PIDs in SQLite. Rejected for the reasons above.
