import type { Database } from '@repo/db';
import { and, assertEvent, assign, fromPromise, setup, stateIn } from 'xstate';
import {
  describeJob,
  stampWriterJob,
  type WriterJob,
  writeJobs,
} from './writer-job';

export interface WriterInput {
  database: Database;
  log?: (line: string) => void;
}

interface WriterContext extends WriterInput {
  // Jobs not yet committed, oldest first.
  queue: WriterJob[];
  // How many jobs at the front of `queue` the running `writeBatch` holds.
  batchSize: number;
}

export type WriterEvent =
  | { type: 'writer.write'; job: WriterJob }
  | { type: 'writer.drain' };

// The jobs `takeBatch` counted, oldest first.
const batchInput = ({ context }: { context: WriterContext }) => ({
  database: context.database,
  jobs: context.queue.slice(0, context.batchSize),
});

export const writerMachine = setup({
  types: {
    input: {} as WriterInput,
    context: {} as WriterContext,
    events: {} as WriterEvent,
  },
  actors: {
    writeBatch: fromPromise<void, { database: Database; jobs: WriterJob[] }>(
      async ({ input }) => writeJobs(input.database, input.jobs),
    ),
  },
  actions: {
    enqueue: assign({
      queue: ({ context, event }) => {
        assertEvent(event, 'writer.write');
        return [...context.queue, stampWriterJob(event.job, Date.now())];
      },
    }),
    takeBatch: assign({ batchSize: ({ context }) => context.queue.length }),
    dropBatch: assign({
      queue: ({ context }) => context.queue.slice(context.batchSize),
      batchSize: 0,
    }),
    releaseBatch: assign({ batchSize: 0 }),
    log: ({ context }, params: { line: string }) => {
      const line = `databaseWriter: ${params.line}`;
      if (context.log) context.log(line);
      else console.error(line);
    },
  },
  guards: {
    hasJobsAfterBatch: ({ context }) =>
      context.queue.length > context.batchSize,
    drainRequested: stateIn({ writing: 'drainRequested' }),
  },
  delays: { writeRetryDelay: 1000 },
}).createMachine({
  id: 'databaseWriter',
  context: ({ input }) => ({ ...input, queue: [], batchSize: 0 }),
  initial: 'idle',
  on: { 'writer.write': { actions: 'enqueue' } },
  states: {
    idle: {
      on: {
        'writer.write': { target: 'writing', actions: 'enqueue' },
        'writer.drain': 'drained',
      },
    },
    // A drain waits for the running batch, since leaving would drop its result.
    writing: {
      entry: 'takeBatch',
      invoke: {
        id: 'writeBatch',
        src: 'writeBatch',
        input: batchInput,
        onDone: [
          {
            guard: and(['drainRequested', 'hasJobsAfterBatch']),
            target: 'draining',
            actions: 'dropBatch',
          },
          { guard: 'drainRequested', target: 'drained', actions: 'dropBatch' },
          {
            guard: 'hasJobsAfterBatch',
            target: 'writing',
            reenter: true,
            actions: 'dropBatch',
          },
          { target: 'idle', actions: 'dropBatch' },
        ],
        // While draining, a failed batch is tried once more at once, not after `writeRetryDelay`.
        onError: [
          {
            guard: 'drainRequested',
            target: 'draining',
            actions: [
              {
                type: 'log',
                params: ({ event }) => ({
                  line: `could not write, draining: ${String(event.error)}`,
                }),
              },
              'releaseBatch',
            ],
          },
          {
            target: 'waitingToRetry',
            actions: [
              {
                type: 'log',
                params: ({ context, event }) => ({
                  line: `could not write, keeping ${context.queue.length} jobs to retry: ${String(event.error)}`,
                }),
              },
              'releaseBatch',
            ],
          },
        ],
      },
      initial: 'continuing',
      states: {
        continuing: { on: { 'writer.drain': 'drainRequested' } },
        drainRequested: {},
      },
    },
    waitingToRetry: {
      after: { writeRetryDelay: 'writing' },
      on: { 'writer.drain': 'draining' },
    },
    draining: {
      entry: 'takeBatch',
      invoke: {
        id: 'writeBatch',
        src: 'writeBatch',
        input: batchInput,
        onDone: [
          {
            guard: 'hasJobsAfterBatch',
            target: 'draining',
            reenter: true,
            actions: 'dropBatch',
          },
          { target: 'drained', actions: 'dropBatch' },
        ],
        // The jobs stay in `queue`, so the drained snapshot holds what was lost.
        onError: {
          target: 'drained',
          actions: [
            {
              type: 'log',
              params: ({ context, event }) => ({
                line: `could not write while draining, lost ${context.queue.length} jobs: ${String(event.error)}\n${context.queue.map(describeJob).join('\n')}`,
              }),
            },
            'releaseBatch',
          ],
        },
      },
    },
    drained: { type: 'final' },
  },
});
