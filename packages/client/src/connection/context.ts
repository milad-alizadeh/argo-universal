import { useSelector } from '@xstate/react';
import { createContext, useContext, useEffect, useRef } from 'react';
import type { SnapshotFrom } from 'xstate';
import type { connectionMachine } from './machine';
import type { ConnectionActor } from './open-connection';

export type ConnectionState = SnapshotFrom<
  typeof connectionMachine
>['value']['link'];

export const ConnectionContext = createContext<ConnectionActor | null>(null);

// The App's Connection machine, from AppProviders or a story's mock.
export function useConnection() {
  const connection = useContext(ConnectionContext);
  if (!connection) throw new Error('useConnection needs AppProviders');
  return connection;
}

export function useConnectionState(): ConnectionState {
  return useSelector(useConnection(), (snapshot) => snapshot.value.link);
}

// Failed subscriptions restart once when the Connection reopens.
export function useResubscribeOnReconnect(subscription: {
  status: string;
  reset: () => void;
}) {
  const state = useConnectionState();
  const previous = useRef(state);
  const { status, reset } = subscription;
  useEffect(() => {
    if (previous.current !== 'open' && state === 'open' && status === 'error')
      reset();
    previous.current = state;
  }, [state, status, reset]);
}
