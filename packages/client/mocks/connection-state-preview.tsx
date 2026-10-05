import { type ReactNode, useEffect, useState } from 'react';
import {
  ConnectionContext,
  type ConnectionState,
} from '../src/connection/context';
import { createConnectionStateMock } from './connection-state-mock';

// Holds a Connection in `state` for its children and stops it on unmount.
export function ConnectionStatePreview({
  state,
  children,
}: {
  state: ConnectionState;
  children: ReactNode;
}) {
  const [connection] = useState(() => createConnectionStateMock(state));
  useEffect(
    () => () => {
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
