import type { ACPAgentRegistry } from '@repo/contracts';
import type { Database } from '@repo/db';
import { assign, fromPromise, setup, waitFor, type ActorRefFrom } from 'xstate';
import { millisecondsPerSecond } from '../../lib/time';
import {
  writeDatabaseJobAndWaitForCommit,
  type WriterActorRef,
} from '../../storage';
import { fetchAgents, fetchTimeoutMs, type FetchAgents } from './fetch-agents';
import { readRegistryCache, RegistryCacheReplaceJob } from './registry-cache';
import { createRegistryReader } from './registry-reader';

export type RegistryInput = {
  database: Database;
  writer: WriterActorRef;
  now: () => number;
  fetchAgents?: FetchAgents;
};

type RegistryContext = RegistryInput & {
  lastAttemptAt: number | null;
  error: string | null;
  registry: ACPAgentRegistry;
};

type RegistryEvent = { type: 'REFRESH' | 'STALE' | 'STOP' };

export const hourMs = 3_600_000;

export const registryMachine = setup({
  // SAFETY: XState v5 reads these as type-only declarations; the empty objects are never used as runtime values.
  types: {
    input: {} as RegistryInput,
    context: {} as RegistryContext,
    events: {} as RegistryEvent,
  },
  actors: {
    fetchRegistry: fromPromise(
      async ({
        input,
        signal,
      }: {
        input: RegistryInput;
        signal: AbortSignal;
      }) => {
        const text = await (input.fetchAgents ?? fetchAgents)(signal);
        signal.throwIfAborted();

        return createRegistryReader().parse(text);
      },
    ),
    saveRegistry: fromPromise<
      void,
      { context: RegistryInput; registry: ACPAgentRegistry }
    >(async ({ input }) => {
      await writeDatabaseJobAndWaitForCommit(
        input.context.writer,
        new RegistryCacheReplaceJob(input.registry, input.context.now()),
        true,
      );
    }),
  },
  guards: {
    missing: ({ context }) => readRegistryCache(context.database) === null,
    stale: ({ context }) =>
      context.lastAttemptAt === null ||
      context.now() - context.lastAttemptAt >= hourMs,
  },
  delays: { fetchLimit: fetchTimeoutMs },
}).createMachine({
  id: 'registry',
  context: ({ input }) => ({
    ...input,
    lastAttemptAt: null,
    error: null,
    registry: { version: '1.0.0', agents: [] },
  }),
  initial: 'checking',
  on: { STOP: { target: '.done' } },
  states: {
    checking: {
      always: [{ guard: 'missing', target: 'fetching' }, { target: 'idle' }],
    },
    idle: {
      on: {
        REFRESH: { target: 'fetching' },
        STALE: { guard: 'stale', target: 'fetching' },
      },
    },
    fetching: {
      entry: assign({ lastAttemptAt: ({ context }) => context.now() }),
      after: {
        fetchLimit: {
          target: 'idle',
          actions: assign({
            error: `Registry did not answer within ${fetchTimeoutMs / millisecondsPerSecond} seconds`,
          }),
        },
      },
      invoke: {
        id: 'fetchRegistry',
        src: 'fetchRegistry',
        input: ({ context }) => context,
        onDone: {
          target: 'saving',
          actions: assign({ registry: ({ event }) => event.output }),
        },
        onError: {
          target: 'idle',
          actions: assign({ error: ({ event }) => String(event.error) }),
        },
      },
    },
    saving: {
      invoke: {
        id: 'saveRegistry',
        src: 'saveRegistry',
        input: ({ context }) => ({ context, registry: context.registry }),
        onDone: { target: 'idle', actions: assign({ error: null }) },
        onError: {
          target: 'idle',
          actions: assign({ error: ({ event }) => String(event.error) }),
        },
      },
    },
    done: { type: 'final' },
  },
});

export type RegistryActor = ActorRefFrom<typeof registryMachine>;

export const requestRegistry = async (
  actor: RegistryActor,
  type: 'REFRESH' | 'STALE',
): Promise<void> => {
  if (actor.getSnapshot().status !== 'active')
    throw new Error('Registry is stopped');
  actor.send({ type });

  const settled = await waitFor(
    actor,
    (snapshot) => snapshot.matches('idle') || snapshot.status === 'done',
  );

  if (settled.status === 'done') throw new Error('Registry is stopped');
};
