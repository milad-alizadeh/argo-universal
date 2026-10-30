import { type Database, openDatabase } from '@repo/db';
import { afterEach, beforeEach, expect, vi } from 'vitest';
import {
  type Actor,
  createActor,
  fromPromise,
  type SnapshotFrom,
} from 'xstate';
import { SqlJob } from '#mocks/storage-job';
import type { WriterJob, writeJobs } from './writer-job';
import { writerMachine } from './writer-machine';

export const writeFeedEvent = 'writer.write';

export const drainWriterEvent = 'writer.drain';

// A failed batch is tried again after 1 second.
export const writeRetryDelayMs = 1000;

export interface WriteBatchCall {
  jobs: WriterJob[];
  settled: boolean;
  resolve: () => void;
  reject: (cause: unknown) => void;
}

// What one test saw the Writer do; each list empties before the next test.
export const writeBatchCalls: WriteBatchCall[] = [];

export const logLines: string[] = [];

export const sentJobs: WriterJob[] = [];

export const refusedJobs: WriterJob[] = [];

export const committedJobs: WriterJob[] = [];

let actor: Actor<typeof machine> | undefined;

// The Writer actor of the running test.
export const writer = (): Actor<typeof machine> =>
  actor ?? expect.unreachable('the Writer actor has not started');

export const mockDatabase = openDatabase(':memory:');

export const machine = writerMachine.provide({
  actors: {
    writeBatch: fromPromise<
      ReturnType<typeof writeJobs>,
      { database: Database; jobs: WriterJob[] }
    >(
      ({ input }): Promise<ReturnType<typeof writeJobs>> =>
        new Promise<ReturnType<typeof writeJobs>>((resolve, reject): void =>
          recordBatch(input.jobs, resolve, reject),
        ),
    ),
  },
  actions: {
    log: (_, { line }): void => {
      logLines.push(line);
    },
  },
});

const recordBatch = (
  jobs: WriterJob[],
  resolve: () => void,
  reject: WriteBatchCall['reject'],
): void => {
  const call: WriteBatchCall = {
    jobs,
    settled: false,
    resolve: (): void => commitBatch(call, resolve),
    reject: (error): void => rejectBatch(call, reject, error),
  };

  writeBatchCalls.push(call);
};

const commitBatch = (call: WriteBatchCall, resolve: () => void): void => {
  call.settled = true;
  committedJobs.push(...call.jobs);
  resolve();
};

const rejectBatch = (
  call: WriteBatchCall,
  reject: WriteBatchCall['reject'],
  error: Parameters<WriteBatchCall['reject']>[0],
): void => {
  call.settled = true;
  reject(error);
};

export type WriterSnapshot = SnapshotFrom<typeof machine>;

// One queued refusable job spends the budget, so the model reaches a refusal.
export const input = {
  now: (): number => 1000,
  database: mockDatabase,
  refusableJobLimit: 1,
};

export const writeError = new Error('database is locked');

export const job = (index: number): WriterJob =>
  new SqlJob({ statement: `UPDATE turn SET ended_at = ${index}` });

export const refusableJob = (index: number): WriterJob =>
  new SqlJob({
    statement: `UPDATE session SET max_revision = ${index}`,
    refusable: true,
  });

export const isRefusable = (queued: WriterJob): boolean =>
  queued.refusable === true;

// Sends the next numbered job of the same kind and records it as sent or refused.
export const sendWrite = (refusable = false): void => {
  const index = sentJobs.length + refusedJobs.length + 1;
  const sent = refusable ? refusableJob(index) : job(index);
  sentJobs.push(sent);
  writer().send({
    type: writeFeedEvent,
    job: sent,
    refused: (): void => {
      sentJobs.pop();
      refusedJobs.push(sent);
    },
  });
};

export function startWriterActor(): void {
  actor = createActor(machine, { input }).start();
}

beforeEach((): void => {
  input.database = openDatabase(':memory:');
  vi.useFakeTimers();

  for (const recorded of [
    writeBatchCalls,
    logLines,
    sentJobs,
    refusedJobs,
    committedJobs,
  ])
    recorded.length = 0;
});

afterEach((): void => {
  actor?.stop();
  actor = undefined;
  input.database.$client.close();
  vi.useRealTimers();
});
