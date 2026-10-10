import type * as React from 'react';
import { type ReactNode, useEffect, useMemo } from 'react';
import {
  ConnectionContext,
  type ConnectionState,
} from '../src/features/connection/state/context';
import { createConnectionStateMock } from './connection-state-mock';

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
