# Model-based tests for XState machines with `xstate/graph`

Research for the owner's rule that every XState machine is covered by model-based tests. It covers the Server supervisor (`apps/server/src/supervisor/machine.ts`), a proposed worker machine (`apps/server/src/worker/`), spec 0001 section 5, and ADR 0003. Checked on 2026-10-03 against xstate 5.33.2 and Vitest 5.0.3.

## Sources

| # | Title | URL | Used for |
|---|---|---|---|
| S1 | npm registry, `@xstate/graph` | https://www.npmjs.com/package/@xstate/graph (via `npm view @xstate/graph versions dist-tags peerDependencies time`) | Versions, peer range, release dates, no deprecation flag |
| S2 | npm registry, `@xstate/test` | https://www.npmjs.com/package/@xstate/test (via `npm view`) | Deprecation message, v6 alpha |
| S3 | npm registry, `xstate` | https://www.npmjs.com/package/xstate (via `npm view xstate dist-tags time`) | 5.20.0 and 5.30.0 release dates |
| S4 | xstate core CHANGELOG | https://github.com/statelyai/xstate/blob/xstate%405.33.2/packages/core/CHANGELOG.md | 5.20.0: graph and test utilities moved into `xstate/graph`; 5.30.0: `filterEvents` |
| S5 | `@xstate/graph` CHANGELOG at 3.0.4 | https://github.com/statelyai/xstate/blob/%40xstate/graph%403.0.4/packages/xstate-graph/CHANGELOG.md | Last release only bumps `xstate@5.19.4` |
| S6 | `xstate/graph` source at `xstate@5.33.2` | https://github.com/statelyai/xstate/tree/xstate%405.33.2/packages/core/src/graph | `TestModel.ts`, `graph.ts`, `adjacency.ts`, `shortestPaths.ts`, `simplePaths.ts`, `pathFromEvents.ts`, `alterPath.ts`, `validateMachine.ts`, `actorScope.ts`, `types.ts`, `index.ts` |
| S7 | `xstate/graph` tests at `xstate@5.33.2` | https://github.com/statelyai/xstate/tree/xstate%405.33.2/packages/core/src/graph/test | `shortestPaths.test.ts` ("should work for machines with delays"), `forbiddenAttributes.test.ts`, `paths.test.ts` (`filterEvents` with `can`), `index.test.ts` (`limit`) |
| S8 | Installed `xstate@5.33.2` package | `node_modules/.pnpm/xstate@5.33.2/node_modules/xstate/` (`package.json` exports, `dist/declarations/src/graph/*.d.ts`) | Exact published signatures and the `./graph` export map |
| S9 | Stately docs, Graph & Paths | https://stately.ai/docs/graph (source: https://github.com/statelyai/docs/blob/main/content/docs/graph.mdx) | Callout that `@xstate/graph` is deprecated, API walkthrough, `createTestModel` example |
| S10 | Stately docs, Testing | https://stately.ai/docs/testing (source: `content/docs/testing.mdx`) | `@xstate/test` deprecated in favour of `xstate/graph`; `always` states not observable; mocking effects |
| S11 | Stately docs, `@xstate/test` | https://stately.ai/docs/xstate-test (source: `content/docs/xstate-test.mdx`) | Stale callout that still points at `@xstate/graph` |
| S12 | Stately docs, `@xstate/graph` | https://stately.ai/docs/xstate-graph (source: `content/docs/xstate-graph.mdx`) | Stale page that still says `npm install @xstate/graph` |
| S13 | Stately docs, Delayed transitions | https://stately.ai/docs/delayed-transitions | Testing section is a bare "Simulated clock" bullet |
| S14 | Local prototype (this research) | Scratch folder, not in the repo | Ran `xstate/graph` against the supervisor at commits before and after `42e3143`, a parallel `backingOff` variant, and a worker machine, with Vitest 5.0.3 fake timers; type-checked with `tooling/typescript/node.json` |

## Versions

Checked 2026-10-03.

- **`@xstate/graph`**: newest stable **3.0.4**, `latest` tag, published 2025-05-31 (S1). Peer: `xstate ^5.19.4` (S1), so 5.33.2 satisfies it. 3.0.4 only bumped its `xstate` dependency to 5.19.4 (S5). No release since. npm does not mark it deprecated (S1), but the docs do (S9).
- **The utilities moved into `xstate` itself in 5.20.0** (2025-06-19): "The graph and model-based testing utilities from @xstate/graph (and @xstate/test previously) were moved to the core `xstate` package", imported from `xstate/graph` (S4, S3). The graph docs say: "Import from `xstate/graph` instead of the deprecated `@xstate/graph` package" (S9).
- `xstate/graph` has had fixes since the split. For example, 5.30.0 (2026-03-28) added `filterEvents` (S4). `@xstate/graph` 3.0.4 lacks them.
- **xstate 5.33.2 already ships `xstate/graph`** with `types`, `import`, `module` and `development` conditions (S8). The repo pins xstate 5.33.2 exactly, so **no new dependency is needed**.
- **`@xstate/test`**: `latest` is 0.5.1, peer `xstate ^4.29.0`, deprecated with "Superseded by @xstate/test@2 (model-based and property-based testing for XState v6). Path utilities live in xstate/graph." (S2). `2.0.0-alpha.1` (2026-09-30) is built on fast-check and peers `xstate ^6.0.0-alpha.63` and `vitest ^3.0.0` (S2), so it does not fit xstate 5 or Vitest 5. The Testing docs call `@xstate/test` deprecated in favour of `xstate/graph` (S10).
- Docs drift: the `@xstate/test` page still says the utilities "are now part of the latest `@xstate/graph` package" (S11), and the `@xstate/graph` page still says to install it (S12). The changelog (S4), the Graph page (S9) and the Testing page (S10) agree on `xstate/graph`.

## Install command

None. Import from the subpath that the pinned `xstate` already exports:

```ts
import { TestModel, getShortestPaths, getSimplePaths } from 'xstate/graph';
```

Under the repo's `moduleResolution: "bundler"`, `tsc` resolves `xstate/graph` to `dist/xstate-graph.cjs.d.mts` with no extra config. Vitest picks the `development` build (`xstate-graph.development.cjs.js`) (S8, S14).

