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
import { SqlJob } from '#mocks/storage-job';
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
let refusedJobs: WriterJob[];
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

// One queued refusable job spends the budget, so the model reaches a refusal.
const input = {
  now: (): number => 1000,
  database: mockDatabase,
  refusableJobLimit: 1,
};
const writeError = new Error('database is locked');
const job = (index: number): WriterJob =>
  new SqlJob({ statement: `UPDATE turn SET ended_at = ${index}` });
const refusableJob = (index: number): WriterJob =>
  new SqlJob({
    statement: `UPDATE session SET max_revision = ${index}`,
    refusable: true,
  });
const isRefusable = (queued: WriterJob): boolean => queued.refusable === true;
// Sends the next numbered job of the same kind and records it as sent or refused.
const sendWrite = (refusable = false): void => {
  const index = sentJobs.length + refusedJobs.length + 1;
  const sent = refusable ? refusableJob(index) : job(index);
  sentJobs.push(sent);
  writer.send({
    type: writeFeedEvent,
    job: sent,
    refused: (): void => {
      sentJobs.pop();
      refusedJobs.push(sent);
    },
  });
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
  'writer.write': ({ event }): void => {
    if (event.type === writeFeedEvent) sendWrite(isRefusable(event.job));
  },
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
  // Queued jobs carry the clock value they were enqueued at.
  expect([...committedJobs, ...actual.context.queue]).toMatchObject(sentJobs);
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
const isWriteFailure = (line: string): boolean => line.startsWith('could not');
const refusalLine =
  'Storage is failing: refusing jobs while 1 refusable jobs wait';
// A Writer refuses refusable jobs only while its budget is spent, and logs at most once per refused job.
const expectRefusals = (): void => {
  const { queue, refusing } = writer.getSnapshot().context;
  const refusals = logLines.filter((line): boolean => line === refusalLine);
  expect(refusals.length).toBeLessThanOrEqual(refusedJobs.length);
  if (refusing) expect(queue.some(isRefusable)).toBe(true);
  if (refusing) expect(refusals.length).toBeGreaterThan(0);
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
    expect(logLines.findLast(isWriteFailure)).toMatch(
      /^could not write, keeping \d+ jobs to retry: Error: database is locked$/,
    );
  },
  draining: expectBatchRunning,
  drained: (snapshot): void => {
    expectModelState(snapshot);
    expectNoBatchRunning();
    const lost = writer.getSnapshot().context.queue;
    if (lost.length > 0)
      expect(logLines.findLast(isWriteFailure)).toMatch(
        new RegExp(`^could not write while draining, lost ${lost.length} jobs`),
      );
  },
};

// Refusable writes and the budget they spend, walked by shortest paths only so simple paths stay few.
const budgetOptions = {
  ...options,
  events: [
    ...events,
    { type: writeFeedEvent, job: refusableJob(0) },
  ] satisfies WriterEvent[],
  serializeState: (
    snapshot: WriterSnapshot,
    event: WriterEvent | undefined,
    previous?: WriterSnapshot,
  ): string =>
    JSON.stringify({
      state: options.serializeState(snapshot, event, previous),
      refusableQueued: snapshot.context.queue.some(isRefusable),
      refusing: snapshot.context.refusing,
    }),
};
const shortestPaths = terminalPaths(getShortestPaths(machine, budgetOptions));
const simplePaths = terminalPaths(getSimplePaths(machine, options));
mockDatabase.$client.close();
const title = (path: StatePath<WriterSnapshot, WriterEvent>): string =>
  path.steps
    .map(({ event }): string =>
      `${event.type}${event.job?.refusable ? ' refusable' : ''}`
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
  refusedJobs = [];
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
        expectRefusals();
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
              getAdjacencyMap(machine, budgetOptions),
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

  it('refuses refusable jobs past its budget, still queues other jobs, and accepts refusable jobs again after a commit', async (): Promise<void> => {
    sendWrite(true);
    const committed = {
      resolve: vi.fn<() => void>(),
      reject: vi.fn<(error: unknown) => void>(),
    };
    const refused = vi.fn<() => void>();
    writer.send({
      type: writeFeedEvent,
      job: refusableJob(9),
      committed,
      refused,
    });
    sendWrite();

    expect(committed.reject).toHaveBeenCalledWith(
      new Error('Storage is failing'),
    );
    expect(committed.resolve).not.toHaveBeenCalled();
    expect(refused).toHaveBeenCalledOnce();
    expect(logLines).toEqual([refusalLine]);
    await settle((call): void => call.resolve());
    sendWrite(true);
    expect(writer.getSnapshot().context.queue.map(isRefusable)).toEqual([
      false,
      true,
    ]);
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
    // The batches hold the jobs as sent, stamped with their enqueue time.
    expect(writeBatchCalls.map((call): WriterJob[] => call.jobs)).toMatchObject(
      [[job(1)], [job(1), job(2), job(3)]],
    );
  });

  it('keeps the enqueue clock value when a write is retried', async (): Promise<void> => {
    writer.send({ type: writeFeedEvent, job: job(1) });
    await settle((call): void => call.reject(writeError));
    vi.advanceTimersByTime(writeRetryDelayMs);

    const stamped = new SqlJob({
      statement: 'UPDATE turn SET ended_at = 1',
      queuedAt: 1000,
    });
    expect(writeBatchCalls.map((call): WriterJob[] => call.jobs)).toEqual([
      [stamped],
      [stamped],
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
      'could not write while draining, lost 1 jobs: Error: database is locked\nUPDATE turn SET ended_at = 2',
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
