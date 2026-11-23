import type { Database } from '@repo/db';
import {
  and,
  assertEvent,
  assign,
  type DoneActorEvent,
  emit,
  fromPromise,
  setup,
  stateIn,
} from 'xstate';
import {
  acknowledgeWrittenPrefix,
  rejectPendingCommits,
  type PendingWriterCommit,
  type WriterCommit,
} from './writer-commit';
import {
  describeLostJobs,
  stampWriterJob,
  unpackWriterJobs,
  type WriterJob,
  type WrittenWriterBatch,
  writeJobFiles,
  writeWriterBatch,
} from './writer-job';

type WriterBatchInput = {
  database: Database;
  blobsFolder?: string;
  jobs: WriterJob[];
};

type WriterLogParameters = { line: string };

const writeEvent = 'writer.write';

// Refusable jobs the Writer keeps queued by default; past the limit it refuses more, while other jobs still queue.
const defaultRefusableJobLimit = 256;

const storageFailingMessage = 'Storage is failing';

export interface WriterInput {
  database: Database;
  now: () => number;
  log?: (line: string) => void;
  // Where content-addressed Blob files live (ADR-0005).
  blobsFolder?: string;
  refusableJobLimit?: number;
}

interface WriterContext extends WriterInput {
  refusableJobLimit: number;
  // Jobs not yet committed, oldest first.
  queue: WriterJob[];
  // How many jobs at the front of `queue` the running `writeBatch` holds.
  batchSize: number;
  pendingCommits: PendingWriterCommit[];
  // True from the first refused job until a batch commits.
  refusing: boolean;
}

// Queued jobs are announced when accepted, then again when their batch commits.
export type WriterJobsEvent = {
  type: 'writer.queued' | 'writer.committed';
  jobs: readonly WriterJob[];
};

export type WriterEvent =
  | {
      type: typeof writeEvent;
      job: WriterJob;
      committed?: WriterCommit;
      // Called when the Writer refuses the job because its refusable job budget is spent.
      refused?: () => void;
    }
  | { type: 'writer.drain' };

// The jobs `takeBatch` counted, oldest first.
const batchInput = ({
  context,
}: {
  context: WriterContext;
}): WriterBatchInput => ({
  database: context.database,
  blobsFolder: context.blobsFolder,
  jobs: context.queue.slice(0, context.batchSize),
});

// What the batch that just committed left out.
const writtenBatch = ({
  event,
}: {
  event: DoneActorEvent<WrittenWriterBatch>;
}): WrittenWriterBatch => event.output;

// Every committed batch reports the jobs it dropped, announces the rest, and leaves the queue.
const committedBatch = [
  { type: 'logDropped', params: writtenBatch },
  { type: 'announceWritten', params: writtenBatch },
  { type: 'dropBatch', params: writtenBatch },
] as const;

const writtenJobs = (
  context: WriterContext,
  written: WrittenWriterBatch,
): WriterJob[] => {
  const dropped = new Set(written.dropped.map(({ index }) => index));

  return context.queue
    .slice(0, context.batchSize)
    .filter((_, index): boolean => !dropped.has(index));
};

// The first refusal is logged; later ones wait for a batch to commit.
const refuseOverBudget = [
  {
    guard: and(['isOverRefusableBudget', 'isRefusing']),
    actions: 'refuseJob',
  },
  {
    guard: 'isOverRefusableBudget',
    actions: [
      'refuseJob',
      'startRefusing',
      {
        type: 'log',
        params: ({
          context,
        }: {
          context: WriterContext;
        }): WriterLogParameters => ({
          line: `${storageFailingMessage}: refusing jobs while ${context.refusableJobLimit} refusable jobs wait`,
        }),
      },
    ],
  },
] as const;

function writeLogLine(context: WriterContext, text: string): void {
  const line = `databaseWriter: ${text}`;

  if (context.log) context.log(line);
  else console.error(line);
}

