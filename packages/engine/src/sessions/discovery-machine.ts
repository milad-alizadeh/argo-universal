import type { SessionDiscovery } from '@repo/contracts';
import { assign, fromPromise, setup } from 'xstate';
import {
  discoverSessionOptions,
  type DiscoveryOperationInput,
} from './acp/discovery';

export type DiscoveryResult = {
  key: string;
  result: SessionDiscovery | null;
  error: unknown;
};

export const discoveryMachine = setup({
  // SAFETY: XState uses these only as type declarations.
  types: {
    input: {} as DiscoveryOperationInput & { key: string },
    context: {} as DiscoveryOperationInput & DiscoveryResult,
    output: {} as DiscoveryResult,
  },
  actors: {
    discover: fromPromise<SessionDiscovery, DiscoveryOperationInput>(
      ({ input, signal }) => discoverSessionOptions(input, signal),
    ),
  },
}).createMachine({
  id: 'discovery',
  context: ({ input }) => ({ ...input, result: null, error: null }),
  initial: 'discovering',
  states: {
    discovering: {
      invoke: {
        id: 'discover',
        src: 'discover',
        input: ({ context }) => context,
        onDone: {
          target: 'succeeded',
          actions: assign({ result: ({ event }) => event.output }),
        },
        onError: {
          target: 'failed',
          actions: assign({ error: ({ event }) => event.error }),
        },
      },
    },
    succeeded: { type: 'final' },
    failed: { type: 'final' },
  },
  output: ({ context }) => ({
    key: context.key,
    result: context.result,
    error: context.error,
  }),
});
