import type { ACPAgentRegistry } from '@repo/contracts';
import type { Database } from '@repo/db';
import { assign, fromPromise, setup, type ErrorActorEvent } from 'xstate';
import { commitCatalogAgents } from './records';
import { type RegistryPort, type createRegistryReader } from './registry';

export interface CatalogSyncInput {
  database: Database;
  registry: RegistryPort;
  reader: ReturnType<typeof createRegistryReader>;
}
interface CatalogSyncContext extends CatalogSyncInput {
  metadata: ACPAgentRegistry | null;
  changedIds: string[];
  error: string | null;
}

const recordInvokedFailure = {
  type: 'recordFailure',
  params: ({ event }: { event: ErrorActorEvent }) => ({ error: event.error }),
} as const;

export const catalogSyncMachine = setup({
  types: {
    input: {} as CatalogSyncInput,
    context: {} as CatalogSyncContext,
    events: {} as { type: 'catalog.cancel' },
    output: {} as { changedIds: string[]; error: string | null },
  },
  actors: {
    fetchCatalog: fromPromise<ACPAgentRegistry, CatalogSyncInput>(
      async ({ input, signal }) =>
        input.reader.parse(await input.registry.readRegistry(signal)),
    ),
    saveCatalog: fromPromise<string[], CatalogSyncContext>(
      async ({ input }) => {
        if (!input.metadata) throw new Error('Validated catalog is missing');
        return commitCatalogAgents(input.database, input.metadata);
      },
    ),
  },
  actions: {
    recordFailure: assign({
      error: (_, { error }: { error: unknown }) =>
        error instanceof Error ? error.message : String(error),
    }),
  },
  delays: { fetchLimit: 20_000 },
}).createMachine({
  id: 'catalogSync',
  context: ({ input }) => ({
    ...input,
    metadata: null,
    changedIds: [],
    error: null,
  }),
  initial: 'fetching',
  states: {
    fetching: {
      on: {
        'catalog.cancel': {
          target: 'failed',
          actions: {
            type: 'recordFailure',
            params: { error: 'Registry sync was cancelled' },
          },
        },
      },
      invoke: {
        id: 'fetchCatalog',
        src: 'fetchCatalog',
        input: ({ context }) => context,
        onDone: {
          target: 'saving',
          actions: assign({ metadata: ({ event }) => event.output }),
        },
        onError: {
          target: 'failed',
          actions: recordInvokedFailure,
        },
      },
      after: {
        fetchLimit: {
          target: 'failed',
          actions: {
            type: 'recordFailure',
            params: { error: 'Registry did not answer within 20 seconds' },
          },
        },
      },
    },
    saving: {
      invoke: {
        id: 'saveCatalog',
        src: 'saveCatalog',
        input: ({ context }) => context,
        onDone: {
          target: 'succeeded',
          actions: assign({ changedIds: ({ event }) => event.output }),
        },
        onError: {
          target: 'failed',
          actions: recordInvokedFailure,
        },
      },
    },
    succeeded: { type: 'final' },
    failed: { type: 'final' },
  },
  output: ({ context }) => ({
    changedIds: context.changedIds,
    error: context.error,
  }),
});