## API in 5.33.2

Signatures are quoted from the published declarations (S8), which match the source at the tag (S6).

### Exports

```ts
export { TestModel, createTestModel } from "./TestModel.js";
export { adjacencyMapToArray, getAdjacencyMap } from "./adjacency.js";
export { getStateNodes, joinPaths, serializeSnapshot, toDirectedGraph } from "./graph.js";
export { getPathsFromEvents } from "./pathFromEvents.js";
export * from "./pathGenerators.js";   // createShortestPathsGen, createSimplePathsGen
export { getShortestPaths } from "./shortestPaths.js";
export { getSimplePaths } from "./simplePaths.js";
export * from "./types.js";
```

`deduplicatePaths` appears in the docs (S9) but is **not exported** (S6, S8). `TestModel.getPaths` applies it internally.

### `createTestModel` and `TestModel`

```ts
export declare function createTestModel<TMachine extends AnyStateMachine>(
  machine: TMachine,
  options?: Partial<TestModelOptions<SnapshotFrom<TMachine>, EventFromLogic<TMachine>, InputFrom<TMachine>>>
): TestModel<SnapshotFrom<TMachine>, EventFromLogic<TMachine>, unknown>;

export declare class TestModel<TSnapshot extends Snapshot<unknown>, TEvent extends EventObject, TInput> {
  constructor(testLogic: ActorLogic<TSnapshot, TEvent, TInput>, options?: Partial<TestModelOptions<TSnapshot, TEvent, TInput>>);
  getShortestPaths(options?: GetPathOptions<TSnapshot, TEvent, TInput>): Array<TestPath<TSnapshot, TEvent>>;
  getShortestPathsFrom(paths: Array<TestPath<TSnapshot, TEvent>>, options?: GetPathOptions<...>): Array<TestPath<TSnapshot, TEvent>>;
  getSimplePaths(options?: GetPathOptions<TSnapshot, TEvent, TInput>): Array<TestPath<TSnapshot, TEvent>>;
  getSimplePathsFrom(paths: Array<TestPath<TSnapshot, TEvent>>, options?: GetPathOptions<...>): Array<TestPath<TSnapshot, TEvent>>;
  getPathsFromEvents(events: TEvent[], options?: GetPathOptions<TSnapshot, TEvent, TInput>): Array<TestPath<TSnapshot, TEvent>>;
  getPaths(pathGenerator: PathGenerator<TSnapshot, TEvent, TInput>, options?: GetPathOptions<...>): Array<TestPath<TSnapshot, TEvent>>;
  getAdjacencyMap(): AdjacencyMap<TSnapshot, TEvent>;
  testPath(path: StatePath<TSnapshot, TEvent>, params: TestParam<TSnapshot, TEvent>, options?: Partial<TestModelOptions<...>>): Promise<TestPathResult>;
}

type GetPathOptions<TSnapshot, TEvent, TInput> = Partial<TraversalOptions<TSnapshot, TEvent, TInput>> & {
  allowDuplicatePaths?: boolean; // @default false
};
```

- **`createTestModel` rejects the supervisor.** It calls `validateMachine`, which throws `'Invocations on test machines are not supported'` for any `invoke`, `'After events on test machines are not supported'` for any `after`, and also throws for inline delayed actions (S6 `validateMachine.ts`, S7 `forbiddenAttributes.test.ts`). The supervisor uses `after` in three states. Prototype: `createTestModel(supervisorMachine)` throws "After events on test machines are not supported" (S14).
- **`new TestModel(machine, options)` does not validate** (S6). It is a public export (S8), but the docs only show `createTestModel` (S9). Its defaults differ from `createTestModel`'s, so pass the following yourself (S6):
  - `events`: defaults to `[]`, so nothing is explored.
  - `stateMatcher`: defaults to `(_, key) => key === '*'`.
  - `serializeState`: defaults to `JSON.stringify` of the whole snapshot.

### Traversal options

```ts
export type TraversalOptions<TSnapshot, TEvent, TInput> = { input?: TInput }
  & Partial<Pick<SerializationConfig<TSnapshot, TEvent>, 'serializeState' | 'serializeEvent'>>
  & Partial<Pick<TraversalConfig<TSnapshot, TEvent>, 'events' | 'filterEvents' | 'limit' | 'fromState' | 'stopWhen' | 'toState'>>;

interface TraversalConfig<TSnapshot, TEvent> {
  events: readonly TEvent[] | ((state: TSnapshot) => readonly TEvent[]);
  filterEvents: ((snapshot: TSnapshot, event: TEvent) => boolean) | undefined;
  limit: number;                 // @default Infinity
  fromState: TSnapshot | undefined;
  stopWhen: ((state: TSnapshot) => boolean) | undefined;
  toState: ((state: TSnapshot) => boolean) | undefined;
  serializeState: (state: TSnapshot, event: TEvent | undefined, prevState?: TSnapshot) => string;
  serializeEvent: (event: TEvent) => string;
}
```

- **`events`**: the event objects tried from each state, payloads included. In `createTestModel` and the machine defaults of `getShortestPaths`, each event type the state handles (from `__unsafe_getAllOwnEventDescriptors`) is sent as `{ type }` unless `events` has objects of that type (S6 `graph.ts`, `TestModel.ts`). See Gotcha 3 for where that merge is lost.
- **`filterEvents`** (5.30.0+): skips an event from a state. The changelog example is `filterEvents: (state, event) => state.can(event)` (S4, S7 `paths.test.ts`).
- **`limit`**: the option is `limit`, not `traversalLimit`. It counts dequeued states, including repeats, and throws `'Traversal limit exceeded'` (S6 `adjacency.ts`, S7 `index.test.ts`).
- **`stopWhen`**: does not expand past matching states (S6).
- **`toState`**: keeps only paths that end in matching states, and also becomes `stopWhen` when you set no `stopWhen` (S6 `graph.ts`: `stopWhen: traversalOptions?.toState`).
- **`serializeState`**: decides which snapshots are "the same vertex". `createTestModel` uses `serializeSnapshot` (value plus context) plus ` via <event> from <prev value>`. It drops that suffix when the state value does not change (S6 `serializeMachineTransition`).
- **`allowDuplicatePaths: false`** (the default) drops every path that is a prefix of a longer one (S6, S8).

