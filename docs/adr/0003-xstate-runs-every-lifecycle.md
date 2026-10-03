# XState runs every lifecycle, and the Server address lives in a file

Logic that waits on the outside world, runs a timer, or can be cancelled is an XState machine. That covers the Server (the Supervisor, the Engine, Sessions, Agents, and the Feed writer), the Electron main process, and an App's Connection to the Server (owner, 2026-10-03). Everything else stays out of machines: pure functions turn data into other data, Zod holds shapes, and TanStack Query holds an App's copy of Server data. Spec 0002 lists every machine.

Machines are small and run as actors that send each other events, so `xstate/graph` can walk every transition of each one. A machine's state is never saved. The database is the only record (ADR 0005), so after an Engine restart each Session starts as `idle`, and a Turn that was running ends with the stop reason `error`.

The Supervisor is an XState machine in `apps/server`, next to the Engine that it starts. Its states are `starting`, `running`, `backingOff`, `failed`, and `stopping`. It restarts the Engine after a missed heartbeat, with exponential backoff that has a cap. The Engine is a machine too: it opens the database, serves, sends the heartbeat, and stops on a signal, with an exit code as its output. Electron only makes sure a Supervisor runs: it reuses a running one, starts one when none runs, and on quit stops only one that it started (owner, 2026-10-03). When that Supervisor runs Sessions with a running Turn, Electron first asks whether to keep them going, and Keep quits without stopping it (owner, 2026-10-03, spec 0003). Watching and repairing the Engine is the Supervisor's job alone. Electron reuses a Supervisor of any version until release packaging adds a version check, and a setting may later keep the Supervisor running after every quit.

The Supervisor writes `~/.argo/server.json` atomically with `{pid, port, version, startedAt}`. The PID and port are runtime facts, so they are not in SQLite. Electron can then find the Server without the database package, and a crash leaves no stale row.

## Considered Options

- No Supervisor, Electron starts the Server directly. Rejected by the owner: the lifecycle must be an explicit machine from the start.
- PIDs in SQLite. Rejected for the reasons above.
- Machines on the Server only, with React state in Apps. Replaced by the owner on 2026-10-03: the Connection and Electron's Server lifecycle had the same waiting, timers, and retries as the Server's lifecycles.
- Saving machine snapshots across restarts. Rejected: a second record of a Session that can disagree with the database.
