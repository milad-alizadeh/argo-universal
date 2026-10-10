import { type Database, openDatabase } from '@repo/db';
import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { terminalPaths } from '@repo/vitest/model-paths';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type Actor,
  createActor,
  matchesState,
  fromPromise,
  type SnapshotFrom,
} from 'xstate';
import {
  type AdjacencyMap,
  type EventExecutor,
  type GraphEventFromLogic,
  type StatePath,
  getAdjacencyMap,
  getShortestPaths,
  getSimplePaths,
} from 'xstate/graph';
import type { WriterJob, writeJobs } from './writer-job';
import { writerMachine } from './writer-machine';

const writeFeedEvent = 'writer.write';
const drainWriterEvent = 'writer.drain';

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
    writeBatch: fromPromise<
      ReturnType<typeof writeJobs>,
      { database: Database; jobs: WriterJob[] }
    >(
      ({ input }): Promise<ReturnType<typeof writeJobs>> =>
        new Promise<ReturnType<typeof writeJobs>>((resolve, reject): void => {
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
  writer.send({ type: writeFeedEvent, job: sent });
};

// Done and error events of invoked actors are not in the machine's event type, but the model drives them.
const events = [
  { type: writeFeedEvent, job: job(0) },
  { type: drainWriterEvent },
  {
    type: 'xstate.done.actor.writeBatch',
    actorId: 'writeBatch',
    output: [],
  },
  {
    type: 'xstate.error.actor.writeBatch',
    error: writeError,
    actorId: 'writeBatch',
  },
  { type: 'xstate.after.writeRetryDelay.databaseWriter.waitingToRetry' },
] satisfies GraphEventFromLogic<typeof machine>[];
type WriterEvent = (typeof events)[number];

const canGraphEvent = (
  snapshot: WriterSnapshot,
  event: WriterEvent,
): boolean => {
  switch (event.type) {
    case 'xstate.done.actor.writeBatch':
    case 'xstate.error.actor.writeBatch':
      return snapshot.matches('writing') || snapshot.matches('draining');
    case 'xstate.after.writeRetryDelay.databaseWriter.waitingToRetry':
      return snapshot.matches('waitingToRetry');
    default:
      return snapshot.can(event);
  }
};

const options = {
  input,
  events,
  limit: 1000,
  // A done actor ignores events, so the model must not send any.
  filterEvents: (snapshot: WriterSnapshot, event: WriterEvent): boolean =>
    snapshot.status === 'active' && canGraphEvent(snapshot, event),
  // Never the jobs themselves, only whether a batch runs and jobs wait behind it; `via` gives each self-transition its own vertex.
  serializeState: (
    snapshot: WriterSnapshot,
    event: WriterEvent | undefined,
    previous?: WriterSnapshot,
  ): string =>
    JSON.stringify({
      value: snapshot.value,
      batch: snapshot.context.batchSize > 0,
      waiting: snapshot.context.queue.length > snapshot.context.batchSize,
      via: event && `${JSON.stringify(previous?.value)} ${event.type}`,
    }),
};

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
  'writer.drain': (): void => writer.send({ type: drainWriterEvent }),
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

const shortestPaths = terminalPaths(getShortestPaths(machine, options));
const simplePaths = terminalPaths(getSimplePaths(machine, options));
mockDatabase.$client.close();
const title = (path: StatePath<WriterSnapshot, WriterEvent>): string =>
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
        (path): [string, StatePath<WriterSnapshot, WriterEvent>] =>
          [title(path), path] as const,
      ),
    )('%s', async (_, path): Promise<void> => {
      for (const step of path.steps) {
        const execute = executors[step.event.type];
        if (!execute)
          throw new Error(`No Writer executor for ${step.event.type}`);
        await execute(step);
        for (const [key, assertState] of Object.entries(states)) {
          if (matchesState(key, step.state.value)) assertState(step.state);
        }
      }
    });
  });

  it('the generated paths walk every transition', (): void => {
    expect(
      unwalkedTransitions({
        models: [
          {
            getAdjacencyMap: (): AdjacencyMap<WriterSnapshot, WriterEvent> =>
              getAdjacencyMap(machine, options),
          },
        ],
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
      type: writeFeedEvent,
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
    writer.send({ type: drainWriterEvent });
    sendWrite();
    await settle((call): void => call.resolve());
    await settle((call): void => call.reject(writeError));

    expect(writer.getSnapshot().status).toBe('done');
    expect(logLines).toEqual([
      'could not write while draining, lost 1 jobs: Error: database is locked\nupdate Turn turn-2: endedAt',
    ]);
  });

  it('names at most 20 lost jobs when the drain fails', async (): Promise<void> => {
    sendWrite();
    writer.send({ type: drainWriterEvent });
    for (let index = 0; index < 30; index += 1) sendWrite();
    await settle((call): void => call.resolve());
    await settle((call): void => call.reject(writeError));

    const lines = logLines.join('\n').split('\n');
    expect(lines[0]).toMatch(/^could not write while draining, lost 30 jobs/);
    expect(lines.slice(1)).toHaveLength(21);
    expect(lines.at(-1)).toBe('and 10 more');
  });
});
