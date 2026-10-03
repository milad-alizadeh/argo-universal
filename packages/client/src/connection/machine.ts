import type { QueryClient } from '@tanstack/react-query';
import type { TRPCWebSocketClient } from '@trpc/client';
import {
  and,
  assign,
  type EventObject,
  enqueueActions,
  fromCallback,
  not,
  setup,
  stateIn,
} from 'xstate';

export interface ConnectionInput {
  webSocketClient: TRPCWebSocketClient;
  queryClient: QueryClient;
}

interface ConnectionContext extends ConnectionInput {
  // Attempts allowed since the Connection last opened.
  attempts: number;
}

type ConnectionEvent =
  | { type: 'connection.opened' }
  | { type: 'connection.lost'; error: unknown }
  | { type: 'connection.attemptRequested' }
  | { type: 'app.foreground' };

export type ConnectionEmitted = { type: 'connection.attemptAllowed' };

const offlineDelayMs = 10_000;
const retryDelayBaseMs = 500;
const retryDelayCapMs = 30_000;

const isDown = and([
  not(stateIn({ link: 'connecting' })),
  not(stateIn({ link: 'open' })),
]);

// Spec 0002 section 11: the App's Connection to the Server, and the timing of every attempt to open it.
export const connectionMachine = setup({
  types: {
    input: {} as ConnectionInput,
    context: {} as ConnectionContext,
    events: {} as ConnectionEvent,
    emitted: {} as ConnectionEmitted,
  },
  actors: {
    // tRPC's `pending` means the WebSocket opened; `connecting` with an error means it closed.
    watchConnectionState: fromCallback<
      EventObject,
      { webSocketClient: TRPCWebSocketClient }
    >(({ input, sendBack }) => {
      const subscription = input.webSocketClient.connectionState.subscribe({
        next: (state) => {
          if (state.state === 'pending')
            sendBack({ type: 'connection.opened' } satisfies ConnectionEvent);
          else if (state.state === 'connecting' && state.error)
            sendBack({
              type: 'connection.lost',
              error: state.error,
            } satisfies ConnectionEvent);
        },
      });
      return () => subscription.unsubscribe();
    }),
  },
  actions: {
    allowAttempt: enqueueActions(({ context, enqueue }) => {
      enqueue.assign({ attempts: context.attempts + 1 });
      enqueue.emit({ type: 'connection.attemptAllowed' });
    }),
    resetAttempts: assign({ attempts: 0 }),
    // Fetches system.info and the Feed pages again; subscriptions restart through wsLink on their own.
    refetchAfterReconnect: ({ context }) => {
      void context.queryClient.invalidateQueries();
    },
  },
  guards: {
    firstAttempt: and([
      stateIn({ link: 'connecting' }),
      ({ context }) => context.attempts === 0,
    ]),
    isDown,
  },
  delays: {
    offlineDelay: offlineDelayMs,
    retryDelay: ({ context }) =>
      Math.min(retryDelayBaseMs * 2 ** context.attempts, retryDelayCapMs),
  },
}).createMachine({
  id: 'connection',
  context: ({ input }) => ({ ...input, attempts: 0 }),
  invoke: {
    id: 'watchConnectionState',
    src: 'watchConnectionState',
    input: ({ context }) => ({ webSocketClient: context.webSocketClient }),
  },
  type: 'parallel',
  states: {
    link: {
      initial: 'connecting',
      states: {
        connecting: {
          on: {
            'connection.opened': { target: 'open', actions: 'resetAttempts' },
          },
        },
        open: {
          on: { 'connection.lost': { target: 'reconnecting' } },
        },
        reconnecting: {
          after: { offlineDelay: { target: 'offline' } },
          on: {
            'connection.opened': {
              target: 'open',
              actions: ['resetAttempts', 'refetchAfterReconnect'],
            },
          },
        },
        offline: {
          on: {
            'connection.opened': {
              target: 'open',
              actions: ['resetAttempts', 'refetchAfterReconnect'],
            },
          },
        },
      },
    },
    // wsClient awaits `connection.attemptAllowed` before every attempt to open the WebSocket.
    attempt: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            'connection.attemptRequested': [
              { guard: 'firstAttempt', actions: 'allowAttempt' },
              { target: 'waiting' },
            ],
          },
        },
        waiting: {
          after: {
            retryDelay: { target: 'idle', actions: 'allowAttempt' },
          },
          on: {
            'app.foreground': {
              guard: 'isDown',
              target: 'idle',
              actions: 'allowAttempt',
            },
          },
        },
      },
    },
  },
});