export const writerMachine = setup({
  // SAFETY: XState v5 reads these as type-only declarations; the empty objects are never used as runtime values.
  types: {
    input: {} as WriterInput,
    context: {} as WriterContext,
    events: {} as WriterEvent,
    emitted: {} as WriterJobsEvent,
  },
  actors: {
    writeBatch: fromPromise<WrittenWriterBatch, WriterBatchInput>(
      async ({ input }): Promise<WrittenWriterBatch> => {
        await writeJobFiles(input.blobsFolder, input.jobs);

        return writeWriterBatch(input.database, input.jobs);
      },
    ),
  },
  actions: {
    announceAccepted: emit(({ event }): WriterJobsEvent => {
      assertEvent(event, writeEvent);

      return { type: 'writer.queued', jobs: unpackWriterJobs([event.job]) };
    }),
    announceWritten: emit(
      ({ context }, written: WrittenWriterBatch): WriterJobsEvent => ({
        type: 'writer.committed',
        jobs: unpackWriterJobs(writtenJobs(context, written)),
      }),
    ),
    // A dropped job never commits, so retrying it would hold up every job behind it.
    logDropped: ({ context }, written: WrittenWriterBatch): void => {
      if (!written.dropped.length) return;

      const jobs = written.dropped.flatMap(
        ({ index }) => context.queue[index] ?? [],
      );

      writeLogLine(
        context,
        `dropped ${jobs.length} jobs that break a constraint: ${String(written.dropped[0]?.error)}\n${describeLostJobs(jobs)}`,
      );
    },

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
    refuseJob: ({ event }): void => {
      assertEvent(event, writeEvent);
      event.committed?.reject(new Error(storageFailingMessage));
      event.refused?.();
    },
    startRefusing: assign({ refusing: true }),
    takeBatch: assign({
      batchSize: ({ context }): number => context.queue.length,
    }),
    dropBatch: assign({
      pendingCommits: (
        { context },
        written: WrittenWriterBatch,
      ): PendingWriterCommit[] =>
        acknowledgeWrittenPrefix(
          context.pendingCommits,
          context.batchSize,
          written.dropped,
        ),
      queue: ({ context }): WriterContext['queue'] =>
        context.queue.slice(context.batchSize),
      batchSize: 0,
      refusing: false,
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
    log: ({ context }, params: WriterLogParameters): void =>
      writeLogLine(context, params.line),
  },
  guards: {
    isOverRefusableBudget: ({ context, event }): boolean => {
      assertEvent(event, writeEvent);

      return (
        event.job.refusable === true &&
        context.queue.filter((job): boolean => job.refusable === true).length >=
          context.refusableJobLimit
      );
    },
    isRefusing: ({ context }): boolean => context.refusing,
    hasJobsAfterBatch: ({ context }): boolean =>
      context.queue.length > context.batchSize,
    drainRequested: stateIn({ writing: 'drainRequested' }),
  },
  delays: { writeRetryDelay: 1000 },
}).createMachine({
  id: 'databaseWriter',
  context: ({ input }): WriterContext => ({
    ...input,
    refusableJobLimit: input.refusableJobLimit ?? defaultRefusableJobLimit,
    queue: [],
    batchSize: 0,
    pendingCommits: [],
    refusing: false,
  }),
  initial: 'idle',
  on: {
    [writeEvent]: [
      ...refuseOverBudget,
      { actions: ['enqueue', 'announceAccepted'] },
    ],
  },
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
            actions: committedBatch,
          },
          {
            guard: 'drainRequested',
            target: 'drained',
            actions: committedBatch,
          },
          {
            guard: 'hasJobsAfterBatch',
            target: 'writing',
            reenter: true,
            actions: committedBatch,
          },
          {
            target: 'idle',
            actions: committedBatch,
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
        [writeEvent]: [
          ...refuseOverBudget,
          { actions: ['enqueue', 'announceAccepted', 'retryCommits'] },
        ],
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
            actions: committedBatch,
          },
          {
            target: 'drained',
            actions: committedBatch,
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
