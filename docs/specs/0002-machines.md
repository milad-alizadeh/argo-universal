# Spec 0002: Machines

This spec lists every XState machine in Argo Universal, with its states, events, and actors. The reasons are in ADR 0003. The words are in `GLOSSARY.md`. When this spec and an ADR disagree, stop and ask the owner.

The Supervisor and the Engine are built (spec 0001 section 5). This spec changes the Engine (section 4) and adds the rest.

## 1. What is a machine

A machine runs logic that waits on the outside world, runs a timer, or can be cancelled. Everything else stays out of machines:

| Logic | Lives in |
|---|---|
| Lifecycles, protocols, waiting, timers, retries, cancelling | an XState machine |
| Turning data into other data: vendor events into Session updates, a change into a Feed row, a machine state into a `SessionSnapshot` | a pure function, tested with tables of inputs and outputs |
| Shapes of outside data | a Zod schema in `contracts` |
| An App's copy of Server data | TanStack Query |
| What a screen draws | React, from query and machine state |

## 2. Rules for every machine

- Define each machine with `setup({types, actors, actions, guards, delays})`. Every effect, such as I/O, a process, or a log line, is a named actor or a named action in `setup`, so a test swaps it with `machine.provide`. Guards and `assign` stay pure.
- Name a timer as a delay in `delays`, so tests drive it with fake timers.
- Name events `<noun>.<verb>` in camel case, as `engine.ready` and `engine.stop` do. An event that a tRPC procedure sends is named after the procedure, such as `session.prompt`.
- Outside data enters a machine only after the actor that reads it parses it with Zod. That actor reports and counts a shape it does not recognise. A vendor SDK's own types describe its messages instead, and the Feed checks what an adapter makes of them against the contract (ADR 0015).
- A child gets its parent's ref in its `input` and sends to it with `sendTo`, so both ends are typed. Use no `sendParent`.
- Only `databaseWriter`, `sessions`, and each `session:<id>` have a `systemId`. Other actors find them with `system.get`.
- A service that runs a command first checks `snapshot.can(event)`. If the machine would ignore the event, the procedure fails with tRPC `CONFLICT` and names the machine's state. Otherwise it sends the event. The service makes every new id, such as a Session or Turn id, and puts it in the event, so a procedure returns right after it sends.
- A machine's state is never saved (ADR 0003). The database is the only record.
- Each machine has model-based tests from `xstate/graph` that walk all of its transitions (section 12).

## 3. The actor tree

```
Supervisor (process)
└─ Engine (child process)
   ├─ processSignals
   ├─ databaseWriter             one per Engine (section 8)
   ├─ sessions                   the Session registry (section 5)
   │  └─ session:<id>            one per open Session (section 6)
   │     ├─ createSession / loadSession
   │     ├─ feed                 one per Session (section 8)
   │     └─ agent                the one Agent machine (section 7)
   │        └─ connection        the adapter's vendor session
   └─ startHttpServer            the services hold the `sessions` ref

Spec 0003 adds a feed actor for each Subagent under its parent Session, and a tRPC client in the Electron main process.

Electron main process: serverConnection (section 10)
Each App: connection (section 11)
```

## 4. Engine changes

The Engine machine (`apps/server/src/engine/machine.ts`) changes to this shape:

- `openingDatabase` → `recovering` → `live`, or → `failed`.
- `recovering` invokes `recoverAfterRestart` (section 9), then goes to `live`, or to `failed`.
- `live` invokes `databaseWriter` and `sessions`, so both run while the Engine serves and while it stops.
  - `live.listening` starts the HTTP server. Its input reads the `sessions` ref with `self.system.get('sessions')`, and the services hold that ref. Then it sends `ready {port}` and goes to `live.running`.
  - `live.running` sends the heartbeat every second, as now.
  - `live.stopping` runs on `engine.stop`, in order:
    1. `closingHttp` awaits the server's `close()`, so no command arrives after it.
    2. `stoppingSessions` sends `sessions.stopAll` and waits for `sessions` to finish, for 10 seconds at most (`sessionStopLimit`).
    3. `drainingWriter` sends `writer.drain` and waits for `databaseWriter` to finish, for 5 seconds at most (`writerDrainLimit`).
  - Then `stopped`, which closes the database, as now. A limit that runs out goes on to the next step and writes a log line. Section 8 repairs what was left open.
