# XState 5 for the Server supervisor

Research for the supervisor in `docs/specs/0001-scaffold.md` section 5 and `docs/adr/0003-xstate-runs-every-lifecycle.md`. Checked on 2026-10-03.

## Sources

| # | Title | URL | Used for |
|---|---|---|---|
| S1 | npm registry, `xstate` | https://www.npmjs.com/package/xstate (via `npm view xstate`) | Latest version, dist-tags, release dates |
| S2 | GitHub release `xstate@5.33.2` | https://github.com/statelyai/xstate/releases/tag/xstate%405.33.2 | Release date and contents of the newest stable |
| S3 | Stately docs, Installation | https://stately.ai/docs/installation | Install command, zero dependencies |
| S4 | Stately docs, TypeScript | https://stately.ai/docs/typescript | TS 5.0+, `strictNullChecks`, `skipLibCheck`, `setup({ types })` |
| S5 | Stately docs, Typegen | https://stately.ai/docs/typegen | Typegen not supported in v5 |
| S6 | Stately docs, Migrating to v5 | https://stately.ai/docs/migration | Why typegen is not needed; TS requirements |
| S7 | npm registry, `@xstate/cli` | https://www.npmjs.com/package/@xstate/cli (via `npm view @xstate/cli`) | CLI depends on `xstate ^4.33.4` |
| S8 | Stately docs, Setup | https://stately.ai/docs/setup | `setup(...)`, `.createMachine(...)` |
| S9 | Stately docs, Delayed transitions | https://stately.ai/docs/delayed-transitions | `after`, referenced and dynamic delays, timer cancel on exit |
| S10 | Stately docs, Callback actors | https://stately.ai/docs/callback-actors | `fromCallback`, `sendBack`, `receive`, cleanup, no output |
| S11 | Stately docs, Promise actors | https://stately.ai/docs/promise-actors | `fromPromise`, `input`, `signal` |
| S12 | Stately docs, Invoke | https://stately.ai/docs/invoke | `onDone`/`onError`, invoked actors stop on state exit |
| S13 | Stately docs, Actions | https://stately.ai/docs/actions | `assign`, `raise`, `sendTo`, `enqueueActions`, built-ins are not imperative |
| S14 | Stately docs, Transitions (Re-entering) | https://stately.ai/docs/transitions | `reenter: true` restarts invoked actors |
| S15 | Stately docs, Final states | https://stately.ai/docs/final-states | Top-level final terminates the machine; `output` |
| S16 | Stately docs, Actors | https://stately.ai/docs/actors | `createActor`, `subscribe`, `getSnapshot`, `waitFor` |
| S17 | Stately docs, Testing | https://stately.ai/docs/testing | Arrange/act/assert, `always` states not observable, `xstate/graph` |
| S18 | Stately docs, Inspection | https://stately.ai/docs/inspection | `inspect` option and event types |
| S19 | `@statelyai/inspect` README | https://github.com/statelyai/inspect | Node.js WebSocket inspector |
| S20 | xstate source, `SimulatedClock` and `ActorOptions` (5.33.2) | https://github.com/statelyai/xstate/tree/main/packages/core/src (read from the installed package `dist/declarations/src/SimulatedClock.d.ts`, `types.d.ts`) | Exact `SimulatedClock` API, `clock` option, default clock |
| S21 | xstate test `clock.test.ts` | https://github.com/statelyai/xstate/blob/main/packages/core/test/clock.test.ts | First-party usage of `SimulatedClock` |
| S22 | Local prototype (this research) | `/private/tmp/claude-501/xstate-research/` (not in repo) | Ran the supervisor shape on xstate 5.33.2, Node 24.21.0, TypeScript 7.0.2 and 5.9, Vitest 5.0.3 |

## Versions

Checked 2026-10-03.

- `xstate` newest stable: **5.33.2**, published 2026-09-15 (S1, S2). The `latest` dist-tag points to it. `alpha` is `6.0.0-alpha.63`; do not use it (S1).
- `@statelyai/inspect`: 0.7.2, peer `xstate ^5.5.1` (`npm view @statelyai/inspect`, S19).
- `@xstate/cli`: 0.5.17, depends on `xstate ^4.33.4`, so it is v4 only (S7).
- TypeScript: XState 5 needs TS 5.0 or newer; the docs say to use the latest (S4, S6). The prototype type-checks clean with TS 7.0.2 and TS 5.9 under `strict` (S22).

## Install command

XState has zero dependencies (S3). Per the spec, add it to the pnpm catalog and reference it from `apps/server` only:

```yaml
# pnpm-workspace.yaml
catalog:
  xstate: 5.33.2
```

```sh
pnpm --filter @repo/server add xstate@catalog:
```

`@statelyai/inspect` is optional and dev-only (see Inspection below).

## Generator command

None. Typegen is not supported in XState 5 (S5). The migration guide says `setup()` and improved inference cover what typegen did (S6). `@xstate/cli` (the typegen CLI) depends on `xstate ^4` (S7), so it does not apply. There is no scaffolding command; you write the machine by hand.