### Paths and running them

```ts
export interface TestPath<TSnapshot, TEvent> extends StatePath<TSnapshot, TEvent> {
  description: string;
  test: (params: TestParam<TSnapshot, TEvent>) => Promise<TestPathResult>;
}
export interface TestParam<TSnapshot, TEvent> {
  states?: { [key: string]: (state: TSnapshot) => void | Promise<void> };
  events?: { [TEventType in TEvent['type']]?: EventExecutor<TSnapshot, { type: ExtractEvent<TEvent, TEventType>['type'] }> };
}
export type EventExecutor<TSnapshot, TEvent> = (step: Step<TSnapshot, TEvent>) => Promise<any> | void;
```

- Every path starts with a synthetic step `{ event: { type: 'xstate.init' }, state: <initial> }`. Each later `step.state` is the state **after** `step.event` (S6 `alterPath.ts`).
- `testPath` loops over the steps in order. For each one it awaits the executor for `step.event.type` if there is one (`eventExec?.(step)`, so a missing executor is a silent no-op), then runs every `states` entry whose key passes `stateMatcher`. `'*'` runs only when no key matches (S6).
- On failure it appends the whole path, state by state, to the error message (S6 `formatPathTestResult`).
- `description` embeds the full context as JSON (S6 `getDescription`). Build your own test titles.
- `getPathsFromEvents(logic, events, options)` returns the one path for a fixed event list, and throws `Invalid transition from … with …` if an event is not in the adjacency map (S6). It is useful for one named scenario.

## How traversal treats delays, guards, actors and final states

The traversal is pure. It calls `logic.transition(snapshot, event, actorScope)` with a mock actor scope whose `actionExecutor`, `defer`, `stopChild` and `emit` do nothing (S6 `actorScope.ts`, `adjacency.ts`). In the prototype, no custom action ran and no worker was forked while paths were generated (S14).

- **Delayed transitions (`after`)**: `getShortestPaths` and `getSimplePaths` treat them as events named `xstate.after.<delay>.<state id>`. A first-party test asserts the path `['xstate.init', 'xstate.after.1000.(machine).a']` (S7 `shortestPaths.test.ts`). For the supervisor the names are `xstate.after.readyTimeout.supervisor.starting`, `xstate.after.heartbeatTimeout.supervisor.running` and `xstate.after.backoff.supervisor.backingOff` (S14). The naming is not documented on the Stately site (S9, S13). Named delays in `setup({ delays })` give readable names; inline numbers would give `xstate.after.5000.…`. In the graph a delay is an input that you can send any number of times, but a real timer fires once per state entry.
- **Guards with context** run on the real context during traversal. The crash counter works, but `recordCrash` calls `Date.now()`, so traversal stores real timestamps. All of them fall inside the 10-minute window, so the graph can never reach "old crashes forgotten" (S14).
- **`always` transitions** resolve inside the step, so `backingOff` with 10 crashes never becomes a vertex. The path goes straight to `failed` (S14, matching S10 on unobservable `always` states).
- **Invoked and spawned actors** are never started during traversal (S14). Their completion is an event like any other: `xstate.done.actor.<id>` and `xstate.error.actor.<id>` show up as edges and are explored (worker prototype, S14). `createTestModel` refuses `invoke` (S6); `new TestModel` does not.
- **State `onDone`** shows up as an `xstate.done.state.<id>` edge. Traversal will happily "send" it before the regions are done, which jumps straight out of a parallel state (S14). Exclude these events (Gotcha 5).
- **Final states**: a root-level `on` still applies in pure traversal, so the graph takes `failed --server.stop--> stopping` even though a done actor ignores events. The prototype's two paths through that edge failed against the real actor until `filterEvents` required `snapshot.status === 'active'` (S14).

## What the docs recommend for testable machines

- Arrange, act, assert on `createActor`, `send`, `getSnapshot` (S10).
- Mock effects by supplying actions and actors to `setup` or `machine.provide` (S10). Mock promise actors with `fromPromise` (S10).
- To observe a transient state, use the inspection API or `after: { 0: … }` instead of `always` (S10).
- For model-based testing, use `createTestModel` and give `path.test({ events, states })` executors and assertions (S9). The docs do not say what to do about `after` or `invoke`; the validator just refuses them (S6). The delayed-transitions page lists "Simulated clock" under Testing with no text (S13).

In short, the first-party path for machines with timers and invoked actors is the path functions or `new TestModel`, with time driven by the test. That is what this note recommends.

## Plan for the supervisor

### Machine changes

None are required for coverage: the prototype ran at both `HEAD~1` and `42e3143` (S14). Three changes make the model cleaner and follow the owner's comments.

1. **Model the `backingOff` wait as parallel regions, not context flags.** Since `42e3143`, `backingOff` waits for both `worker.exited` and the backoff delay, using `workerExited` and `backoffElapsed` in context. In the prototype at `42e3143`:
   - The flags are not reset on leaving `backingOff`, so `starting` and `running` carry a stale `backoffElapsed: true`. That doubles those vertices.
   - The coverage check reported 46 edges that only differ by flags.
   - Assertions have to read the flags instead of the state value.

   A parallel `backingOff` makes the wait visible in the state value, and the graph shrinks to 20 distinct value-level transitions. Model tests: 161 shortest paths and 474 simple paths (up to two crashes), all passing; the coverage check passes (S14).

   ```ts
   backingOff: {
     type: 'parallel',
     entry: [{ type: 'askWorkerToStop' }, { type: 'recordCrash' }],
     always: { guard: 'crashedTooOften', target: 'failed' },
     states: {
       worker: {
         initial: 'stopping',
         states: {
           stopping: { on: { 'worker.exited': { target: 'exited', actions: stopChild('worker') } } },
           exited: { type: 'final' },
         },
       },
       delay: {
         initial: 'waiting',
         states: {
           waiting: { after: { backoff: { target: 'elapsed' } } },
           elapsed: { type: 'final' },
         },
       },
     },
     onDone: { target: 'starting' },
   },
   ```

   This removes `workerExited`, `backoffElapsed`, their guards and their `assign`s. The two example tests added in `42e3143` pass as model paths: exit before the delay, and delay before the exit.

