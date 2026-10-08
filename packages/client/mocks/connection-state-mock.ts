import type { QueryClient } from '@tanstack/react-query';
import type { TRPCWebSocketClient } from '@trpc/client';
import { createActor, fromCallback } from 'xstate';
import type { ConnectionState } from '../src/connection/context';
import { connectionMachine } from '../src/connection/machine';

// A Connection machine held in `state`, for stories; it watches no WebSocket and refetches nothing.
export function createConnectionStateMock(
  state: ConnectionState,
): ReturnType<typeof createActor<typeof connectionMachine>> {
  const machine = connectionMachine.provide({
    actors: { watchConnectionState: fromCallback(() => {}) },
    actions: { refetchAfterReconnect: () => {} },
  });
  return createActor(machine, {
    input: {
      webSocketClient: {} as TRPCWebSocketClient,
      queryClient: {} as QueryClient,
    },
    snapshot: machine.resolveState({
      value: { link: state, attempt: 'idle' },
      context: {
        webSocketClient: {} as TRPCWebSocketClient,
        queryClient: {} as QueryClient,
        attempts: 0,
      },
    }),
  }).start();
}
