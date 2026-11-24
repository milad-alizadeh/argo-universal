import {
  type FeedSubscribeOutput,
  feedEventId,
  type SessionUpdate,
} from '@repo/contracts';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import {
  type TRPCSubscriptionResult,
  useSubscription,
} from '@trpc/tanstack-react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  type ClientError,
  useResubscribeOnReconnect,
  useTRPC,
} from '#features/connection';
import { applyFeedEvents } from '../api/apply-feed-events';
import { feedKey } from '../api/feed-query';
import { closedFeedError } from '../utils/closed-feed-error';
import { emptyFeed, type FeedState, syncPointOf } from '../view/feed-state';
import { waitForFrame } from './frame-wait';

type Changes = Exclude<FeedSubscribeOutput, { type: 'closed' }>;

// `feed.subscribe` gives each event but the last an id; tRPC hands it over with the event.
type Received = FeedSubscribeOutput | { id: string; data: FeedSubscribeOutput };

interface LiveOptions {
  cacheId: string | undefined;
  shown: boolean;
  // The Feed has rows to resume after.
  loaded: boolean;
}

export interface FeedLive {
  changes: TRPCSubscriptionResult<Received, ClientError>;
  // The Server closed the Feed, with or without an error to show.
  closure: { error: Error | null } | null;
  // Opens live changes again, after a closure.
  retryOpen: () => void;
}

const eventOf = (received: Received): FeedSubscribeOutput =>
  'type' in received ? received : received.data;

// Live changes gather for a frame, then are written once; what arrives after the Session is hidden is dropped.
function useFrames(
  sessionId: string | undefined,
  { cacheId, shown }: { cacheId: string; shown: boolean },
): (event: Changes) => void {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const batch = useRef<Changes[]>([]);
  const frame = useRef<(() => void) | null>(null);

  useEffect(
    () => (): void => {
      frame.current?.();
      frame.current = null;
      batch.current = [];
    },
    [cacheId, shown],
  );

  const fetchRow = (id: string): Promise<SessionUpdate> =>
    queryClient.fetchQuery({
      ...trpc.feed.row.queryOptions({ sessionId: sessionId ?? '', id }),
      staleTime: 0,
      gcTime: 0,
    });

  const flush = (): void => {
    frame.current = null;
    const events = batch.current;
    batch.current = [];
    applyFeedEvents({ queryClient, cacheId, fetchRow }, events);
  };

  return (event): void => {
    batch.current.push(event);
    frame.current ??= waitForFrame(flush);
  };
}

interface Opening {
  shown: boolean;
  loaded: boolean;
  // How many times the cache was read for a new open; a read is what gives the memo below a new point.
  reads: number;
}

// Where a subscription opening now resumes: after the newest revision the cache holds.
function pointToOpen(
  queryClient: QueryClient,
  cacheId: string,
  { shown, loaded }: Opening,
): string | undefined {
  if (!shown || !loaded) return;

  const point = syncPointOf(
    queryClient.getQueryData<FeedState>(feedKey(cacheId)) ?? emptyFeed,
  );

  return point ? feedEventId(point) : undefined;
}

interface ResumePoint {
  lastEventId: string | undefined;
  // The id an open now would carry.
  read: () => string | undefined;
  reread: () => void;
}

// The id the subscription opens with, read when it opens (on the first rows, on a return from hiding, and when it reopens), not on every row. From then on tRPC's client sends the id of the last event it received when its socket reconnects.
function useResumePoint(
  cacheId: string,
  { shown, loaded }: Pick<LiveOptions, 'shown' | 'loaded'>,
): ResumePoint {
  const queryClient = useQueryClient();
  const [reads, setReads] = useState(0);

  const lastEventId = useMemo(
    () => pointToOpen(queryClient, cacheId, { shown, loaded, reads }),
    [queryClient, cacheId, shown, loaded, reads],
  );

  return {
    lastEventId,
    read: (): string | undefined =>
      pointToOpen(queryClient, cacheId, { shown, loaded, reads }),
    reread: (): void => setReads((count) => count + 1),
  };
}

export function useFeedLive(
  sessionId: string | undefined,
  { cacheId = '', shown, loaded }: LiveOptions,
): FeedLive {
  const trpc = useTRPC();
  const [closure, setClosure] = useState<FeedLive['closure']>(null);
  const receive = useFrames(sessionId, { cacheId, shown });

  const { lastEventId, read, reread } = useResumePoint(cacheId, {
    shown,
    loaded,
  });

  const changes = useSubscription(
    trpc.feed.subscribe.subscriptionOptions(
      { sessionId: sessionId ?? '', after: null, lastEventId },
      {
        enabled: sessionId !== undefined && lastEventId !== undefined,
        onData: (received) => {
          const event = eventOf(received);

          if (event.type === 'closed')
            setClosure({ error: closedFeedError(event) });
          else receive(event);
        },
      },
    ),
  );

  // A new open starts after the newest revision the cache holds: a new id opens it by itself, the same one starts it again.
  const reopen = (): void => {
    if (read() === lastEventId) changes.reset();
    else reread();
  };

  useResubscribeOnReconnect({ status: changes.status, reset: reopen });

  return {
    changes,
    closure,
    retryOpen: (): void => {
      setClosure(null);
      reopen();
    },
  };
}
