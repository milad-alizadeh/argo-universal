import type { Database } from '@repo/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type Actor,
  type AnyEventObject,
  createActor,
  type EventFromLogic,
  fromPromise,
  type SnapshotFrom,
} from 'xstate';
import {
  adjacencyMapToArray,
  type EventExecutor,
  getAdjacencyMap,
  TestModel,
  type TestPath,
} from 'xstate/graph';
import type { WriterJob } from './writer-job';
import { writerMachine } from './writer-machine';

// Spec 0002 section 8: a failed batch is tried again after 1 second.
const writeRetryDelayMs = 1000;

interface WriteBatchCall {
  jobs: WriterJob[];
  settled: boolean;
  resolve: () => void;
  reject: (error: unknown) => void;
}

let writeBatchCalls: WriteBatchCall[];
let logLines: string[];
let sentJobs: WriterJob[];
let committedJobs: WriterJob[];
let writer: Actor<typeof machine>;

const mockDatabase = {} as Database;
const machine = writerMachine.provide({
  actors: {
    writeBatch: fromPromise<void, { database: Database; jobs: WriterJob[] }>(
      ({ input }) =>
        new Promise<void>((resolve, reject) => {
          const call: WriteBatchCall = {
            jobs: input.jobs,
            settled: false,
            resolve: () => {
              call.settled = true;
              committedJobs.push(...input.jobs);
              resolve();
            },
            reject: (error) => {
              call.settled = true;
              reject(error);
            },
          };
          writeBatchCalls.push(call);
        }),
    ),
  },
  actions: {
    log: (_, { line }) => {
      logLines.push(line);
    },
  },
});
type WriterSnapshot = SnapshotFrom<typeof machine>;
type WriterEvent = EventFromLogic<typeof machine>;

const input = { database: mockDatabase };
const writeError = new Error('database is locked');
const job = (index: number): WriterJob => ({
  type: 'turnUpdate',
  id: `turn-${index}`,
  set: { endedAt: index },
});
// Sends the next numbered job and records it as sent.
const sendWrite = () => {
  const sent = job(sentJobs.length + 1);
  sentJobs.push(sent);
  writer.send({ type: 'writer.write', job: sent });
};

// Done and error events of invoked actors are not in the machine's event type, but the model drives them.
const events = [
  { type: 'writer.write', job: job(0) },
  { type: 'writer.drain' },
  { type: 'xstate.done.actor.writeBatch', actorId: 'writeBatch' },
  {
    type: 'xstate.error.actor.writeBatch',
    error: writeError,
    actorId: 'writeBatch',
  },
  { type: 'xstate.after.writeRetryDelay.databaseWriter.waitingToRetry' },
] as AnyEventObject[] as WriterEvent[];

const model = new TestModel(machine, {
  input,
  events,
  limit: 1000,
  // A done actor ignores events, so the model must not send any.
  filterEvents: (snapshot, event) =>
    snapshot.status === 'active' && snapshot.can(event),
  // Never the jobs themselves, only whether a batch runs and jobs wait behind it; `via` gives each self-transition its own vertex.
  serializeState: (snapshot, event, previous) =>
    JSON.stringify({
      value: snapshot.value,
      batch: snapshot.context.batchSize > 0,
      waiting: snapshot.context.queue.length > snapshot.context.batchSize,
      via: event && `${JSON.stringify(previous?.value)} ${event.type}`,
    }),
  stateMatcher: (snapshot, key) => snapshot.matches(key as never),
});

const latestCall = () =>
  writeBatchCalls.at(-1) ?? expect.unreachable('writeBatch was not invoked');

// Settles the running batch, then lets the machine take its done or error event.
const settle = async (settleCall: (call: WriteBatchCall) => void) => {
  settleCall(latestCall());
  await vi.advanceTimersByTimeAsync(0);
};

const executors: Record<string, EventExecutor<WriterSnapshot, WriterEvent>> = {
  'xstate.init': () => {
    writer = createActor(machine, { input }).start();
  },
  'writer.write': sendWrite,
  'writer.drain': () => writer.send({ type: 'writer.drain' }),
  'xstate.done.actor.writeBatch': () => settle((call) => call.resolve()),
  'xstate.error.actor.writeBatch': () =>
    settle((call) => call.reject(writeError)),
  'xstate.after.writeRetryDelay.databaseWriter.waitingToRetry': () => {
    const calls = writeBatchCalls.length;
    vi.advanceTimersByTime(writeRetryDelayMs - 1);
    expect(writeBatchCalls).toHaveLength(calls);
    vi.advanceTimersByTime(1);
    expect(writeBatchCalls).toHaveLength(calls + 1);
  },
};

