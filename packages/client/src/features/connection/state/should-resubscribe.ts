import type { ConnectionState } from './context';

// A failed subscription restarts once, on the step where the Connection reopens.
export function shouldResubscribe(
  previous: ConnectionState,
  current: ConnectionState,
  subscriptionStatus: string,
): boolean {
  return (
    previous !== 'open' && current === 'open' && subscriptionStatus === 'error'
  );
}