## Recommended configuration

### TypeScript

`strictNullChecks: true` (or `strict: true`) is required for the types to work; `skipLibCheck: true` is recommended (S4). See Gotchas for why `skipLibCheck` matters with `exactOptionalPropertyTypes`.

### Machine shape with `setup`

`setup({ types, actors, actions, guards, delays })` returns an object whose `.createMachine(...)` gives a fully typed machine (S8, S4). Delays can be numbers or functions of `{ context, event }`; `after` references them by key (S9). Delay timers are cancelled when the state is exited (S9).

Shape confirmed against 5.33.2 (S22). Names are illustrative.

```ts
import { assign, fromCallback, setup } from 'xstate';

type WorkerEvent =
  | { type: 'worker.ready'; port: number }
  | { type: 'worker.heartbeat' }
  | { type: 'worker.exit'; code: number | null };

export const supervisorMachine = setup({
  types: {
    context: {} as { attempt: number; crashTimes: number[]; port: number | null },
    events: {} as WorkerEvent | { type: 'signal' },
    output: {} as { exitCode: number },
  },
  actors: { worker: workerLogic }, // fromCallback, below
  delays: {
    backoff: ({ context }) => Math.min(250 * 2 ** context.attempt, 30_000),
    heartbeatTimeout: 3_000,
  },
  guards: {
    crashedTooOften: ({ context }) => context.crashTimes.length >= 5,
  },
}).createMachine({
  id: 'supervisor',
  context: { attempt: 0, crashTimes: [], port: null },
  initial: 'starting',
  on: { signal: '.stopping' },
  states: {
    starting: { /* invoke worker, on worker.ready -> running */ },
    running: {
      // Keep the worker alive across heartbeats: re-enter a child state, not the invoking state.
      initial: 'waiting',
      states: {
        waiting: {
          after: { heartbeatTimeout: { target: '#supervisor.backingOff' } },
          on: { 'worker.heartbeat': { target: 'waiting', reenter: true } },
        },
      },
    },
    backingOff: {
      always: { guard: 'crashedTooOften', target: 'failed' },
      entry: assign({ attempt: ({ context }) => context.attempt + 1 }),
      after: { backoff: 'starting' },
    },
    stopping: { type: 'final' },
    failed: { type: 'final' },
  },
  output: ({ context }) => ({ exitCode: context.crashTimes.length >= 5 ? 1 : 0 }),
});
```

### Wrapping the child process with `fromCallback`

`fromCallback(({ input, sendBack, receive, self, system, emit }) => cleanup)` (S10, S20). `sendBack` sends events to the parent; `receive` registers a listener for events sent to the actor (for example with `sendTo('worker', { type: ... })`); the returned function runs when the actor stops, including when the invoking state is exited (S10, S12). Callback actors produce no output; they run until stopped or until they throw (S10).

```ts
import { fork } from 'node:child_process';
import { fromCallback } from 'xstate';

export const workerLogic = fromCallback<{ type: 'worker.stop' }, { entry: string }>(
  ({ input, sendBack, receive }) => {
    const child = fork(input.entry);
    const onMessage = (raw: unknown) => {
      // Validate with Zod here (AGENTS.md: validate outside data at its boundary).
      sendBack(raw as WorkerEvent);
    };
    const onExit = (code: number | null) => sendBack({ type: 'worker.exit', code });
    child.on('message', onMessage);
    child.on('exit', onExit);
    receive((event) => {
      if (event.type === 'worker.stop') child.kill('SIGTERM');
    });
    return () => {
      child.off('message', onMessage);
      child.off('exit', onExit);
      if (child.exitCode === null) child.kill('SIGTERM');
    };
  },
);
```

`fromPromise(async ({ input, signal }) => ...)` is the fit for one-shot work such as writing or removing `server.json`; invoke takes `onDone` on resolve and `onError` on reject, and `signal` aborts when the actor stops (S11, S12).

### Actions

- `assign`, `raise`, `sendTo` return action objects that the machine interprets; never call them inside a custom action function (S13).
- `raise` sends an event to the same machine (S13). `sendTo(id, event)` sends to a child, such as the invoked worker (S13, S10).
- `enqueueActions(({ context, event, enqueue, check }) => ...)` is the way to choose built-in actions conditionally; `enqueue.assign`, `enqueue.raise`, `enqueue.sendTo` and so on are available (S13).

### Final states and output

Reaching a top-level final state terminates the machine; it can no longer receive events (S15). The machine's `output` function runs then, and the value is on `snapshot.output` (S15, S16). Invoked children are stopped, so callback cleanups run (S12; seen in S22). `actor.subscribe({ complete })` fires on termination (S22). The runner reads `snapshot.output.exitCode` and calls `process.exit`.

### Running it

```ts
import { createActor } from 'xstate';

const actor = createActor(supervisorMachine);
actor.subscribe({ next: (snapshot) => {/* log */}, complete: () => {/* exit */} });
actor.start();
process.on('SIGINT', () => actor.send({ type: 'signal' }));
process.on('SIGTERM', () => actor.send({ type: 'signal' }));
```

