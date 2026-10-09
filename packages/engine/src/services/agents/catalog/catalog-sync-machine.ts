import type { ACPAgentRegistry } from '@repo/contracts';
import type { Database } from '@repo/db';
import {
  assign,
  fromPromise,
  setup,
  type ActorRefFrom,
  type ErrorActorEvent,
} from 'xstate';
import type { writerMachine } from '../../feed';
import { writeDatabaseJobAndWaitForCommit } from '../../feed';
import { readCatalogRejectionCount } from './catalog-sql';
import { writeAgentCatalogThroughWriter } from './catalog-write';
import type { FetchAgents } from './fetch-agents';
import { prepareAgentCatalogRows } from './records';
import type { createRegistryReader } from './registry-reader';

export interface CatalogSyncInput {
  database: Database;
  syncId: string;
  now(): number;
  writer: ActorRefFrom<typeof writerMachine>;
  fetchAgents: FetchAgents;
  reader: ReturnType<typeof createRegistryReader>;
}
interface CatalogSyncContext extends CatalogSyncInput {
  metadata: ACPAgentRegistry | null;
  changedIds: string[];
  error: string | null;
  abandoned: boolean;
  rejectionCountBeforeFetch: number;
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
    output: {} as {
      changedIds: string[];
      error: string | null;
      abandoned: boolean;
    },
  },
  actors: {
    recordFailedSync: fromPromise<void, CatalogSyncContext>(async ({ input }) =>
      writeDatabaseJobAndWaitForCommit(input.writer, {
        type: 'catalogSyncFailure',
        syncIds: [input.syncId],
        status: 'failed',
        error: input.error ?? 'Registry sync failed',
        completedAt: input.now(),
        rejectedValues: countCatalogSyncRejections(input),
      }),
    ),
    fetchCatalog: fromPromise<ACPAgentRegistry, CatalogSyncInput>(
      async ({ input, signal }) =>
        input.reader.parse(await input.fetchAgents(signal)),
    ),
    saveCatalog: fromPromise<string[], CatalogSyncContext>(
      async ({ input }) => {
        if (!input.metadata) throw new Error('Validated catalog is missing');
        return writeAgentCatalogThroughWriter({
          database: input.database,
          writer: input.writer,
          job: prepareCatalogReplacement(input),
        });
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
    abandoned: false,
    rejectionCountBeforeFetch: input.reader.count(),
  }),
  initial: 'fetching',
  states: {
    fetching: {
      on: {
        'catalog.cancel': {
          target: 'recordingFailure',
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
          target: 'recordingFailure',
          actions: recordInvokedFailure,
        },
      },
      after: {
        fetchLimit: {
          target: 'recordingFailure',
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
          target: 'recordingFailure',
          actions: recordInvokedFailure,
        },
      },
    },
    succeeded: { type: 'final' },
    recordingFailure: {
      invoke: {
        id: 'recordFailedSync',
        src: 'recordFailedSync',
        input: ({ context }) => context,
        onDone: 'failed',
        onError: { target: 'failed', actions: assign({ abandoned: true }) },
      },
    },
    failed: { type: 'final' },
  },
  output: ({ context }) => ({
    changedIds: context.changedIds,
    error: context.error,
    abandoned: context.abandoned,
  }),
});

function prepareCatalogReplacement(
  input: CatalogSyncContext,
): import('../../feed').AgentCatalogReplaceJob {
  if (!input.metadata) throw new Error('Validated catalog is missing');
  const syncedAt = input.now();
  return {
    type: 'agentCatalogReplace',
    rows: prepareAgentCatalogRows(input.metadata, syncedAt),
    syncId: input.syncId,
    syncedAt,
    rejectedValues: countCatalogSyncRejections(input),
  };
}

function countCatalogSyncRejections(input: CatalogSyncContext): number {
  return (
    readCatalogRejectionCount(input.database) +
    input.reader.count() -
    input.rejectionCountBeforeFetch
  );
}
