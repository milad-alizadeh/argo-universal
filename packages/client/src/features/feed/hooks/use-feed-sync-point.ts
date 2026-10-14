import type { FeedPageOutput, FeedSyncPoint } from '@repo/contracts';
import { useCallback, useState } from 'react';
import { historySyncPoint } from './session-feed';

interface FeedSubscriptionCursor {
  syncPoint: FeedSyncPoint | null;
  setSyncPoint: (point: FeedSyncPoint | null) => void;
}

// History supplies the first subscription cursor; later paging keeps that cursor until an explicit resume.
export function useFeedSyncPoint(
  sessionId: string | undefined,
  initial: FeedSyncPoint | null,
  firstPage: FeedPageOutput | undefined,
): FeedSubscriptionCursor {
  const [held, setHeld] = useState({ sessionId, point: initial });
  const retained = held.sessionId === sessionId ? held.point : initial;
  const point = retained ?? historySyncPoint(firstPage);

  if (held.sessionId !== sessionId || held.point !== point)
    setHeld({ sessionId, point });

  const setSyncPoint = useCallback(
    (next: FeedSyncPoint | null) => setHeld({ sessionId, point: next }),
    [sessionId],
  );

  return { syncPoint: point, setSyncPoint };
}
