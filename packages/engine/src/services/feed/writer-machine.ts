import type { Database } from '@repo/db';
import {
  and,
  assertEvent,
  assign,
  emit,
  enqueueActions,
  fromPromise,
  setup,
  stateIn,
} from 'xstate';
import { isCatalogSqlJob } from './writer-catalog-sync';
import { describeWriterChanges, type WriterChange } from './writer-changes';
import {
  acknowledgeWrittenPrefix,
  rejectPendingCommits,
  type PendingWriterCommit,
  type WriterCommit,
} from './writer-commit';
import {
  describeLostJobs,
  stampWriterJob,
  type WriterJob,
  writeJobs,
} from './writer-job';

type WriterBatchInput = { database: Database; jobs: WriterJob[] };
type WriterLogParameters = { line: string };
const writeEvent = 'writer.write';

export interface WriterInput {
  database: Database;
  now: () => number;
  log?: (line: string) => void;
}

interface WriterContext extends WriterInput {
  // Jobs not yet committed, oldest first.
  queue: WriterJob[];
  // How many jobs at the front of `queue` the running `writeBatch` holds.
  batchSize: number;
  pendingCommits: PendingWriterCommit[];
}

export type WriterEvent =
  | { type: typeof writeEvent; job: WriterJob; committed?: WriterCommit }
  | { type: 'writer.drain' };

// The jobs `takeBatch` counted, oldest first.
const batchInput = ({
  context,
}: {
  context: WriterContext;
}): WriterBatchInput => ({
  database: context.database,
  jobs: context.queue.slice(0, context.batchSize),
});

export const writerMachine = setup({
  types: {
    input: {} as WriterInput,
    context: {} as WriterContext,
    events: {} as WriterEvent,
    emitted: {} as { type: 'catalog.sqlCommitted' } | WriterChange,
  },
  actors: {
    writeBatch: fromPromise<void, WriterBatchInput>(
      async ({ input }): Promise<void> => writeJobs(input.database, input.jobs),
    ),
  },
  actions: {
    announceAccepted: emit(({ event }) => {
      assertEvent(event, writeEvent);
      return describeWriterChanges([event.job]);
    }),
    announceWritten: emit(({ context }) =>
      describeWriterChanges(context.queue.slice(0, context.batchSize)),
    ),
    announceCatalogCommit: enqueueActions(({ context, enqueue }) => {
      if (context.queue.slice(0, context.batchSize).some(isCatalogSqlJob))
        enqueue(emit({ type: 'catalog.sqlCommitted' }));
    }),

    enqueue: assign({
      pendingCommits: ({ context, event }): PendingWriterCommit[] => {
        assertEvent(event, writeEvent);
        return event.committed
          ? [
              ...context.pendingCommits,
              { through: context.queue.length + 1, committed: event.committed },
            ]
          : context.pendingCommits;
      },
      queue: ({ context, event }): WriterContext['queue'] => {
        assertEvent(event, writeEvent);
        return [...context.queue, stampWriterJob(event.job, context.now())];
      },
    }),
    takeBatch: assign({
      batchSize: ({ context }): number => context.queue.length,
    }),
    dropBatch: assign({
      pendingCommits: ({ context }): PendingWriterCommit[] =>
        acknowledgeWrittenPrefix(context.pendingCommits, context.batchSize),
      queue: ({ context }): WriterContext['queue'] =>
        context.queue.slice(context.batchSize),
      batchSize: 0,
    }),
    releaseBatch: assign({ batchSize: 0 }),
    retryCommits: assign({
      pendingCommits: ({ context, event }): PendingWriterCommit[] =>
        rejectPendingCommits(
          context.pendingCommits,
          'error' in event ? event.error : new Error('Writer cannot commit'),
          true,
        ),
    }),
    rejectCommits: assign({
      pendingCommits: ({ context, event }) =>
        rejectPendingCommits(
          context.pendingCommits,
          'error' in event ? event.error : new Error('Writer cannot commit'),
        ),
    }),
    log: ({ context }, params: WriterLogParameters): void => {
      const line = `databaseWriter: ${params.line}`;
      if (context.log) context.log(line);
      else console.error(line);
    },
  },
  guards: {
    hasJobsAfterBatch: ({ context }): boolean =>
      context.queue.length > context.batchSize,
    drainRequested: stateIn({ writing: 'drainRequested' }),
  },
  delays: { writeRetryDelay: 1000 },
}).createMachine({
  id: 'databaseWriter',
  context: ({ input }): WriterContext => ({
    ...input,
    queue: [],
    batchSize: 0,
    pendingCommits: [],
  }),
  initial: 'idle',
  on: { [writeEvent]: { actions: ['enqueue', 'announceAccepted'] } },
  states: {
    idle: {
      on: {
        [writeEvent]: {
          target: 'writing',
          actions: ['enqueue', 'announceAccepted'],
        },
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
            actions: ['announceCatalogCommit', 'announceWritten', 'dropBatch'],
          },
          {
            guard: 'drainRequested',
            target: 'drained',
            actions: ['announceCatalogCommit', 'announceWritten', 'dropBatch'],
          },
          {
            guard: 'hasJobsAfterBatch',
            target: 'writing',
            reenter: true,
            actions: ['announceCatalogCommit', 'announceWritten', 'dropBatch'],
          },
          {
            target: 'idle',
            actions: ['announceCatalogCommit', 'announceWritten', 'dropBatch'],
          },
        ],
        // While draining, a failed batch is tried once more at once, not after `writeRetryDelay`.
        onError: [
          {
            guard: 'drainRequested',
            target: 'draining',
            actions: [
              'retryCommits',
              {
                type: 'log',
                params: ({ event }): WriterLogParameters => ({
                  line: `could not write, draining: ${String(event.error)}`,
                }),
              },
              'releaseBatch',
            ],
          },
          {
            target: 'waitingToRetry',
            actions: [
              'retryCommits',
              {
                type: 'log',
                params: ({ context, event }): WriterLogParameters => ({
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
      on: {
        'writer.drain': 'draining',
        [writeEvent]: {
          actions: ['enqueue', 'announceAccepted', 'retryCommits'],
        },
      },
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
            actions: ['announceCatalogCommit', 'announceWritten', 'dropBatch'],
          },
          {
            target: 'drained',
            actions: ['announceCatalogCommit', 'announceWritten', 'dropBatch'],
          },
        ],
        // The jobs stay in `queue`, so the drained snapshot holds what was lost.
        onError: {
          target: 'drained',
          actions: [
            'rejectCommits',
            {
              type: 'log',
              params: ({ context, event }): WriterLogParameters => ({
                line: `could not write while draining, lost ${context.queue.length} jobs: ${String(event.error)}\n${describeLostJobs(context.queue)}`,
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