// Every job sent is committed or still queued, once each and in the order it arrived.
const expectModelState = (expected: WriterSnapshot) => {
  const actual = writer.getSnapshot();
  expect(actual.value).toEqual(expected.value);
  expect(actual.status).toBe(expected.status);
  expect(actual.context.batchSize > 0).toBe(expected.context.batchSize > 0);
  expect([...committedJobs, ...actual.context.queue]).toEqual(sentJobs);
};
// A running batch holds the oldest queued jobs, and no other batch runs.
const expectBatchRunning = (snapshot: WriterSnapshot) => {
  expectModelState(snapshot);
  const { queue, batchSize } = writer.getSnapshot().context;
  expect(batchSize).toBeGreaterThan(0);
  expect(latestCall()).toEqual(
    expect.objectContaining({
      settled: false,
      jobs: queue.slice(0, batchSize),
    }),
  );
  expect(writeBatchCalls.slice(0, -1).every((call) => call.settled)).toBe(true);
};
const expectNoBatchRunning = () => {
  expect(writer.getSnapshot().context.batchSize).toBe(0);
  expect(writeBatchCalls.every((call) => call.settled)).toBe(true);
};
const states: Record<string, (snapshot: WriterSnapshot) => void> = {
  idle: (snapshot) => {
    expectModelState(snapshot);
    expectNoBatchRunning();
    expect(writer.getSnapshot().context.queue).toEqual([]);
  },
  writing: expectBatchRunning,
  waitingToRetry: (snapshot) => {
    expectModelState(snapshot);
    expectNoBatchRunning();
    expect(writer.getSnapshot().context.queue.length).toBeGreaterThan(0);
    expect(logLines.at(-1)).toMatch(
      /^could not write, keeping \d+ jobs to retry: Error: database is locked$/,
    );
  },
  draining: expectBatchRunning,
  drained: (snapshot) => {
    expectModelState(snapshot);
    expectNoBatchRunning();
    const lost = writer.getSnapshot().context.queue;
    if (lost.length > 0)
      expect(logLines.at(-1)).toMatch(
        new RegExp(`^could not write while draining, lost ${lost.length} jobs`),
      );
  },
};

const shortestPaths = model.getShortestPaths();
const simplePaths = model.getSimplePaths();
const title = (path: TestPath<WriterSnapshot, WriterEvent>) =>
  path.steps
    .map(({ event }) =>
      event.type
        .replace(/^xstate\.after\.(\w+)\..*$/, 'after $1')
        .replace(/^xstate\.(done|error)\.actor\.(\w+)$/, '$2 $1'),
    )
    .join(' → ');

beforeEach(() => {
  vi.useFakeTimers();
  writeBatchCalls = [];
  logLines = [];
  sentJobs = [];
  committedJobs = [];
});

afterEach(() => {
  writer.stop();
  vi.useRealTimers();
});

describe('database writer model', () => {
  describe.each([
    ['shortest path', shortestPaths],
    ['simple path', simplePaths],
  ])('%s', (_, paths) => {
    it.each(paths.map((path) => [title(path), path] as const))(
      '%s',
      async (_, path) => {
        await path.test({ events: executors, states });
      },
    );
  });

  it('the generated paths walk every transition', () => {
    const key = (from: WriterSnapshot, type: string, to: WriterSnapshot) =>
      `${JSON.stringify(from.value)} ${type} ${JSON.stringify(to.value)}`;
    const transitions = adjacencyMapToArray(
      getAdjacencyMap(machine, model.options),
    ).map(({ state, event, nextState }) => key(state, event.type, nextState));
    const walked = new Set(
      [...shortestPaths, ...simplePaths].flatMap((path) =>
        path.steps
          .slice(1)
          .map((step, index) =>
            key(
              path.steps[index]?.state ?? expect.unreachable(),
              step.event.type,
              step.state,
            ),
          ),
      ),
    );
    expect(transitions.length).toBeGreaterThan(0);
    expect(transitions.filter((transition) => !walked.has(transition))).toEqual(
      [],
    );
  });
});

describe('database writer', () => {
  beforeEach(() => {
    writer = createActor(machine, { input }).start();
  });

  it('retries a failed batch with the jobs that arrived meanwhile', async () => {
    sendWrite();
    sendWrite();
    sendWrite();
    await settle((call) => call.reject(writeError));

    expect(logLines).toEqual([
      'could not write, keeping 3 jobs to retry: Error: database is locked',
    ]);
    vi.advanceTimersByTime(writeRetryDelayMs);
    expect(writeBatchCalls.map((call) => call.jobs)).toEqual([
      [job(1)],
      [job(1), job(2), job(3)],
    ]);
  });

  it('logs each lost job when the drain fails', async () => {
    sendWrite();
    writer.send({ type: 'writer.drain' });
    sendWrite();
    await settle((call) => call.resolve());
    await settle((call) => call.reject(writeError));

    expect(writer.getSnapshot().status).toBe('done');
    expect(logLines).toEqual([
      'could not write while draining, lost 1 jobs: Error: database is locked\nupdate Turn turn-2: endedAt',
    ]);
  });
});