2. **Keep `after` with named delays.** Do not turn delays into events. That would move the timers into a second actor, which `createTestModel` also refuses (`invoke`). It would also leave the real delay values untested. With `after`, the executor advances fake timers by the spec's numbers, so the real timer wiring is under test.

3. **Move the `server.json` writes into the machine (owner comment 1).** Put `writeServerAddress` and `removeServerAddress` in `setup({ actions })` and implement them inline with `node:fs` and `ServerAddress` from `@repo/contracts`. Delete `server-address-file.ts`. Keep the behaviour:
   - Write a temp file, then rename it.
   - Write only when the port is known.
   - Remove the file only when it names this `process.pid`.

   The prototype ran with this change and the model suite passed (S14). Two facts matter:
   - Model tests replace both actions with `machine.provide({ actions: { writeServerAddress, removeServerAddress } })`, which record calls in memory (S10 "Mocking effects"; sketch below). The model then checks **when** the machine writes and removes, and example tests on the real actions check **what** they do to the disk.
   - A custom action that throws puts the actor in `status: 'error'` and calls the observer's `error` (verified with 5.33.2, S14). A failed write (disk full, permissions) would therefore end the supervisor through `index.ts`'s `error` handler with exit code 1. Today the helper throws in the same place, so behaviour does not change, but it is now visible in the machine.

   The crash window stays as it is (`Date.now()` in `recordCrash`). The graph cannot reach "old crashes forgotten" (see above), so one example test keeps it.

### System under test

The real machine actor (`createActor(machine.provide(…))`) is the system under test. It runs with:

- **A mock worker**: a `fromCallback` that records itself, notes `worker.stop` through `receive`, and marks itself stopped in its cleanup. Executors drive it with `sendBack`.
- **Mock `server.json` actions** that record writes and removals.
- **Vitest fake timers** (`vi.useFakeTimers()`), which also fake `Date.now()` for `recordCrash`.

The model is the same machine as the system under test. Without effect checks, state checks would only compare the machine with itself, and the mutation runs below show that. The value comes from three things that the model does not supply:

- the **timer executors**, which use the spec's 15 s, 5 s and `500·2^(n-1)` capped at 30 s, and check that the state holds 1 ms before each delay;
- the **effect assertions** per state (live workers, `server.json` writes and removals, `status`);
- the **crash limit of 10**, asserted in `failed`.

Mutation runs on the prototype (S14). Each change was caught:

| Change | Failing tests |
|---|---|
| Backoff base 400 ms | 595 of 636 |
| Limit 9 crashes | 6, and only because `failed` asserts 10 |
| `stopping` does not remove `server.json` | 269 of 636 |
| Heartbeat timeout 6 s | 275 of 636 |
| Heartbeat without `reenter` | 118 of 636 |

One change cannot be caught: removing a transition, such as the watch-mode `worker.ready` in `running`. The model shrinks along with the machine, and the suite still passed (S14). Keep an example test for any behaviour that the spec requires.

### Paths

- **Shortest paths to every vertex**: `model.getShortestPaths()`.
  - The serialization includes `via: "<previous value> <event type>"`, so every transition into a vertex counts as its own vertex. Self-transitions (heartbeat, watch-mode `worker.ready`) are then walked (Gotcha 6).
  - This yields 161 tests on the parallel `backingOff`. The longest path is the one to `failed`, about 30 steps.
- **Simple paths, bounded**: `model.getSimplePaths({ stopWhen: (snapshot) => snapshot.context.crashTimes.length >= 2 })` gives 474 tests. These cover the orderings: exit before the delay, delay before the exit, and stop from each sub-state.
  - Do not run simple paths unbounded. Each extra allowed crash multiplies the count by about 4. Measured on the pre-`42e3143` machine: 6, 30, 126, 510, 2 046 and 8 190 paths for bounds of 1 to 6 crashes, and 6.5 s just to generate the last one. A bound of 10 would be about 2 million paths (S14).
- **A transition-coverage test**: build the adjacency map with the same options, list every `(from value, event, to value)`, and assert that the generated paths walk each one. This fails when a new transition is only reachable beyond the simple-path bound, or when dedup hides it.

The whole supervisor suite, path generation included, ran in about 5 s on the prototype (S14).

### What to assert in each state

| State | Assertions |
|---|---|
| every state | the actor's `value`, `status` and crash count equal the model's |
| `starting` | exactly one live worker; no `server.json` write yet if the port is still `null` |
| `running` | one live worker; the last write is `{port: 7337, version, startedAt}` |
| `backingOff` | live workers: 1 in `worker.stopping`, 0 in `worker.exited`; the worker was asked to stop before `worker.exited`; fewer than 10 crashes; no removal |
| `failed` | `status: 'done'`; exactly 10 crashes; no live worker; one removal |
| `stopping` | `status: 'done'`; no live worker; one removal |

### Which of today's `machine.test.ts` cases the model covers

| Example test | Covered by the model? |
|---|---|
| writes `server.json` with its own pid and port once ready | When: yes (`running`). What lands on disk: keep as an example test on the real action |
| stays running while heartbeats arrive | Yes. The heartbeat executor waits 4 999 ms before each heartbeat, then the timeout executor checks the reset |
| restarts a worker that exits, and keeps `server.json` | Yes (`backingOff` has no removal; `running` again after restart) |
| stops and restarts a worker that misses its heartbeat | Yes |
| restarts a worker that never becomes ready | Yes |
| doubles the restart delay, up to 30 s | Yes. The backoff executor uses the spec formula on the path to `failed` |
| fails, removes `server.json`, stops after 10 crashes | Yes |
| forgets crashes older than 10 minutes | **No**: traversal time does not pass. Keep |
| stops the worker and removes `server.json` when asked | Yes, from every state |
| leaves a `server.json` with another pid when it fails | **No**: a property of the real action on disk. Keep |
| leaves a `server.json` with another pid when asked to stop | **No**: same. Keep |
| starts the next worker only after the old one has exited (`42e3143`) | Yes |
| waits out the restart delay when the old worker exits at once (`42e3143`) | Yes |

