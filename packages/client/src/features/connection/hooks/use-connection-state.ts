import { useEffect, useEffectEvent, useRef, useSyncExternalStore } from 'react';
import type { ConnectionState } from '../stores/connection';
import { useConnection } from '../stores/connection-context';
import { shouldResubscribe } from '../utils/should-resubscribe';

export function useConnectionState(): ConnectionState {
  const connection = useConnection();

  return useSyncExternalStore(
    connection.subscribe,
    connection.state,
    connection.state,
  );
}

// Failed subscriptions restart once when the Connection reopens; `restart` says how, such as after a point that moved.
export function useResubscribeOnReconnect(
  subscription: { status: string; reset: () => void },
  restart: () => void = subscription.reset,
): void {
  const state = useConnectionState();
  const previous = useRef(state);
  const { status } = subscription;
  const restartOnReconnect = useEffectEvent(restart);
  useEffect(() => {
    if (shouldResubscribe(previous.current, state, status))
      restartOnReconnect();
    previous.current = state;
  }, [state, status]);
}
