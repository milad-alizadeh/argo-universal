import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { ConnectionState } from '../state/connection';
import { shouldResubscribe } from '../state/should-resubscribe';
import { useConnection } from '../stores/connection-context';

export function useConnectionState(): ConnectionState {
  const connection = useConnection();

  return useSyncExternalStore(
    connection.subscribe,
    connection.state,
    connection.state,
  );
}

// Failed subscriptions restart once when the Connection reopens.
export function useResubscribeOnReconnect(subscription: {
  status: string;
  reset: () => void;
}): void {
  const state = useConnectionState();
  const previous = useRef(state);
  const { status, reset } = subscription;
  useEffect(() => {
    if (shouldResubscribe(previous.current, state, status)) reset();
    previous.current = state;
  }, [state, status, reset]);
}