- `failed` and the `{exitCode}` output stay as they are.

## 5. Session registry

`apps/server/src/services/sessions/registry-machine.ts`, invoked by the Engine with id and `systemId` `sessions`.

- Context: the ref of each open Session, by Session id.
- `sessions.create {sessionId, projectId, agent, checkout: 'main' | 'worktree'}` spawns `session:<sessionId>` with input `{kind: 'new', ...}`.
- `sessions.open {sessionId, agent}` spawns `session:<sessionId>` with input `{kind: 'existing', sessionId}`, unless that Session is already open. The service reads `agent` from the `session` row first.
- The Session machine's `agent` actor is the one Agent machine, which picks the adapter by the Session's `agent` id from the adapters that `packages/agents` registers, never by a vendor name in the code (ADR 0015).
- When a Session actor finishes, the registry removes its ref.
- States: `running`, then `stopping` on `sessions.stopAll`, which sends `session.close` to every open Session and goes to `stopped` (final) once none is left.
- The services find a Session with `system.get('session:<id>')` after they send `sessions.open`.

Spec 0003 amends this section: `sessions.open` refuses a Subagent's id, and a Session closes itself after 5 minutes idle.

## 6. Session machine

Spec 0003 amends this section: Agent-started Turns, Plan proposals, held config options, titles, Subagents, Shells, terminal continuation, archive, idle close, and giving up.

`apps/server/src/services/sessions/session-machine.ts`. One actor per open Session, with `systemId` `session:<id>`.

```
session
├─ entering                   goes to creating or loading, by input kind
├─ creating                   invokes createSession
├─ loading                    invokes loadSession
├─ open                       invokes feed
│  ├─ live                    invokes agent
│  │  ├─ starting
│  │  ├─ idle
│  │  ├─ running
│  │  │  ├─ working
│  │  │  ├─ awaitingPermission
│  │  │  └─ awaitingElicitation
│  │  ├─ cancelling
│  │  └─ closing
│  ├─ recovering
│  └─ flushing
└─ closed                     final, output {failure: string | null}
```

Context: `sessionId`, `projectId`, `agent`, `vendorSessionId`, `checkout`, `capabilities`, `activeTurnId`, `usage`, `permissionQueue`, `pendingElicitation`, `configOptions`, `agentCrashes` (times), `failure`.

- `creating` invokes `createSession`. It creates the Checkout through `packages/git` (the main checkout, or a worktree at `~/.argo/worktrees/<projectId>/<slug>` on branch `argo/<slug>`, ADR 0008) and inserts the `session` row. Then `open`. An error goes to `closed` with the failure.
- `loading` invokes `loadSession`, which reads the `session` row. Then `open`. An unknown id or an error goes to `closed` with the failure.
- `open` invokes `feed` with the Session's `epoch`, `maxRevision`, and next position.
- `live` invokes `agent` with `{sessionId, cwd, vendorSessionId, configOptions, parent}`. `vendorSessionId` is null for a new Session and set for one to resume.
- `live.starting`: on `agent.ready {vendorSessionId, configOptions, capabilities}`, it stores them, writes `vendorSessionId` to the row when it is new, and goes to `idle`.
- `live.idle`:
  - `session.prompt {turnId, content}` inserts the Turn as `running`, sends the user's text to `feed` as a `user_message`, sends `agent.prompt {turnId, content}`, and goes to `running.working`.
  - `session.setConfigOption {configId, value}` sends `agent.setConfigOption`.