Keep four example tests, all running the real `server.json` actions against a temp `ARGO_HOME`:

- the crash window;
- an own-pid file is written atomically, with no `.tmp` left behind;
- a foreign file is left in place on `failed`;
- a foreign file is left in place on `stopping`.

Today's `fakeWorker` and `FakeWorker` should be renamed `mockWorker` and `MockWorker` (AGENTS.md: "Call them mocks"). If two test files share the mock, it moves to `apps/server/mocks/` (AGENTS.md: "Test assets live outside `src/`"). One test file per machine avoids that.

### Sketch of the test file

This is the prototype that ran green against the parallel `backingOff` with the actions inside the machine. It type-checks under `tooling/typescript/node.json` (S14). The four example tests above go in the same file, using a second `provide` with only the worker mock.

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Actor, type AnyEventObject, createActor, fromCallback, type SnapshotFrom } from 'xstate';
import {
  adjacencyMapToArray,
  type DirectedGraphNode,
  type EventExecutor,
  getAdjacencyMap,
  TestModel,
  toDirectedGraph,
} from 'xstate/graph';
import { supervisorMachine } from './machine';
import type { WorkerCommand } from './worker-message';

// Spec 0001 section 5 numbers, written out so the model cannot grade itself.
const readyTimeoutMs = 15_000;
const heartbeatTimeoutMs = 5000;
const maxCrashes = 10;
const backoffMs = (crashes: number) => Math.min(500 * 2 ** (crashes - 1), 30_000);

interface MockWorker {
  send: (event: AnyEventObject) => void;
  askedToStop: boolean;
  stopped: boolean;
}
let workers: MockWorker[];
let serverAddressWrites: unknown[];
let serverAddressRemovals: number;
let supervisor: Actor<typeof machine>;

const machine = supervisorMachine.provide({
  actors: {
    worker: fromCallback<WorkerCommand, { watch: boolean }>(({ sendBack, receive }) => {
      const worker: MockWorker = { send: sendBack, askedToStop: false, stopped: false };
      workers.push(worker);
      receive(() => {
        worker.askedToStop = true;
      });
      return () => {
        worker.stopped = true;
      };
    }),
  },
  actions: {
    writeServerAddress: ({ context }) => {
      serverAddressWrites.push({ port: context.port, version: context.version, startedAt: context.startedAt });
    },
    removeServerAddress: () => {
      serverAddressRemovals += 1;
    },
  },
});
type SupervisorSnapshot = SnapshotFrom<typeof machine>;
type SupervisorEvent = Parameters<Actor<typeof machine>['send']>[0];

const input = { home: '/unused', version: '1.2.3', startedAt: '2026-10-03T00:00:00.000Z', watch: false };
const payloads: Record<string, SupervisorEvent> = {
  'worker.ready': { type: 'worker.ready', port: 7337 },
  'worker.exit': { type: 'worker.exit', code: 1 },
};
const eventTypes = (node: DirectedGraphNode): string[] => [
  ...node.edges.map((edge) => edge.label.text),
  ...node.children.flatMap(eventTypes),
];
// The machine raises `xstate.done.state.*` itself, so the model must not send it.
const events = [...new Set(eventTypes(toDirectedGraph(machine)))]
  .filter((type) => !type.startsWith('xstate.done.state.'))
  .map((type) => payloads[type] ?? ({ type } as SupervisorEvent));

const model = new TestModel(machine, {
  input,
  events,
  limit: 10_000,
  // A done actor ignores events, but traversal still leaves a final state through the root `on`.
  filterEvents: (snapshot, event) => snapshot.status === 'active' && snapshot.can(event),
  // Crash count, not crash times; `via` gives self-transitions their own vertex.
  serializeState: (snapshot, event, previous) =>
    JSON.stringify({
      value: snapshot.value,
      port: snapshot.context.port,
      crashes: snapshot.context.crashTimes.length,
      via: event && `${JSON.stringify(previous?.value)} ${event.type}`,
    }),
  stateMatcher: (snapshot, key) => snapshot.matches(key as never),
});

const latestWorker = () => workers.at(-1) ?? expect.unreachable('No worker was started');
const liveWorkers = () => workers.filter((worker) => !worker.stopped).length;

// Moves to one millisecond short of a delay, checks the state held, then crosses it.
function crossDelay(milliseconds: number) {
  const before = supervisor.getSnapshot().value;
  vi.advanceTimersByTime(milliseconds - 1);
  expect(supervisor.getSnapshot().value).toEqual(before);
  vi.advanceTimersByTime(1);
}

const executors: Record<string, EventExecutor<SupervisorSnapshot, SupervisorEvent>> = {
  'xstate.init': () => {
    supervisor = createActor(machine, { input }).start();
  },
  'worker.ready': () => latestWorker().send(payloads['worker.ready']!),
  'worker.heartbeat': () => {
    vi.advanceTimersByTime(heartbeatTimeoutMs - 1);
    latestWorker().send({ type: 'worker.heartbeat' });
  },
  'worker.exit': () => latestWorker().send(payloads['worker.exit']!),
  'worker.exited': () => {
    expect(latestWorker().askedToStop).toBe(true);
    latestWorker().send({ type: 'worker.exited' });
  },
  'server.stop': () => supervisor.send({ type: 'server.stop' }),
  'xstate.after.readyTimeout.supervisor.starting': () => crossDelay(readyTimeoutMs),
  'xstate.after.heartbeatTimeout.supervisor.running': () => crossDelay(heartbeatTimeoutMs),
  'xstate.after.backoff.supervisor.backingOff.delay.waiting': () =>
    crossDelay(backoffMs(supervisor.getSnapshot().context.crashTimes.length)),
};

