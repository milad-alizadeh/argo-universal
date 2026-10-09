import type { Database } from '@repo/db';
import { and, assertEvent, assign, emit, enqueueActions, fromPromise, not, sendParent, setup, stateIn, type DoneActorEvent } from 'xstate';
import { isCatalogSqlJob, readCatalogJobRequestIds, type CatalogSqlCommit } from './writer-catalog-sync';
import {
  acknowledgeWrittenPrefix,
  rejectPendingCommits,
  type PendingWriterCommit,
  type WriterCommit,
} from './writer-commit';
import {
  describeJob,
  stampWriterJob,
  type WriterJob,
  writeJobs,
} from './writer-job';

type WriterBatchInput = { database: Database; jobs: WriterJob[] };
type WriterLogParameters = { line: string };

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
  catalogCommits: CatalogSqlCommit[];
  discardedCatalogRequestIds: string[];
  catalogWriteError: unknown;
}

export type WriterEvent =
  | { type: 'writer.write'; job: WriterJob; committed?: WriterCommit }
  | { type: 'writer.drain' }
  | { type: 'writer.catalogStorageFailed'; requestIds: string[]; error: unknown };

export type CatalogWriterNotice =
  | { type: 'catalog.sqlCommitted'; commits: CatalogSqlCommit[] }
  | { type: 'catalog.writeFailed'; requestIds: string[]; error: unknown };

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
    events: {} as WriterEvent | DoneActorEvent<CatalogSqlCommit[], 'writeBatch'>,
    emitted: {} as CatalogWriterNotice,
  },
  actors: {
    writeBatch: fromPromise<CatalogSqlCommit[], WriterBatchInput>(
      async ({ input }): Promise<CatalogSqlCommit[]> => writeJobs(input.database, input.jobs),
    ),
  },
  actions: {
    announceUnpersistedCatalogFailure: emit(({ event }) => {
      assertEvent(event, 'writer.catalogStorageFailed');
      return { type: 'catalog.writeFailed', requestIds: event.requestIds, error: event.error };
    }),
    recordCatalogCommits: assign({ catalogCommits: ({ event }) => {
      assertEvent(event, 'xstate.done.actor.writeBatch');
      return event.output;
    } }),
    announceCatalogCommit: enqueueActions(({ context, enqueue }) => {
      if (!context.catalogCommits.length) return;
      enqueue(emit({ type: 'catalog.sqlCommitted', commits: context.catalogCommits }));
      const requestIds = context.catalogCommits.flatMap((commit) => commit.requestedIds);
      if (requestIds.length) enqueue(sendParent({ type: 'catalog.requestsCommitted', requestIds }));
    }),
    announceCatalogFailure: emit(({ context }) => ({
      type: 'catalog.writeFailed', requestIds: context.discardedCatalogRequestIds,
      error: context.catalogWriteError,
    })),
    enqueue: assign({
      pendingCommits: ({ context, event }): PendingWriterCommit[] => {
        assertEvent(event, 'writer.write');
        return event.committed
          ? [
              ...context.pendingCommits,
              { through: context.queue.length + 1, committed: event.committed },
            ]
          : context.pendingCommits;
      },
      queue: ({ context, event }): WriterContext['queue'] => {
        assertEvent(event, 'writer.write');
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
    rejectCommits: assign({
      // Catalog receipts are terminal: a rejected replacement cannot retry unseen.
      queue: ({ context }): WriterJob[] =>
        context.queue.filter((job) => !isCatalogSqlJob(job)),
      discardedCatalogRequestIds: ({ context }) => context.queue
        .filter(isCatalogSqlJob).flatMap((job) => readCatalogJobRequestIds(context.database, job)),
      catalogWriteError: ({ event }) => 'error' in event ? event.error : new Error('Writer cannot commit'),
      pendingCommits: ({ context, event }): PendingWriterCommit[] =>
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
    hasRetryableJobs: ({ context }): boolean =>
      context.queue.some((job) => !isCatalogSqlJob(job)),
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
    catalogCommits: [],
    discardedCatalogRequestIds: [],
    catalogWriteError: null,
  }),
  initial: 'idle',
  on: {
    'writer.write': { actions: 'enqueue' },
    'writer.catalogStorageFailed': { actions: 'announceUnpersistedCatalogFailure' },
  },
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
            actions: ['recordCatalogCommits', 'dropBatch', 'announceCatalogCommit'],
          },
          { guard: 'drainRequested', target: 'drained', actions: ['recordCatalogCommits', 'dropBatch', 'announceCatalogCommit'] },
          {
            guard: 'hasJobsAfterBatch',
            target: 'writing',
            reenter: true,
            actions: ['recordCatalogCommits', 'dropBatch', 'announceCatalogCommit'],
          },
          { target: 'idle', actions: ['recordCatalogCommits', 'dropBatch', 'announceCatalogCommit'] },
        ],
        // While draining, a failed batch is tried once more at once, not after `writeRetryDelay`.
        onError: [
          {
            guard: and(['drainRequested', not('hasRetryableJobs')]),
            target: 'drained',
            actions: ['rejectCommits', 'announceCatalogFailure', 'releaseBatch'],
          },
          {
            guard: 'drainRequested',
            target: 'draining',
            actions: [
              'rejectCommits', 'announceCatalogFailure',
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
            guard: 'hasRetryableJobs',
            target: 'waitingToRetry',
            actions: [
              'rejectCommits', 'announceCatalogFailure',
              {
                type: 'log',
                params: ({ context, event }): WriterLogParameters => ({
                  line: `could not write, keeping ${context.queue.length} jobs to retry: ${String(event.error)}`,
                }),
              },
              'releaseBatch',
            ],
          },
          { target: 'idle', actions: ['rejectCommits', 'announceCatalogFailure', 'releaseBatch'] },
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
        'writer.write': { actions: ['enqueue', 'rejectCommits', 'announceCatalogFailure'] },
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
            actions: ['recordCatalogCommits', 'dropBatch', 'announceCatalogCommit'],
          },
          { target: 'drained', actions: ['recordCatalogCommits', 'dropBatch', 'announceCatalogCommit'] },
        ],
        // The jobs stay in `queue`, so the drained snapshot holds what was lost.
        onError: {
          target: 'drained',
          actions: [
            'rejectCommits', 'announceCatalogFailure',
            {
              type: 'log',
              params: ({ context, event }): WriterLogParameters => ({
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