- `live.running`:
  - `agent.permissionRequested {request}` adds the request to `permissionQueue` and goes to `awaitingPermission`. The head of the queue is the Session's `pendingPermission`.
  - `agent.elicitationRequested {request}` stores it and goes to `awaitingElicitation`.
  - `session.answerPermission {toolCallId, optionId}` is accepted only for the head of the queue. It sends `agent.answerPermission`, removes the head, and stays in `awaitingPermission` while the queue has more, or goes to `working`.
  - `session.answerElicitation {action: 'accept' | 'decline' | 'cancel', content?}` sends `agent.answerElicitation` and goes to `working`.
  - `agent.turnEnded {stopReason, usage?, error?}` ends the Turn in the database and goes to `idle`.
  - `session.cancel` goes to `cancelling`.
  - `session.prompt` is not accepted, so a prompt sent while a Turn runs fails with `CONFLICT`. Queueing prompts can come later.
- `live.cancelling` sends `agent.cancel` and answers every queued Permission request and the Elicitation as cancelled. `agent.turnEnded` ends the Turn and goes to `idle`. After 10 seconds (`cancelLimit`) it ends the Turn with `cancelled`, adds a `notice` that the Agent did not stop, and goes to `recovering`.
- On `live`, in every child state: `agent.feed {change}` goes to `feed` with the `activeTurnId`. `agent.usage` and `agent.configOptionsChanged` update the context.
- `session.close` goes to `live.closing` from inside `live`, and to `flushing` from `recovering`. `live.closing` ends a running Turn with `cancelled`, sends `agent.stop`, and goes to `flushing` when the agent finishes, or after 5 seconds (`agentStopLimit`).
- When the agent finishes or fails outside `closing`, the Session goes to `recovering`. It ends a running Turn with `error`, adds a `notice`, and records the time in `agentCrashes`. With 3 crashes in 10 minutes it sets `failure` and goes to `flushing`. Otherwise, after 1 second (`agentRestartDelay`), it goes back to `live`, which starts the agent again and resumes the vendor session.
- `flushing` sends `feed.flush`, and goes to `closed` when `feed` finishes, or after 5 seconds.

A Subagent has no Session actor of its own. It is a read-only child Session whose rows the parent's agent writes (spec 0003).

`toSessionSnapshot(sessionSnapshot, feedSnapshot)` in `session-snapshot.ts` is a pure function and the only producer of `SessionSnapshot`:

| Machine state | `state` |
|---|---|
| `live.running.working`, `live.cancelling` | `running` |
| `live.running.awaitingPermission`, `live.running.awaitingElicitation` | `requires_action` |
| every other state | `idle` |

`activeTurnId`, `usage`, `pendingPermission` (the queue head), `pendingElicitation`, and `configOptions` come from the Session context. `maxRevision` and `epoch` come from `feed`. The feed service watches the Session actor and sends `snapshot {snapshot}` on `feed.subscribe` when the result changes.

## 7. Agent machines

Spec 0003 amends this section: new Agent events, `message` on `agent.answerPermission`, `continuedOutside` on `agent.ready`, and Turns that the agent starts from `ready.idle` with no prompt.

One Agent machine, `createAgentMachine` in `packages/agents/src/agent-machine.ts`, runs every adapter (ADR 0015). An adapter in `packages/agents/<agent>/` is plain functions, an `AgentAdapter` from `packages/agents/src/agent-adapter.ts`: `{agent, connect, initialMappingState, toAgentEvents}`. `packages/agents/src/agent-events.ts` holds the event types. Shared code branches on `capabilities`, which a connection reports with its ready data.

Input: `{agent, sessionId, cwd, vendorSessionId: string | null, configOptions, parent}`.

Events the Session sends:

- `agent.prompt {turnId, content: ContentBlock[]}`
- `agent.cancel`
- `agent.answerPermission {toolCallId, optionId: string | null}`, where null means cancelled
- `agent.answerElicitation {action, content?}`
- `agent.setConfigOption {configId, value}`
- `agent.stop`

Events the agent sends to `parent`:

- `agent.ready {vendorSessionId, configOptions, capabilities}`
- `agent.feed {change}`: a `FeedChange` (section 8)
- `agent.permissionRequested {request: PendingPermission}`
- `agent.elicitationRequested {request: PendingElicitation}`
- `agent.usage {usage: ContextUsage}`
- `agent.configOptionsChanged {configOptions}`
- `agent.turnEnded {stopReason, usage?, error?}`