`createActor`, `actor.subscribe`, `actor.getSnapshot()`, and `actor.send` are the documented actor API (S16).

### Testing with Vitest

The docs recommend arrange, act, assert: create the actor, send events, assert on `getSnapshot()` (S17).

- **Swap the worker.** `machine.provide({ actors: { worker: fakeLogic } })` replaces implementations by name (S8, S16; `provide` with `actions` shown in the cheatsheet). A fake `fromCallback` that calls `sendBack({ type: 'worker.ready', port: 1 })` drives the machine without forking (S22).
- **Control time, option A: `SimulatedClock`.** Exported from `xstate`; pass it as `createActor(machine, { clock })` (S20, S21). Methods: `increment(ms)`, `set(ms)` (cannot go backwards), `now()`, `start(speed)` (S20). `increment` runs every due timeout synchronously (S20). The docs page lists "Simulated clock" under Testing with no code (S9); the first-party test shows the usage:

  ```ts
  const clock = new SimulatedClock();
  const actor = createActor(machine, { clock }).start();
  clock.increment(10_000);
  ```

- **Control time, option B: `vi.useFakeTimers()`.** The default clock calls the global `setTimeout`/`clearTimeout` at call time, not a captured reference (S20), so Vitest fake timers drive `after` delays. Confirmed with Vitest 5.0.3: `vi.advanceTimersByTime` moved a dynamic-delay `after` transition (S22). This also fakes `Date.now()`, which `SimulatedClock` does not (see Gotchas).
- **Wait for async outcomes.** `waitFor(actor, predicate, { timeout, signal })` resolves when a snapshot matches, immediately if it already does, and rejects on error or timeout (S16, S20).
- **Model-based tests** now live in `xstate/graph`; `@xstate/test` is deprecated (S17).

### Inspection

`createActor(machine, { inspect })` receives `@xstate.actor`, `@xstate.event`, `@xstate.snapshot`, and `@xstate.microstep` events for every actor in the system (S18). A plain callback is enough for logging supervisor transitions to `~/.argo/logs/`. For a visual view of a Node process, `@statelyai/inspect` offers `createWebSocketInspector` plus `createInspectorServer` from `@statelyai/inspect/server` (S19); it is optional and should stay a dev dependency.

## pnpm + Turborepo monorepo specifics

- Only `apps/server` needs `xstate` (ADR 0003: XState runs only on the Server). Put the version in the pnpm catalog so `sherif` sees one version (spec section 2).
- No code generation, so no Turborepo `generate` task and no generated files to cache or ignore (S5, S7).
- The package ships ESM and CJS with `types` conditions in `exports` (`xstate`, `xstate/actions`, `xstate/actors`, `xstate/guards`, `xstate/dev`, `xstate/graph`) and `"sideEffects": false` (S20, from `package.json`). It resolves under `module`/`moduleResolution: NodeNext` and runs directly in Node 24 `.mts` files (S22), so `tsx` needs nothing special.
- `@statelyai/inspect` has a peer on `xstate ^5.5.1` (S19); if added, keep it in the catalog too.

## Gotchas

1. **`reenter: true` restarts invoked actors.** A self-transition with `reenter: true` stops and restarts the state's invocations (S14). If `running` invokes the worker and a heartbeat re-enters `running` to reset the timer, every heartbeat forks a new worker. The prototype counted 3 forks for 2 heartbeats (S22). Fix: invoke on a parent state and re-enter a child state for the heartbeat timer, as in the snippet above (S22: 1 fork).
2. **One invoke per state means one fork per state.** If `starting` and `running` each invoke the worker, moving from `starting` to `running` stops the first child and forks a second (S12; seen in S22). Invoke the worker once on a parent state that holds both, or move the fork out of the machine.
3. **`exactOptionalPropertyTypes` with `skipLibCheck: false` fails.** With 5.33.2, `setup.d.ts` reports TS2344 errors under `exactOptionalPropertyTypes: true` unless `skipLibCheck: true` (S22). The docs recommend `skipLibCheck: true` anyway (S4).
4. **`SimulatedClock` does not fake `Date.now()`.** It only schedules XState timers (S20). A crash window that reads `Date.now()` in an action will see real time. Either use `vi.useFakeTimers()` (which fakes both), or pass a `now` function in through `input`.
5. **`always` states are invisible.** A state entered and left by eventless transitions in one step never appears in snapshots or to `waitFor` (S17). A `backingOff` that jumps straight to `failed` through `always` is fine; assert on `failed`, not on `backingOff`.
6. **Callback actors have no output and no snapshot data** (S10). Report worker facts (port, exit code) back with `sendBack` and store them with `assign`.
7. **Built-in actions are not imperative.** Calling `assign(...)` or `sendTo(...)` inside a custom action does nothing; use `enqueueActions` (S13).
8. **Minor releases may change types.** The SemVer policy reserves the right to change TypeScript declarations and some behaviour in minor releases; read release notes before upgrading (README "SemVer Policy", S20). Pin an exact version in the catalog.
