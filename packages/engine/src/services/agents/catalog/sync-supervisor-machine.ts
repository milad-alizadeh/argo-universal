import type { Database } from '@repo/db';
import { assign, fromPromise, setup, type ActorRefFrom } from 'xstate';
import {
  writeDatabaseJobAndWaitForCommit,
  type WriterCommit,
  type WriterJob,
  type writerMachine,
} from '../../feed';
import { catalogSyncKey, readCatalogSyncJob } from './catalog-sql';
import {
  catalogSyncActor,
  type CatalogSyncInput,
  type CatalogSyncResult,
} from './catalog-sync-machine';

export interface SyncSupervisorInput extends Omit<
  CatalogSyncInput,
  'source' | 'scope' | 'rejectedValues'
> {
  database: Database;
  writer: ActorRefFrom<typeof writerMachine>;
}
interface SyncContext extends SyncSupervisorInput {
  admissions: WriterCommit[];
  result: CatalogSyncResult;
  attempts: number;
}
type SyncEvent =
  | { type: 'sync.request'; admitted: WriterCommit }
  | { type: 'sync.stop' };

const syncRequestEvent = 'sync.request';
const maximumAttempts = 3;
const initialRetryDelay = 1000;
function canRetrySync(context: SyncContext): boolean {
  if ('job' in context.result) return false;
  return context.result.retryable && context.attempts < maximumAttempts;
}
function resultWrite(context: SyncContext): WriterJob {
  const result = context.result;
  if ('job' in result) return result.job;
  return {
    type: 'syncJobUpdate',
    ...catalogSyncKey,
    set: {
      status: canRetrySync(context) ? 'pending' : 'failed',
      completedAt: context.now(),
      error: result.error,
      rejectedValues: result.rejectedValues,
    },
  };
}

export const syncSupervisorMachine = setup({
  types: {
    input: {} as SyncSupervisorInput,
    context: {} as SyncContext,
    events: {} as SyncEvent,
  },
  actors: {
    synchronize: catalogSyncActor,
    schedule: fromPromise<void, SyncContext>(async ({ input }) =>
      writeDatabaseJobAndWaitForCommit(
        input.writer,
        {
          type: 'syncJobUpdate',
          ...catalogSyncKey,
          set: { status: 'pending', requestedAt: input.now() },
        },
        true,
      ),
    ),
    start: fromPromise<void, SyncContext>(async ({ input }) =>
      writeDatabaseJobAndWaitForCommit(
        input.writer,
        {
          type: 'syncJobUpdate',
          ...catalogSyncKey,
          set: { status: 'running' },
        },
        true,
      ),
    ),
    save: fromPromise<void, SyncContext>(async ({ input }) =>
      writeDatabaseJobAndWaitForCommit(input.writer, resultWrite(input), true),
    ),
  },
  guards: {
    interrupted: ({ context }) =>
      ['pending', 'running'].includes(
        readCatalogSyncJob(context)?.status ?? 'idle',
      ),
    retryable: ({ context }) => canRetrySync(context),
  },
  actions: {
    enqueueAdmission: assign({
      admissions: ({ context, event }) =>
        event.type === syncRequestEvent
          ? [...context.admissions, event.admitted]
          : context.admissions,
    }),
    acceptRequest: ({ event }) => {
      if (event.type === syncRequestEvent) event.admitted.resolve();
    },
    acceptAdmissions: ({ context }) => {
      for (const admission of context.admissions) admission.resolve();
    },
    clearAdmissions: assign({ admissions: [] }),
    rejectAdmissions: ({ context, event }) => {
      const error =
        'error' in event ? event.error : new Error('Sync supervisor stopped');
      for (const admission of context.admissions) admission.reject(error);
    },
  },
  delays: {
    fetchLimit: 20_000,
    retryDelay: ({ context }) =>
      initialRetryDelay * 2 ** (context.attempts - 1),
  },
}).createMachine({
  id: 'syncSupervisor',
  context: ({ input }) => ({
    ...input,
    admissions: [],
    result: { error: '', rejectedValues: 0, retryable: false },
    attempts: 0,
  }),
  initial: 'checking',
  on: {
    'sync.stop': {
      target: '.stopped',
      actions: ['rejectAdmissions', 'clearAdmissions'],
    },
  },
  states: {
    checking: {
      always: [
        { guard: 'interrupted', target: 'starting' },
        { target: 'idle' },
      ],
    },
    idle: {
      on: {
        'sync.request': {
          target: 'scheduling',
          actions: ['enqueueAdmission', assign({ attempts: 0 })],
        },
      },
    },
    scheduling: {
      on: { 'sync.request': { actions: 'enqueueAdmission' } },
      invoke: {
        id: 'schedule',
        src: 'schedule',
        input: ({ context }) => context,
        onDone: {
          target: 'starting',
          actions: ['acceptAdmissions', 'clearAdmissions'],
        },
        onError: {
          target: 'idle',
          actions: ['rejectAdmissions', 'clearAdmissions'],
        },
      },
    },
    starting: {
      on: { 'sync.request': { actions: 'acceptRequest' } },
      invoke: {
        id: 'start',
        src: 'start',
        input: ({ context }) => context,
        onDone: 'syncing',
        onError: 'idle',
      },
    },
    syncing: {
      after: {
        fetchLimit: {
          target: 'saving',
          actions: assign({
            result: ({ context }) => ({
              error: 'Registry did not answer within 20 seconds',
              rejectedValues: readCatalogSyncJob(context)?.rejectedValues ?? 0,
              retryable: true,
            }),
          }),
        },
      },
      entry: assign({ attempts: ({ context }) => context.attempts + 1 }),
      on: { 'sync.request': { actions: 'acceptRequest' } },
      invoke: {
        id: 'synchronize',
        src: 'synchronize',
        input: ({ context }) => ({
          ...context,
          ...catalogSyncKey,
          rejectedValues: readCatalogSyncJob(context)?.rejectedValues ?? 0,
        }),
        onDone: {
          target: 'saving',
          actions: assign({ result: ({ event }) => event.output }),
        },
        onError: {
          target: 'saving',
          actions: assign({
            result: ({ event }) => ({
              error: String(event.error),
              rejectedValues: 0,
              retryable: false,
            }),
          }),
        },
      },
    },
    saving: {
      on: { 'sync.request': { actions: 'acceptRequest' } },
      invoke: {
        id: 'save',
        src: 'save',
        input: ({ context }) => context,
        onDone: [{ guard: 'retryable', target: 'waiting' }, { target: 'idle' }],
        onError: 'idle',
      },
    },
    waiting: {
      on: { 'sync.request': { actions: 'acceptRequest' } },
      after: { retryDelay: 'starting' },
    },
    stopped: { type: 'final' },
  },
});

export async function requestAgentCatalogSync(
  supervisor: ActorRefFrom<typeof syncSupervisorMachine>,
): Promise<{ accepted: true }> {
  if (supervisor.getSnapshot().status !== 'active')
    throw new Error('Sync supervisor is not available');
  const admitted = Promise.withResolvers<void>();
  supervisor.send({ type: syncRequestEvent, admitted });
  await admitted.promise;
  return { accepted: true };
}