States:

- The machine invokes `connection` for its whole life. It calls the adapter's `connect`, which starts or resumes the vendor session, resuming `vendorSessionId` when it is set. The connection runs Session commands one at a time, in order. A connection error goes to `failed`.
- `starting`: when `connect` resolves, `ready` sends `agent.ready` with the connection's ready data.
- `ready`: each vendor message goes through the adapter's `toAgentEvents`, and the Agent events it returns go to `parent`. The machine reads the start and end of a Turn from those events.
  - `ready.idle`: `agent.prompt` sends the prompt to the connection and goes to `ready.turn`. So does `agent.turnStarted` from the adapter.
  - `ready.turn`: `agent.turnEnded` goes to `ready.idle`. `agent.cancel` asks the connection to cancel and stays in `ready.turn` until the adapter ends the Turn.
- `stopping` runs on `agent.stop`. It waits for `connect` if it has not resolved, then for the connection's `stop`. Then `stopped`.
- `stopped` is final. `failed` is final, with the error in the output. An adapter reports the exit of its vendor process as a failure.

Each adapter's research note, written in milestone 1, says which vendor calls `connect` and the connection's methods make. Turning a vendor message into Agent events is a pure function in the adapter, `toAgentEvents(message, mappingState) → {events, mappingState}`, tested against the recordings in `mocks/cli/<agent>/`. It follows ADR 0006 and ADR 0012.

## 8. Feed actor and database writer

### Feed actor

Spec 0003 amends this: a parent Session also invokes one feed actor per Subagent, and routes the Subagent's changes to it.

`apps/server/src/services/feed/feed-machine.ts`. One per Session, invoked by the Session.

- A `FeedChange` is `{type: 'upsert', update}`, `{type: 'append', id, field, text}`, or `{type: 'patch', id, set}`. An update with `state: 'settled'` settles its row.
- `feed.change {change, turnId}` runs the pure function `applyFeedChange(feed, change, turnId) → {feed, streamEvents}`. It gives a new row the next `position`, raises `revision` by one for each change, and works out the `off` of an append. Open rows stay in the context. A change to a row that has left the context reads it back with `findWrittenRow` from the feed's input, from the writer's queue or the database, so the row keeps its `position`. Spec 0003's `proposalOutcome` reaches a settled plan row this way.
- `active` has two parallel regions:
  - `stream`: `quiet`, then `batching` on a change. After 60 ms (`streamBatchDelay`), it emits `feed.batch {events}` with XState `emit` and goes back to `quiet`. The feed service listens with `feedRef.on('feed.batch', ...)` and sends `row.upsert`, `row.append`, and `row.patch` on `feed.subscribe`.
  - `store`: `clean`, then `dirty` on a change. A change that settles a row writes at once. Otherwise, after 1 second (`storeDelay`), it sends `writer.write` with the changed rows and the new `maxRevision`, drops the settled rows from the context, and goes back to `clean`.
- `feed.flush` emits the batch that is waiting, writes every changed row, and goes to `flushed` (final).

### Database writer

`apps/server/src/services/feed/writer-machine.ts`. One per Engine, with `systemId` `databaseWriter`.

- `writer.write {job}` adds a job to the queue. A job is a batch of Feed rows with the Session's `maxRevision`, a Turn insert or update, or a `session` row update. Jobs commit in the order they arrive.
- States: `idle`, then `writing` on a job. `writing` invokes `writeBatch`, which commits every queued job in one transaction. Then it goes to `writing` again while the queue has jobs, or to `idle`.
- When `writeBatch` fails, the writer logs the error, keeps the jobs, and tries again after 1 second (`writeRetryDelay`).
  A job that can never commit, such as a Turn insert for a deleted Session, holds the queue until `writer.drain`. This is accepted.
