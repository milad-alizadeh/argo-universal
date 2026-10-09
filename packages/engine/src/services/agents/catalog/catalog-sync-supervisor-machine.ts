import type { AgentsCatalogSyncOutput } from '@repo/contracts';
import type { Database } from '@repo/db';
import {
  assign,
  emit,
  sendTo,
  setup,
  spawnChild,
  stopChild,
  type DoneActorEvent,
} from 'xstate';
import { catalogSyncMachine } from './catalog-sync-machine';
import type { FetchAgents } from './fetch-agents';
import type { createRegistryReader } from './registry-reader';

export interface CatalogSyncSupervisorInput {
  database: Database;
  fetchAgents: FetchAgents;
  reader: ReturnType<typeof createRegistryReader>;
  platform: string;
  now(): number;
}
interface CatalogSyncSupervisorContext extends CatalogSyncSupervisorInput {
  completedSyncs: number;
  syncedAt: number | null;
  result: AgentsCatalogSyncOutput;
}
type CatalogWorkerResult = { changedIds: string[]; error: string | null };
type CatalogWorkerDone = DoneActorEvent<CatalogWorkerResult, 'catalogWorker'>;
type SupervisorEvent =
  | { type: 'catalog.sync' | 'catalog.shutdown' }
  | CatalogWorkerDone;
const finishWorker = ['recordCompletion', 'stopWorker'] as const;
const finishCommittedWorker = [...finishWorker, 'publishCommittedIds'] as const;

export const catalogSyncSupervisorMachine = setup({
  types: {
    input: {} as CatalogSyncSupervisorInput,
    context: {} as CatalogSyncSupervisorContext,
    events: {} as SupervisorEvent,
    emitted: {} as { type: 'catalog.committed'; changedIds: string[] },
  },
  actors: { catalogWorker: catalogSyncMachine },
  guards: {
    committed: ({ event }) =>
      event.type === 'xstate.done.actor.catalogWorker' &&
      event.output.error === null,
  },
  actions: {
    startWorker: spawnChild('catalogWorker', {
      id: 'catalogWorker',
      input: ({ context }) => context,
    }),
    cancelFetch: sendTo('catalogWorker', { type: 'catalog.cancel' }),
    stopWorker: stopChild('catalogWorker'),
    recordCompletion: assign(({ context, event }) => {
      if (event.type !== 'xstate.done.actor.catalogWorker') return {};
      return {
        completedSyncs: context.completedSyncs + 1,
        syncedAt: event.output.error ? context.syncedAt : context.now(),
        result: { ...event.output, rejectedValues: context.reader.count() },
      };
    }),
    publishCommittedIds: emit(({ context }) => ({
      type: 'catalog.committed',
      changedIds: context.result.changedIds,
    })),
  },
}).createMachine({
  id: 'catalogSyncSupervisor',
  context: ({ input }) => ({
    ...input,
    completedSyncs: 0,
    syncedAt: null,
    result: {
      changedIds: [],
      error: null,
      rejectedValues: 0,
    },
  }),
  initial: 'idle',
  states: {
    idle: {
      on: {
        'catalog.sync': { target: 'syncing', actions: 'startWorker' },
        'catalog.shutdown': { target: 'stopped' },
      },
    },
    syncing: {
      on: {
        'catalog.sync': {},
        'catalog.shutdown': { target: 'stopping', actions: 'cancelFetch' },
        'xstate.done.actor.catalogWorker': [
          {
            guard: 'committed',
            target: 'idle',
            actions: finishCommittedWorker,
          },
          { target: 'idle', actions: finishWorker },
        ],
      },
    },
    stopping: {
      on: {
        'xstate.done.actor.catalogWorker': [
          {
            guard: 'committed',
            target: 'stopped',
            actions: finishCommittedWorker,
          },
          { target: 'stopped', actions: finishWorker },
        ],
      },
    },
    stopped: { type: 'final' },
  },
});
