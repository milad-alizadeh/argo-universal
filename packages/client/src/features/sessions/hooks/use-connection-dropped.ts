import { useState } from 'react';
import { useConnectionState } from '#features/connection';
import { connectionDropped } from '../utils/open-failure';

interface Decision {
  cause: unknown;
  dropped: boolean;
}

/*
 * Whether the Connection dropped this error, decided once from the Connection's state when the
 * error first shows: the Connection reopening later does not turn a drop into a failure.
 */
export function useConnectionDropped(cause: unknown): boolean {
  const connection = useConnectionState();

  const decide = (): Decision => ({
    cause,
    dropped: connectionDropped(cause, connection),
  });

  const [decision, setDecision] = useState(decide);

  if (decision.cause === cause) return decision.dropped;
  const next = decide();
  setDecision(next);

  return next.dropped;
}
