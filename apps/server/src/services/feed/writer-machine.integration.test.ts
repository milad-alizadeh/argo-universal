import { type Database, openDatabase } from '@repo/db';
import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type Actor,
  type AnyEventObject,
  createActor,
  type EventFromLogic,
  fromPromise,
  type SnapshotFrom,
} from 'xstate';
import { type EventExecutor, TestModel, type TestPath } from 'xstate/graph';
import type { WriterJob } from './writer-job';
import { writerMachine } from './writer-machine';

// A failed batch is tried again after 1 second.
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

const mockDatabase = openDatabase(':memory:');
const machine = writerMachine.provide({
  actors: {
    writeBatch: fromPromise<void, { database: Database; jobs: WriterJob[] }>(
      ({ input }): Promise<void> =>
        new Promise<void>((resolve, reject): void => {
          const call: WriteBatchCall = {
            jobs: input.jobs,
            settled: false,
            resolve: (): void => {
              call.settled = true;
              committedJobs.push(...input.jobs);
              resolve();
            },
            reject: (error): void => {
              call.settled = true;
              reject(error);
            },
          };
          writeBatchCalls.push(call);
        }),
    ),
  },
  actions: {
    log: (_, { line }): void => {
      logLines.push(line);
    },
  },
});
type WriterSnapshot = SnapshotFrom<typeof machine>;
type WriterEvent = EventFromLogic<typeof machine>;

const input = {
  now: (): number => 1000,
  database: mockDatabase,
};
const writeError = new Error('database is locked');
const job = (index: number): WriterJob => ({
  type: 'turnUpdate',
  id: `turn-${index}`,
  set: { endedAt: index },
});
// Sends the next numbered job and records it as sent.
const sendWrite = (): void => {
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
  filterEvents: (snapshot, event): boolean =>
    snapshot.status === 'active' && snapshot.can(event),
  // Never the jobs themselves, only whether a batch runs and jobs wait behind it; `via` gives each self-transition its own vertex.
  serializeState: (snapshot, event, previous): string =>
    JSON.stringify({
      value: snapshot.value,
      batch: snapshot.context.batchSize > 0,
      waiting: snapshot.context.queue.length > snapshot.context.batchSize,
      via: event && `${JSON.stringify(previous?.value)} ${event.type}`,
    }),
  stateMatcher: (snapshot, key): boolean => snapshot.matches(key as never),
});

const latestCall = (): WriteBatchCall =>
  writeBatchCalls.at(-1) ?? expect.unreachable('writeBatch was not invoked');

// Settles the running batch, then lets the machine take its done or error event.
const settle = async (
  settleCall: (call: WriteBatchCall) => void,
): Promise<void> => {
  settleCall(latestCall());
  await vi.advanceTimersByTimeAsync(0);
};

const executors: Record<string, EventExecutor<WriterSnapshot, WriterEvent>> = {
  'xstate.init': (): void => {
    writer = createActor(machine, { input }).start();
  },
  'writer.write': sendWrite,
  'writer.drain': (): void => writer.send({ type: 'writer.drain' }),
  'xstate.done.actor.writeBatch': (): Promise<void> =>
    settle((call): void => call.resolve()),
  'xstate.error.actor.writeBatch': (): Promise<void> =>
    settle((call): void => call.reject(writeError)),
  'xstate.after.writeRetryDelay.databaseWriter.waitingToRetry': (): void => {
    const calls = writeBatchCalls.length;
    vi.advanceTimersByTime(writeRetryDelayMs - 1);
    expect(writeBatchCalls).toHaveLength(calls);
    vi.advanceTimersByTime(1);
    expect(writeBatchCalls).toHaveLength(calls + 1);
  },
};

