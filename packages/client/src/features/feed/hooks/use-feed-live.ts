import type { FeedSubscribeOutput, FeedSyncPoint } from '@repo/contracts';
import { focusManager } from '@tanstack/react-query';
import {
  type TRPCSubscriptionResult,
  useSubscription,
} from '@trpc/tanstack-react-query';
import { useEffect, useEffectEvent, useState } from 'react';
import {
  type ClientError,
  useResubscribeOnReconnect,
  useTRPC,
} from '#features/connection';
import { type FeedCache, resumeAfter, samePoint } from '../api/feed-cache';
import { closedFeedError } from '../utils/closed-feed-error';

export type LiveChanges = TRPCSubscriptionResult<
  FeedSubscribeOutput,
  ClientError
>;

// The Server closed the Feed, with or without an error to show.
type FeedClosure = { error: Error | null } | null;

export interface FeedLive {
  changes: LiveChanges;
  closure: FeedClosure;
  // Reopens live changes after the newest revision the cache holds.
  retryOpen: () => void;
}

interface LiveState {
  cache: FeedCache;
  openAt: FeedSyncPoint | null;
  closure: FeedClosure;
}

// The point and closure belong to one Session's cache; another cache starts afresh.
function useLiveState(
  cache: FeedCache,
): [LiveState, (change: Partial<Omit<LiveState, 'cache'>>) => void] {
  const [live, setLive] = useState<LiveState>(() => ({
    cache,
    openAt: cache.syncPoint(),
    closure: null,
  }));

  if (live.cache !== cache) {
    const next = { cache, openAt: cache.syncPoint(), closure: null };
    setLive(next);

    return [next, (change) => setLive((held) => ({ ...held, ...change }))];
  }

  return [live, (change) => setLive((held) => ({ ...held, ...change }))];
}

// The live subscription, open only while shown. It opens after the newest revision the cache holds: on the first rows, on a return from hiding, on a reconnect and on a return to the foreground.
export function useFeedLive(
  sessionId: string | undefined,
  cache: FeedCache,
  shown: boolean,
): FeedLive {
  const [live, setLive] = useLiveState(cache);
  const held = cache.syncPoint();

  // While nothing is open the next open is after the rows held; an open subscription keeps its own point.
  if ((!shown || live.openAt === null) && !samePoint(live.openAt, held))
    setLive({ openAt: held });

  const options = useTRPC().feed.subscribe.subscriptionOptions({
    sessionId: sessionId ?? '',
    after: shown ? live.openAt : null,
  });

  const changes = useSubscription({
    ...options,
    enabled: sessionId !== undefined && shown && live.openAt !== null,
    onData: (event) => {
      if (event.type !== 'closed') return cache.receive(event);

      if (cache.isShown())
        setLive({ closure: { error: closedFeedError(event) } });
    },
  });

  const retryOpen = (): void => {
    setLive({ closure: null });
    const { point, restart } = resumeAfter(live.openAt, cache.syncPoint());

    if (restart) changes.reset();
    else setLive({ openAt: point });
  };

  useResumeOnReconnect(changes, retryOpen);

  return { changes, closure: live.closure, retryOpen };
}

// A stopped subscription reopens after the rows held on reconnect and when the window regains focus.
function useResumeOnReconnect(
  changes: LiveChanges,
  retryOpen: () => void,
): void {
  useResubscribeOnReconnect(changes, retryOpen);

  const reopenIfStopped = useEffectEvent(() => {
    if (changes.status === 'error') retryOpen();
  });

  useEffect(
    () =>
      focusManager.subscribe((focused) => {
        if (focused) reopenIfStopped();
      }),
    [],
  );
}
