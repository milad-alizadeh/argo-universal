import type { DelayEvent } from '@repo/vitest/model-test';
import { expect, vi } from 'vitest';
import type { EventExecutor } from 'xstate/graph';
import {
  committedJobs,
  drainWriterEvent,
  isRefusable,
  logLines,
  refusedJobs,
  sendWrite,
  sentJobs,
  writeBatchCalls,
  writeError,
  writeFeedEvent,
  writer,
  type WriteBatchCall,
  type WriterSnapshot,
} from './writer-fixture.mocks';
import type { WriterEvent, WriterStateName } from './writer-model.mocks';

const latestCall = (): WriteBatchCall =>
  writeBatchCalls.at(-1) ?? expect.unreachable('writeBatch was not invoked');

// Settles the running batch, then lets the machine take its done or error event.
export const settle = async (
  settleCall: (call: WriteBatchCall) => void,
): Promise<void> => {
  settleCall(latestCall());
  await vi.advanceTimersByTimeAsync(0);
};

export const executors: Record<
  WriterEvent['type'],
  EventExecutor<WriterSnapshot, WriterEvent | DelayEvent>
> = {
  'writer.write': ({ event }): void => {
    if (event.type === writeFeedEvent) sendWrite(isRefusable(event.job));
  },
  'writer.drain': (): void => writer().send({ type: drainWriterEvent }),
  'xstate.done.actor.writeBatch': (): Promise<void> =>
    settle((call): void => call.resolve()),
  'xstate.error.actor.writeBatch': (): Promise<void> =>
    settle((call): void => call.reject(writeError)),
};

// Every job sent is committed or still queued, once each and in the order it arrived.
const expectModelState = (expected: WriterSnapshot): void => {
  const actual = writer().getSnapshot();
  expect(actual.value).toEqual(expected.value);
  expect(actual.status).toBe(expected.status);
  expect(actual.context.batchSize > 0).toBe(expected.context.batchSize > 0);
  // Queued jobs carry the clock value they were enqueued at.
  expect([...committedJobs, ...actual.context.queue]).toMatchObject(sentJobs);
};

// A running batch holds the oldest queued jobs, and no other batch runs.
const expectBatchRunning = (snapshot: WriterSnapshot): void => {
  expectModelState(snapshot);
  const { queue, batchSize } = writer().getSnapshot().context;
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
  expect(writer().getSnapshot().context.batchSize).toBe(0);
  expect(writeBatchCalls.every((call): boolean => call.settled)).toBe(true);
};

const isWriteFailure = (line: string): boolean => line.startsWith('could not');

export const refusalLine =
  'Storage is failing: refusing jobs while 1 refusable jobs wait';

// A Writer refuses refusable jobs only while its budget is spent, and logs at most once per refused job.
export const expectRefusals = (): void => {
  const { queue, refusing } = writer().getSnapshot().context;
  const refusals = logLines.filter((line): boolean => line === refusalLine);
  expect(refusals.length).toBeLessThanOrEqual(refusedJobs.length);

  if (refusing) expect(queue.some(isRefusable)).toBe(true);

  if (refusing) expect(refusals.length).toBeGreaterThan(0);
};

export const states: Record<
  WriterStateName,
  (snapshot: WriterSnapshot) => void
> = {
  idle: (snapshot): void => {
    expectModelState(snapshot);
    expectNoBatchRunning();
    expect(writer().getSnapshot().context.queue).toEqual([]);
  },
  writing: expectBatchRunning,
  waitingToRetry: (snapshot): void => {
    expectModelState(snapshot);
    expectNoBatchRunning();
    expect(writer().getSnapshot().context.queue.length).toBeGreaterThan(0);
    expect(logLines.findLast(isWriteFailure)).toMatch(
      /^could not write, keeping \d+ jobs to retry: Error: database is locked$/,
    );
  },
  draining: expectBatchRunning,
  drained: (snapshot): void => {
    expectModelState(snapshot);
    expectNoBatchRunning();
    const lost = writer().getSnapshot().context.queue;

    if (lost.length > 0)
      expect(logLines.findLast(isWriteFailure)).toMatch(
        new RegExp(`^could not write while draining, lost ${lost.length} jobs`),
      );
  },
};
