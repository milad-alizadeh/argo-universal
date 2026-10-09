import { createActor, fromCallback } from 'xstate';
import type { ConnectionState } from '../src/connection/context';
import { connectionMachine } from '../src/connection/machine';
import { createConnectionInput } from './connection-input';

// A Connection machine held in `state`, for stories; it watches no WebSocket and refetches nothing.
export function createConnectionStateMock(
  state: ConnectionState,
): ReturnType<typeof createActor<typeof connectionMachine>> {
  const machine = connectionMachine.provide({
    actors: { watchConnectionState: fromCallback(() => {}) },
    actions: { refetchAfterReconnect: () => {} },
  });
  const input = createConnectionInput();
  return createActor(machine, {
    input,
    snapshot: machine.resolveState({
      value: { link: state, attempt: 'idle' },
      context: {
        ...input,
        attempts: 0,
      },
    }),
  }).start();
}
