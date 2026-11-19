---
status: accepted
---

# A Checkout runs its app from checked-in Run Configurations, in Terminals the Server owns

Owner-approved decision, 2026-11-19, from a grilling Session. Prior art is in [run-configurations.md](../research/run-configurations.md).

Argo starts, stops and shows a Project's own app — a dev server, a simulator build, a worker — from a Runs card in the Workbench. Each provider has its own way to do this, such as Claude Code's `.claude/launch.json`. Argo defines one that does not depend on any Agent, so people and every Agent use the same Run Configurations through the same Operations.

## Where Run Configurations live

Run Configurations live in `.argo/run.json` (JSONC) in the Session's Checkout. The file is checked in, so it is shared with the team, follows the branch, shows in the diff, and any Agent can write it as an ordinary file. The DB holds only personal overrides as Project settings: auto-start, pinned ports and env values. There is no gitignored `run.local.json`; no surveyed tool uses one, and VS Code layers user settings the same way.

A drafting Operation writes a first `.argo/run.json` from `package.json` scripts, `Procfile`, `.vscode/launch.json` and `.claude/launch.json`. Argo reads those files only to draft; it never runs them directly.

A Run Configuration has `name`, `command`, `cwd`, `env`, and optionally `port`, `url` and `ready`. `ready` is an output pattern or "the port is listening". A group has `members` and a `stopAll` setting. Install and setup steps are not part of a Run Configuration.

## Ownership

A Run belongs to a Checkout, not a Session. Sessions that share the main checkout see and control the same Runs; a Session in its own worktree sees only its own. Runs and Terminals run on the Server Device (ADR-0002); Apps only control and show them.

Runs are a separate engine and table from Background Tasks. Both share `packages/process`, the output blobs and the login-shell environment. Background Tasks are one-off Agent tool calls; Runs are long-lived, restartable and named by config.

## Ports

Each Checkout gets a block of ports and receives `$PORT` and `$ARGO_PORT_0..n`, the same pattern as Conductor's port block. A Run Configuration may pin a fixed port, for example an OAuth callback. Then only one Checkout can run it at a time, and a second start names the Session that holds the port.

## Terminals

Every Run is a real terminal (PTY), not a log view: a person types into it as into any terminal, for example `r` to reload Expo. A person can also open plain shell Terminals in the Checkout. Each Run and each Terminal is its own Inspector tab, using the Inspector's existing tabs; there is no nested tab strip. The phone gets the same interactive terminal with a key row (Esc, Ctrl, Tab, arrows). All output is also recorded, so Agents can read it and Apps can replay it after reconnecting.

## Lifecycle and trust

- Stop sends SIGTERM to the process group, then SIGKILL after a grace period, then kills anything still listening on the Run's port. Surveyed tools leak child processes without that last step.
- Closing a shell's tab ends it. Closing a Run's tab only hides it.
- Archiving the Session or removing the Checkout ends everything in it.
- Runs and Terminals end with the Server. After a crash, recovery marks them lost and kills their process groups; nothing reattaches.
- A fresh clone never starts anything by itself. Auto-start applies only after a person has started that Run Configuration once in that Project.

## Operations

`run.start`, `run.stop` and `run.restart` are tier `act`. `run.start` waits until the Run is ready, then returns its URL and port, or the output tail on timeout. `run.status`, `run.logs` and `terminal.read` are reads. Agents may send input with `terminal.send` only to Runs, never to a person's own shell Terminals.

## Considered Options

- **DB-only storage.** Rejected: not shared, not per-branch, invisible in review.
- **Reading `.vscode/launch.json` or `.claude/launch.json` as the source.** Rejected: one is debugger-shaped and the other ties Argo to one provider. They are import sources only.
- **A read-only log view first.** Rejected by the owner: dev servers need keystrokes.
- **A Plugin.** Rejected: Plugin processes are capped and timed out (ADR-0030), and Agents need core Operations (ADR-0044).

## Consequences

- On the phone, the URL is `localhost` on the Server Device, so v1 shows it but opens it only on that Device's Apps. Proxying it to Paired Devices and an in-app preview pane are later work.