- `writer.drain` goes to `draining`, which writes the queue and goes to `drained` (final). A failure while draining logs the lost jobs and goes to `drained`. A drain during `writing` first waits for that batch, and a failed batch is tried once more at once while draining.
- The writer does not validate jobs. The Feed actor checks a row's payload with the `contracts` schema when it turns a Session update into a row (spec 0001 section 7).
- The writer's log lines go to `logs/engine.log`, as the Engine's do. The Engine changes (section 4) wire this.
- `createSession` and `loadSession` write and read directly. `node:sqlite` runs them on the one Engine thread, so they never run inside a `writeBatch`.

## 9. Recovery after an Engine restart

Spec 0003 adds: running Shells become `lost`, each ended Turn gets `error: {code: 'interrupted'}` and a Notice, and the worktrees of archived Sessions are removed.

The Engine's `recovering` state invokes `recoverAfterRestart`, which runs one transaction:

- Every Turn with status `running` becomes `ended`, with stop reason `error` and `endedAt` now.
- Every Feed row with state `open` becomes `settled`. A `tool_call_update` with status `pending` or `in_progress` becomes `failed`.
- Each changed row gets the next revision of its Session, and the Session's `maxRevision` follows.

A Session then opens as `idle` the next time a service asks for it.

## 10. Electron Server connection

Spec 0003 amends `app.quit`: when `ownedPid` is set and a Turn runs, the app asks whether to keep Sessions going, and Keep quits without stopping the Supervisor. The main process reads the running count over its own tRPC client.

Electron has one Server job: make sure a Supervisor runs. The Supervisor watches and repairs the Engine, so Electron never calls `/health` and never watches the Engine. Spec 0001 section 9 states the same rule.

`apps/desktop/src/main/server-machine.ts` replaces `server-lifecycle.ts`. `server-process.ts` keeps the I/O that the machine's actors and actions run. Each function acts once and returns; the machine owns every wait as a named delay.

Context: `address`, `ownedPid` (the Supervisor this app started, or null), `spawnedAt` (when it started it), `failure`.

- `locating` invokes `readAddress`, which reads `server.json` and checks that its PID is alive. With a live PID, it goes to `ready`. Otherwise it goes to `starting`.
- `starting` invokes `spawnSupervisor`, a callback actor that spawns the Supervisor detached and reports to the parent ref in its input. It sends `server.spawned {pid, at}` as soon as `spawn` returns, which sets `ownedPid` and `spawnedAt`, and `server.exited {reason}` if the Supervisor exits or fails to spawn while it starts.
- After `server.spawned`, `starting` reads `server.json` every 200 milliseconds (`pollDelay`) until it names `ownedPid` with a `startedAt` no earlier than `spawnedAt`, so a stale file whose PID the OS reused does not count. Then `ready`. 30 seconds (`startLimit`) after the spawn without `ready`, it goes to `abandoning`.
- `server.exited` forgets `ownedPid` and goes to `rechecking`, which reads `server.json` once more, since another Supervisor may have won the race to start. With a live PID, `ready`; otherwise `failed`.
- `abandoning` signals `ownedPid` and checks every `pollDelay` until it exits, for 5 seconds (`stopLimit`) at most. Then `failed`. A Supervisor that does not stop stays in `ownedPid`.
- `ready` emits `server.ready {address}`, and the main process opens the window with that address.
- `failed` holds the failure. The main process shows it in a dialog with Retry and Quit, which send `server.retry` or `app.quit`. Retry goes to `locating`, or, while `ownedPid` is set, to `retrying`, which stops that Supervisor as `abandoning` does. If it exits, `locating`; if not, `failed` again, with nothing spawned.
- `app.quit` from any state goes to `stopping` when `ownedPid` is set. `stopping` signals that process and checks every `pollDelay` until it exits, for 5 seconds (`stopLimit`) at most. Otherwise `app.quit` goes straight to `stopped`, which is final.
- Electron reuses a Supervisor of any version. A version check comes with release packaging. A setting may later keep the Supervisor running after quit.
- If the Supervisor exits while Electron runs, Electron does nothing. The App's Connection shows `offline` (section 11).

## 11. App Connection

`packages/client/src/connection/machine.ts`. One per App, created in `AppProviders`.

