import type * as React from 'react';
import { type ReactNode, useEffect, useMemo } from 'react';
import { createActor, fromCallback } from 'xstate';
import { createConnectionInput } from '../src/features/connection/state/connection-input.mocks';
import {
  ConnectionContext,
  type ConnectionState,
} from '../src/features/connection/state/context';
import { connectionMachine } from '../src/features/connection/state/machine';

// A Connection machine held in `state`, for stories; it watches no WebSocket and refetches nothing.
function createConnectionStateMock(
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

// Holds a Connection in `state` for its children and stops it on unmount.
export function ConnectionStatePreview({
  state,
  children,
}: {
  state: ConnectionState;
  children: ReactNode;
}): React.JSX.Element {
  const connection = useMemo(() => createConnectionStateMock(state), [state]);
  useEffect(
    () => (): void => {
      connection.stop();
    },
    [connection],
  );
  return (
    <ConnectionContext.Provider value={connection}>
      {children}
    </ConnectionContext.Provider>
  );
}
