import type { Subscription } from 'xstate';
import type { SessionWorkWatcher } from '../../sessions';
import type { OperationCaller } from '../session-tokens';

// Revocation belongs to the calling Session even when the target is another Session.
export function watchOperationWork(
  watch: SessionWorkWatcher,
  caller: OperationCaller,
): SessionWorkWatcher {
  if (caller.kind === 'user') return watch;

  return (sessionId, listener) => {
    const subscriptions = [watch(sessionId, listener)];

    if (sessionId !== caller.sessionId)
      subscriptions.push(watch(caller.sessionId, listener));

    return { unsubscribe: () => unsubscribeAll(subscriptions) };
  };
}

function unsubscribeAll(subscriptions: Subscription[]): void {
  for (const subscription of subscriptions) subscription.unsubscribe();
}