- A callback actor, `watchConnectionState`, subscribes to `wsClient.connectionState`. tRPC's `pending` state sends `connection.opened`. `connecting` with an error sends `connection.lost {error}`.
- States:
  - `connecting` → `open` on `connection.opened`.
  - `open` → `reconnecting` on `connection.lost`.
  - `reconnecting` → `open` on `connection.opened`, and runs `refetchAfterReconnect`. After 10 seconds (`offlineDelay`) it goes to `offline`.
  - `offline` → `open` on `connection.opened`, and runs `refetchAfterReconnect`.
- `refetchAfterReconnect` invalidates every query, so `system.info` and the Feed pages fetch again. This fixes the stale Started time and PID after an Engine restart. Subscriptions restart through `wsLink` with their newest input. The Feed's `after: {epoch, revision}` comes from the cache (ADR 0007).
- The machine owns the retry timing, because tRPC 11.19's `wsClient` sleeps `retryDelayMs` in a private loop that nothing can cut short. `createWSClient` gets `retryDelayMs: () => 0` and an async `url` function, which `wsClient` awaits before every attempt. That function sends `connection.attemptRequested` and resolves when the machine emits `connection.attemptAllowed`.
- `connecting` allows the first attempt at once. In `reconnecting` and `offline`, the machine allows each attempt after `retryDelay`, which doubles from 0.5 seconds to a 30-second cap with the attempts since the last `connection.opened`. `connection.opened` resets the count.
- The universal app sends `app.foreground` from React Native `AppState`. In `reconnecting` or `offline`, it allows a waiting attempt at once.
- `useConnectionState()` reads the state with `@xstate/react`'s `useSelector`. A screen may show a banner in `reconnecting` and `offline`. The banner's tests are play functions with a mocked connection.

## 12. Tests

- Every machine has one `*.test.ts` file with model-based tests from `xstate/graph`. It uses `machine.provide` with mock actors and fake timers, and has a test that every transition was walked. Effects that the model cannot reach get example tests in the same file, as the Supervisor's file has now.
- If `getSimplePaths` gives more than 1,000 paths for a machine, split the machine, or bound the walk with a filter and say why in the test file.
- One composition test drives `sessions`, a Session, `feed`, and `databaseWriter` with the Agent machine and a mock adapter against a temp database. Each adapter also has a composition test driven by its recording in `mocks/cli/<agent>/`.
- The client package gets a Vitest config with the `node` environment for `src/**/*.test.ts`. Components are tested only with play functions.

## 13. Dependencies

These change spec 0001 section 4:

- `packages/agents/src` can import `xstate`. An adapter in `packages/agents/<agent>/` cannot (ADR 0015).
- `client` can import `xstate` and `@xstate/react`.
- `apps/desktop` can import `xstate`.
- The catalog adds `@xstate/react` 6.1.0, which peers on `xstate ^5.28.0`.

## 14. Order

1. The App Connection (section 11) and the Electron Server connection (section 10). They replace scaffold code, so each is checked by the existing e2e tests.
2. Milestone 1, in order: the database writer, the Feed actor, recovery, the Agent events and a mock adapter, the Session machine, the registry, and the Engine changes. Then each adapter.

## 15. Development machine inspection

`packages/machine-log/src/inspector-machine.ts` owns each Node process's optional connection to the local Stately relay. It is enabled only in development by `ARGO_MACHINE_INSPECT=1`; `pnpm dev:inspect` starts the relay and normal development tasks together.

- `active.connecting` invokes a WebSocket transport and waits up to 1 second (`connectionLimit`) for `transport.opened`, then enters `active.connected`. Both states share the same transport.
- A connection failure or loss sends `transport.failed`, closes that transport, and enters `backingOff`. After 500 ms (`retryDelay`), it returns to `active`, up to 20 attempts. Exhaustion enters `unavailable` (final) and reports once. JSONL logging continues independently.
- Inspection records wait in a bounded queue of 200 while disconnected and flush on connection. Connected records go directly to the official inspector formatter.
- `inspection.stop` enters `stopped` (final). Stopping the actor also closes its transport and cancels its timers. The diagnostic machine's own actor is not inspected.
