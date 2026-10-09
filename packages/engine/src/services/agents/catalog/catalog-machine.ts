import type { Database } from '@repo/db';
import { type ActorRefFrom, assign, fromPromise, setup } from 'xstate';
import {
  type RegistrySnapshot,
  type RegistryStorage,
  readRegistryCache,
  refreshRegistry,
} from './cache';
import {
  createRegistryReader,
  publicRegistry,
  type RegistryPort,
} from './registry';

export const agentCatalogId = 'agentCatalog';
export interface CatalogInput {
  database: Database;
  registry?: RegistryPort;
  platform?: string;
}
interface CatalogContext extends RegistrySnapshot {
  storage: RegistryStorage;
  platform: string;
}
type CatalogEvent = { type: 'catalog.refresh' | 'catalog.stop' };
type SnapshotParameters = { snapshot: RegistrySnapshot };
type FailureParameters = { message: string };
const refreshTimeout = 20_000;

function serverPlatform(): string {
  const os = process.platform === 'win32' ? 'windows' : process.platform;
  return `${os}-${serverArchitecture()}`;
}

function serverArchitecture(): string {
  if (process.arch === 'arm64') return 'aarch64';
  return process.arch === 'x64' ? 'x86_64' : process.arch;
}

export const catalogMachine = setup({
  types: {
    input: {} as CatalogInput,
    context: {} as CatalogContext,
    events: {} as CatalogEvent,
  },
  actors: {
    hydrate: fromPromise<RegistrySnapshot, RegistryStorage>(
      ({ input }): Promise<RegistrySnapshot> => readRegistryCache(input),
    ),
    refresh: fromPromise<RegistrySnapshot, RegistryStorage>(
      ({ input, signal }): Promise<RegistrySnapshot> =>
        refreshRegistry(input, signal),
    ),
  },
  actions: {
    rememberCatalog: assign(
      (_, { snapshot }: SnapshotParameters): RegistrySnapshot => snapshot,
    ),
    rememberFailure: assign({
      error: (_, { message }: FailureParameters): string => message,
    }),
  },
  delays: { refreshTimeout },
}).createMachine({
  id: agentCatalogId,
  context: ({ input }): CatalogContext => ({
    registry: null,
    fetchedAt: null,
    error: null,
    platform: input.platform ?? serverPlatform(),
    storage: {
      database: input.database,
      reader: createRegistryReader(),
      port: input.registry ?? publicRegistry,
    },
  }),
  initial: 'hydrating',
  on: { 'catalog.stop': '.stopped' },
  states: {
    hydrating: {
      invoke: {
        id: 'hydrate',
        src: 'hydrate',
        input: ({ context }): RegistryStorage => context.storage,
        onDone: {
          target: 'idle',
          actions: {
            type: 'rememberCatalog',
            params: ({ event }): SnapshotParameters => ({
              snapshot: event.output,
            }),
          },
        },
      },
    },
    idle: { on: { 'catalog.refresh': 'refreshing' } },
    refreshing: {
      invoke: {
        id: 'refresh',
        src: 'refresh',
        input: ({ context }): RegistryStorage => context.storage,
        onDone: {
          target: 'ready',
          actions: {
            type: 'rememberCatalog',
            params: ({ event }): SnapshotParameters => ({
              snapshot: event.output,
            }),
          },
        },
        onError: {
          target: 'ready',
          actions: {
            type: 'rememberFailure',
            params: ({ event }): FailureParameters => ({
              message:
                event.error instanceof Error
                  ? event.error.message
                  : String(event.error),
            }),
          },
        },
      },
      after: {
        refreshTimeout: {
          target: 'ready',
          actions: {
            type: 'rememberFailure',
            params: { message: 'Registry did not answer within 20 seconds' },
          },
        },
      },
    },
    ready: { on: { 'catalog.refresh': 'refreshing' } },
    stopped: { type: 'final' },
  },
});

export type CatalogActorRef = ActorRefFrom<typeof catalogMachine>;