function expectModelState(expected: SupervisorSnapshot) {
  const actual = supervisor.getSnapshot();
  expect(actual.value).toEqual(expected.value);
  expect(actual.status).toBe(expected.status);
  expect(actual.context.crashTimes).toHaveLength(expected.context.crashTimes.length);
}
const ownAddress = { port: 7337, version: '1.2.3', startedAt: input.startedAt };
const states: Record<string, (snapshot: SupervisorSnapshot) => void> = {
  starting: (snapshot) => {
    expectModelState(snapshot);
    expect(liveWorkers()).toBe(1);
    if (snapshot.context.port === null) expect(serverAddressWrites).toEqual([]);
  },
  running: (snapshot) => {
    expectModelState(snapshot);
    expect(liveWorkers()).toBe(1);
    expect(serverAddressWrites.at(-1)).toEqual(ownAddress);
  },
  backingOff: (snapshot) => {
    expectModelState(snapshot);
    expect(liveWorkers()).toBe(snapshot.matches({ backingOff: { worker: 'exited' } }) ? 0 : 1);
    expect(snapshot.context.crashTimes.length).toBeLessThan(maxCrashes);
    expect(serverAddressRemovals).toBe(0);
  },
  failed: (snapshot) => {
    expectModelState(snapshot);
    expect(snapshot.context.crashTimes).toHaveLength(maxCrashes);
    expect(liveWorkers()).toBe(0);
    expect(serverAddressRemovals).toBe(1);
  },
  stopping: (snapshot) => {
    expectModelState(snapshot);
    expect(liveWorkers()).toBe(0);
    expect(serverAddressRemovals).toBe(1);
  },
};

const shortestPaths = model.getShortestPaths();
const simplePaths = model.getSimplePaths({ stopWhen: (snapshot) => snapshot.context.crashTimes.length >= 2 });
const title = (path: (typeof shortestPaths)[number]) =>
  path.steps.map(({ event }) => event.type.replace(/^xstate\.after\.(\w+)\..*$/, 'after $1')).join(' → ');

beforeEach(() => {
  vi.useFakeTimers();
  workers = [];
  serverAddressWrites = [];
  serverAddressRemovals = 0;
});
afterEach(() => {
  supervisor.stop();
  vi.useRealTimers();
});

describe.each([
  ['shortest path', shortestPaths],
  ['simple path, up to two crashes', simplePaths],
])('supervisor model, %s', (_, paths) => {
  it.each(paths.map((path) => [title(path), path] as const))('%s', async (_, path) => {
    await path.test({ events: executors, states });
  });
});