// Every job sent is committed or still queued, once each and in the order it arrived.
const expectModelState = (expected: WriterSnapshot): void => {
  const actual = writer.getSnapshot();
  expect(actual.value).toEqual(expected.value);
  expect(actual.status).toBe(expected.status);
  expect(actual.context.batchSize > 0).toBe(expected.context.batchSize > 0);
  expect([...committedJobs, ...actual.context.queue]).toEqual(sentJobs);
};
// A running batch holds the oldest queued jobs, and no other batch runs.
const expectBatchRunning = (snapshot: WriterSnapshot): void => {
  expectModelState(snapshot);
  const { queue, batchSize } = writer.getSnapshot().context;
  expect(batchSize).toBeGreaterThan(0);
  expect(latestCall()).toEqual(
    expect.objectContaining({
      settled: false,
      jobs: queue.slice(0, batchSize),
    }),
  );
  expect(
    writeBatchCalls.slice(0, -1).every((call): boolean => call.settled),
  ).toBe(true);
};
const expectNoBatchRunning = (): void => {
  expect(writer.getSnapshot().context.batchSize).toBe(0);
  expect(writeBatchCalls.every((call): boolean => call.settled)).toBe(true);
};
const states: Record<string, (snapshot: WriterSnapshot) => void> = {
  idle: (snapshot): void => {
    expectModelState(snapshot);
    expectNoBatchRunning();
    expect(writer.getSnapshot().context.queue).toEqual([]);
  },
  writing: expectBatchRunning,
  waitingToRetry: (snapshot): void => {
    expectModelState(snapshot);
    expectNoBatchRunning();
    expect(writer.getSnapshot().context.queue.length).toBeGreaterThan(0);
    expect(logLines.at(-1)).toMatch(
      /^could not write, keeping \d+ jobs to retry: Error: database is locked$/,
    );
  },
  draining: expectBatchRunning,
  drained: (snapshot): void => {
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
mockDatabase.$client.close();
const title = (path: TestPath<WriterSnapshot, WriterEvent>): string =>
  path.steps
    .map(({ event }): string =>
      event.type
        .replace(/^xstate\.after\.(\w+)\..*$/, 'after $1')
        .replace(/^xstate\.(done|error)\.actor\.(\w+)$/, '$2 $1'),
    )
    .join(' → ');

beforeEach((): void => {
  input.database = openDatabase(':memory:');
  vi.useFakeTimers();
  writeBatchCalls = [];
  logLines = [];
  sentJobs = [];
  committedJobs = [];
});

afterEach((): void => {
  writer.stop();
  input.database.$client.close();
  vi.useRealTimers();
});

describe('database writer model', (): void => {
  describe.each([
    ['shortest path', shortestPaths],
    ['simple path', simplePaths],
  ])('%s', (_, paths): void => {
    it.each(
      paths.map(
        (
          path,
        ): [
          string,
          TestPath<
            WriterSnapshot,
            { type: 'writer.write'; job: WriterJob } | { type: 'writer.drain' }
          >,
        ] => [title(path), path] as const,
      ),
    )('%s', async (_, path): Promise<void> => {
      await path.test({ events: executors, states });
    });
  });

  it('the generated paths walk every transition', (): void => {
    expect(
      unwalkedTransitions({
        models: [model],
        paths: [...shortestPaths, ...simplePaths],
        stateKey: (snapshot): string => JSON.stringify(snapshot.value),
        eventKey: (event): typeof event.type => event.type,
      }),
    ).toEqual([]);
  });
});

describe('database writer', (): void => {
  beforeEach((): void => {
    writer = createActor(machine, { input }).start();
  });

  it('retries a failed batch with the jobs that arrived meanwhile', async (): Promise<void> => {
    sendWrite();
    sendWrite();
    sendWrite();
    await settle((call): void => call.reject(writeError));

    expect(logLines).toEqual([
      'could not write, keeping 3 jobs to retry: Error: database is locked',
    ]);
    vi.advanceTimersByTime(writeRetryDelayMs);
    expect(writeBatchCalls.map((call): WriterJob[] => call.jobs)).toEqual([
      [job(1)],
      [job(1), job(2), job(3)],
    ]);
  });

  it('keeps the enqueue clock value when a Feed write is retried', async (): Promise<void> => {
    writer.send({
      type: 'writer.write',
      job: {
        type: 'feedRows',
        sessionId: 'session-1',
        rows: [],
        maxRevision: 1,
      },
    });
    await settle((call): void => call.reject(writeError));
    vi.advanceTimersByTime(writeRetryDelayMs);

    expect(writeBatchCalls.map((call): WriterJob[] => call.jobs)).toEqual([
      [
        {
          type: 'feedRows',
          sessionId: 'session-1',
          rows: [],
          maxRevision: 1,
          activityAt: 1000,
        },
      ],
      [
        {
          type: 'feedRows',
          sessionId: 'session-1',
          rows: [],
          maxRevision: 1,
          activityAt: 1000,
        },
      ],
    ]);
  });

  it('logs each lost job when the drain fails', async (): Promise<void> => {
    sendWrite();
    writer.send({ type: 'writer.drain' });
    sendWrite();
    await settle((call): void => call.resolve());
    await settle((call): void => call.reject(writeError));

    expect(writer.getSnapshot().status).toBe('done');
    expect(logLines).toEqual([
      'could not write while draining, lost 1 jobs: Error: database is locked\nupdate Turn turn-2: endedAt',
    ]);
  });
});