it('the generated paths walk every transition of the model', () => {
  const key = (from: SupervisorSnapshot, type: string, to: SupervisorSnapshot) =>
    `${JSON.stringify(from.value)} ${type} ${JSON.stringify(to.value)}`;
  const transitions = adjacencyMapToArray(getAdjacencyMap(machine, model.options)).map(({ state, event, nextState }) =>
    key(state, event.type, nextState),
  );
  const walked = new Set(
    [...shortestPaths, ...simplePaths].flatMap((path) =>
      path.steps.slice(1).map((step, index) => key(path.steps[index]!.state, step.event.type, step.state)),
    ),
  );
  expect(transitions.filter((transition) => !walked.has(transition))).toEqual([]);
});
```

## Worker machine

Owner comment 2: orchestrate the worker with XState as well, so that the worker is not half XState and half plain TypeScript. Owner comment 3: keep HTTP serving out of the machine's states, so `/health` can stay on HTTP or move to tRPC.

### Today

- `worker/main.ts` reads `ARGO_HOME` and `ARGO_SERVER_PORT`, then awaits `startWorker`.
- `startWorker` (`worker/start.ts`) opens the database, builds the HTTP server, the `ws` server and `applyWSSHandler`, and listens.
- `main.ts` then sends `ready`, starts a `setInterval` heartbeat, and stops on `SIGINT`, `SIGTERM` or `disconnect`.
- `openDatabase` in `@repo/db` is one synchronous call that opens `node:sqlite`, sets WAL and runs the Drizzle migrations (`packages/db/src/database.ts`).

### States

```
worker
├── openingDatabase   invoke openDatabase (opens argo.db and runs migrations)
│     done  → serving          error → failed
├── serving           invoke httpServer (spans both children, so a heartbeat never restarts it)
│   ├── listening     server.listening / sendToSupervisor(ready) → running
│   └── running       after heartbeatInterval / sendToSupervisor(heartbeat) → running (reenter)
│     server.failed → failed
├── stopping  (final) entry closeDatabase; output exitCode 0
└── failed    (final) entry closeDatabase; output exitCode 1
root: invoke processSignals; on worker.stop → stopping
```

Opening the database and running the migrations are **one state**, because `@repo/db` exposes them as one call. Separate `openingDatabase` and `migrating` states would need `@repo/db` to export a separate migrate step, which is a change to the package in spec section 7. Ask the owner if they want two states. The error message already tells the two failures apart.

### Effects

| Effect | Kind | Why |
|---|---|---|
| Open the database and run migrations | `fromPromise` actor `openDatabase`, invoked by `openingDatabase` | One-shot with a result (the Drizzle handle) and a failure. `onDone` stores the handle in context; `onError` goes to `failed` |
| HTTP server, `ws` server, `applyWSSHandler`, request guard, routes | `fromCallback` actor `httpServer`, invoked by `serving` | Long-lived, with cleanup. It reports `server.listening` and `server.failed` (for example `EADDRINUSE`) with `sendBack`. Cleanup does what `close()` does today, except closing the database |
| `SIGINT`, `SIGTERM`, IPC `disconnect` | `fromCallback` actor `processSignals`, invoked at the root | Turns process events into `worker.stop` with a reason, and removes the listeners in its cleanup |
| Heartbeat timer | `after: { heartbeatInterval }` on `running` | Time lives in the machine, so tests drive it like the supervisor's delays. This replaces `setInterval` |
| `process.send` of `ready` and `heartbeat` | action `sendToSupervisor` with params | Fire-and-forget. The supervisor validates the messages with Zod at its boundary |
| Log lines | action `log` with params | Fire-and-forget |
| Close the database | action `closeDatabase` on entry to `stopping` and `failed` | The handle is in context, so this is a no-op when opening failed |
| Exit code | machine `output: { exitCode }` | The runner calls `process.exit` on `complete`, as the supervisor's runner does |

The routes stay inside `httpServer`. If `/health` becomes a tRPC procedure, only that actor's module changes, and the states and the model test stay the same (owner comment 3). `GET /blobs/:id` keeps the HTTP server in any case (ADR 0002).

### Where it lives

- `apps/server/src/worker/machine.ts`: `setup` and the machine.
- `apps/server/src/worker/http-server.ts`: the `httpServer` callback actor. It replaces `start.ts` and keeps `http-routes.ts` and `request-guard.ts`.
- `apps/server/src/worker/process-signals.ts`: the `processSignals` actor.
- `apps/server/src/worker/main.ts`: the runner. It reads and validates the environment with Zod as today, creates the actor, logs transitions, and exits with the output code.
- `start.test.ts` becomes `http-server.test.ts`. It starts the `httpServer` actor on a free port, waits for `server.listening`, and keeps today's Host and Origin cases.

### Model test

This follows the same pattern as the supervisor, and ran green in the prototype: 7 shortest and 8 simple paths, type-checked (S14).

- `workerMachine.provide({ actors, actions })` supplies:
  - an `openDatabase` mock whose promise the executor resolves or rejects;
  - an `httpServer` mock that records `live`, `starts` and its `sendBack`;
  - a `processSignals` mock that keeps its `sendBack`;
  - a `sendToSupervisor` mock that records messages.
- The events come from `toDirectedGraph`, without `xstate.done.state.*`. Keep `xstate.done.actor.openDatabase` (payload `{ output: … }`) and `xstate.error.actor.openDatabase`, because the executors resolve or reject the mock promise. Each such executor then awaits `vi.advanceTimersByTimeAsync(0)` so the promise settles under fake timers.
- `filterEvents`: `snapshot.status === 'active' && snapshot.can(event)`.
- `serializeState`: `{ value, database: context.database !== null, failure: context.failure !== null, via }`. Never put the database handle in the key.
- The heartbeat executor checks that nothing is sent at 999 ms, then crosses 1 000 ms.
- Per-state assertions:

  | State | Assertions |
  |---|---|
  | `openingDatabase` | `openDatabase` called once; no server; nothing sent |
  | `serving.listening` | server live; nothing sent yet |
  | `serving.running` | first message is `{type: 'ready', port}`; every later one is `heartbeat` |
  | `stopping` | server stopped; database closed if it was opened; `output.exitCode` 0 |
  | `failed` | server stopped; database closed if it was opened; `output.exitCode` 1 |

One edge case: `worker.stop` while `openDatabase` is pending exits before `onDone`, so a handle that resolves late would not be closed. With today's synchronous `openDatabase` the promise settles in the same tick, so this cannot happen. If opening ever becomes truly asynchronous, make the database a `fromCallback` actor whose cleanup closes it.

```ts
// Prototype shape (S14), trimmed: names and types as proposed above.
export const workerMachine = setup({
  types: {
    input: {} as WorkerInput,
    context: {} as WorkerInput & { database: Database | null; startedAt: string; failure: string | null },
    events: {} as
      | { type: 'server.listening' }
      | { type: 'server.failed'; error: unknown }
      | { type: 'worker.stop'; reason: 'SIGINT' | 'SIGTERM' | 'IPC channel closed' },
    output: {} as { exitCode: number },
  },
  actors: { openDatabase, httpServer, processSignals },
  actions: {
    sendToSupervisor: (_, message: WorkerMessage) => { process.send?.(message); },
    log: (_, params: { line: string }) => { /* stamp and append to logs/worker.log */ },
    closeDatabase: ({ context }) => { context.database?.$client.close(); },
  },
  delays: { heartbeatInterval: 1000 },
}).createMachine({
  id: 'worker',
  context: ({ input }) => ({ ...input, database: null, startedAt: new Date().toISOString(), failure: null }),
  invoke: { id: 'processSignals', src: 'processSignals' },
  on: { 'worker.stop': { target: '.stopping' } },
  initial: 'openingDatabase',
  states: {
    openingDatabase: {
      invoke: {
        id: 'openDatabase',
        src: 'openDatabase',
        input: ({ context }) => ({ home: context.home }),
        onDone: { target: 'serving', actions: assign({ database: ({ event }) => event.output }) },
        onError: { target: 'failed', actions: assign({ failure: ({ event }) => String(event.error) }) },
      },
    },
    serving: {
      invoke: {
        id: 'httpServer',
        src: 'httpServer',
        input: ({ context }) => ({ port: context.port, database: context.database!, version: context.version, startedAt: context.startedAt }),
      },
      on: { 'server.failed': { target: 'failed', actions: assign({ failure: ({ event }) => String(event.error) }) } },
      initial: 'listening',
      states: {
        listening: {
          on: {
            'server.listening': {
              target: 'running',
              actions: { type: 'sendToSupervisor', params: ({ context }) => ({ type: 'ready', port: context.port }) },
            },
          },
        },
        running: {
          after: {
            heartbeatInterval: { target: 'running', reenter: true, actions: { type: 'sendToSupervisor', params: { type: 'heartbeat' } } },
          },
        },
      },
    },
    stopping: { type: 'final', entry: 'closeDatabase' },
    failed: { type: 'final', entry: 'closeDatabase' },
  },
  output: ({ context }) => ({ exitCode: context.failure === null ? 0 : 1 }),
});
```

## Vitest integration

- Generate paths at module scope, so Vitest collects one `it` per path with `describe.each` and `it.each`. The path list is fixed before any test runs. A changed machine changes the test list, so name tests by their event sequence.
- `vi.useFakeTimers()` in `beforeEach`, and `actor.stop()` plus `vi.useRealTimers()` in `afterEach`. Fake timers drive `after` because XState's default clock calls the global `setTimeout` at call time.
- `path.test` is async. Return or await it, or a failure becomes an unhandled rejection.
- Run size on the prototype: 636 supervisor tests in about 5 s wall time, path generation included, and 15 worker tests (S14). They live in `apps/server`, which already has a Vitest project in the root `vitest.config.ts`.

## Gotchas

1. **`createTestModel` throws on `after`, `invoke` and inline delayed actions** (S6, S7). Use `new TestModel(machine, options)` and pass `events`, `stateMatcher` and `serializeState` yourself, because its defaults are `[]`, `'*'` only, and the whole snapshot (S6).
2. **Internal event names are not documented.** `xstate.after.<delay>.<state id>`, `xstate.done.actor.<id>` and `xstate.done.state.<id>` come from the source and first-party tests (S6, S7), not the docs. The exact pin protects us. If the names change, the state assertions fail loudly, because the missing executor does nothing and the actor stays put. Name delays and invoke ids so the names are readable.
3. **A plain `events` array replaces the derived event list in `getShortestPaths` and `getAdjacencyMap`.** `resolveTraversalOptions` spreads the caller's options last, over the merged default (S6 `graph.ts`). In the prototype, `getShortestPaths(machine, { events: [ready, exit] })` never reached `stopping` (S14). `createTestModel` merges correctly; `new TestModel` takes the list as given. List every event, as the sketch does with `toDirectedGraph`.
4. **Final states still transition in traversal** through a root-level `on` (S14). Add `filterEvents: (snapshot) => snapshot.status === 'active'`.
5. **Machine-raised events are explorable.** `xstate.done.state.*` (a state's `onDone`) can be "sent" before the regions finish (S14). Filter it out. Keep `xstate.done.actor.*` and `xstate.error.actor.*` when a mock actor's result is the input you want to drive.
6. **Self-transitions vanish without a `via` key.** `reenter` self-transitions (the heartbeat, watch-mode `worker.ready`) produce the same serialized state, so no path walks them. `createTestModel`'s own suffix is dropped when the value does not change (S6 `serializeMachineTransition`). Add the previous value and the event type to the key.
7. **Context makes the graph explode.** Timestamps in context make every vertex unique and nondeterministic; serialize the crash **count**. Simple paths grow about 4× per allowed crash (S14), so bound them with `stopWhen`, and keep `limit` as a tripwire.
8. **`toState` also stops traversal** at matching states (S6). Use `stopWhen` to bound, and `toState` only to pick the ends.
9. **Flags in context hide states.** Boolean context such as `workerExited` and `backoffElapsed` doubles vertices, leaks across states when not reset, and moves assertions off the state value (S14). Prefer parallel regions or child states.
10. **The model grades itself.** State assertions only compare the machine with itself. Use spec numbers in the executors and effect checks in `states`, and keep example tests for required behaviour, because deleting a transition shrinks the model too (S14).
11. **Real time does not pass in traversal.** Logic that reads `Date.now()`, like the crash window, cannot be reached through the graph (S14). Keep an example test.
12. **Docs and package disagree.** The docs list `deduplicatePaths` as an export, but 5.33.2 does not export it (S8, S9). Two docs pages still point at `@xstate/graph` (S11, S12).
13. **`EventExecutor` gets `step.event` typed as `{ type }` only**, without the payload (S6 `types.ts`). Take payloads from your own table, as the sketch does.

## Recommendation

1. **Use `xstate/graph` from the pinned `xstate@5.33.2`.** Add no package; `@xstate/graph` is frozen at the 5.19.4 era and the docs call it deprecated (S1, S4, S9). Do not adopt `@xstate/test@2`: it is an alpha for xstate v6 and Vitest 3 (S2).
2. **Use `new TestModel(machine.provide(…), { input, events, filterEvents, serializeState, stateMatcher, limit })`**, with shortest paths to every vertex, simple paths bounded by context, and one transition-coverage test.
3. **For the supervisor**:
   - Make `backingOff` parallel, as above.
   - Move the `server.json` writes into the machine's actions and mock them with `provide` in the model test.
   - Keep four example tests: the crash window, the atomic own-pid write, and the foreign file on `failed` and on `stopping`.
4. **For the worker**: add `apps/server/src/worker/machine.ts` with the states and actors above. `httpServer` is an invoked callback actor, so the `/health` decision does not touch the machine. Test it with the same pattern.

## Draft line for AGENTS.md

For "Rules that no tool checks":

> Every XState machine has model-based tests from `xstate/graph` that walk all of its transitions.

## Conflicts with the spec and ADRs

- **The package name in the request.** The owner asked for `@xstate/graph`. The primary sources say it is superseded by `xstate/graph` inside `xstate` (S4, S9). This note and the AGENTS.md line use `xstate/graph`.
- **ADR 0003** lists where XState runs: "the supervisor, the Session machines, and Agent lifecycles". A worker machine is still on the Server, so it does not contradict the ADR, but the ADR does not name it. Amend the ADR to add the worker lifecycle. ADR 0003's supervisor states (`starting`, `running`, `backingOff`, `failed`, `stopping`) are unchanged by the parallel `backingOff`, which only adds child states.
- **Spec section 5, Supervisor.** It says "an XState 5 machine and a small runner, about 100 lines" and "imports no app code, only `contracts` for the `server.json` schema". With the file actions inline, the supervisor still imports only `contracts` (plus `node:fs`). `machine.ts` is already 156 lines at `42e3143`, and the inline file actions add more, so the line count in the spec is out of date.
- **Spec section 5, Worker**, and the folder tree in section 3 (`worker/  HTTP and WebSocket server, tRPC adapter, /health, /blobs/:id`) do not mention a machine. Adding `machine.ts`, `http-server.ts` and `process-signals.ts`, and dropping `start.ts`, needs a spec edit.
- **ADR 0002** allows plain HTTP only for `GET /health` and `GET /blobs/:id`. Moving `/health` to tRPC would change that ADR, spec section 5, and the places that wait on `/health`: the Playwright `webServer` URL and the dev wait from `e61eb2f`. The worker design does not depend on the answer.
- **AGENTS.md "Call them mocks"**: today's `machine.test.ts` names its worker double `fakeWorker`. Rename it to `mockWorker`.
- **Spec section 7** has `@repo/db` open and migrate in one call. Separate `openingDatabase` and `migrating` states would need a second export from that package.
