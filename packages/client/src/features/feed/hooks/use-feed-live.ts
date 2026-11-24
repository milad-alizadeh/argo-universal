import {
  type FeedSubscribeInput,
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
  // For a Feed that is not the Session's own and cannot open on its tail: whether it holds rows to resume after. Leave it out for the Session's Feed, which opens cold on the tail.
  loaded?: boolean;
}

export interface FeedLive {
  changes: TRPCSubscriptionResult<Received, ClientError>;
  // The Server closed the Feed, with or without an error to show.
  closure: { error: Error | null } | null;
  // Opens live changes again, after a closure.
  retryOpen: () => void;
  // The subscription opened cold and has not brought the tail yet: it, not a page read, fills the Feed.
  awaitingTail: boolean;
}

const eventOf = (received: Received): FeedSubscribeOutput =>
  'type' in received ? received : received.data;

// Live changes gather for a frame, then are written once; what arrives after the Session is hidden is dropped.
function useFrames(
  sessionId: string | undefined,
  { cacheId, shown }: { cacheId: string; shown: boolean },
  onTail: () => void,
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

    // Said once the rows are held, so the Feed does not read a page in the gap.
    if (events.some((event) => event.type === 'tail')) onTail();
  };

  return (event): void => {
    batch.current.push(event);
    frame.current ??= waitForFrame(flush);
  };
}

type Opening = Pick<LiveOptions, 'shown' | 'loaded'>;

// Where a subscription opening now resumes: after the newest revision the cache holds.
function pointToOpen(
  queryClient: QueryClient,
  cacheId: string,
  { shown, loaded }: Opening,
): string | undefined {
  if (!shown || loaded === false) return;

  const point = syncPointOf(
    queryClient.getQueryData<FeedState>(feedKey(cacheId)) ?? emptyFeed,
  );

  return point ? feedEventId(point) : undefined;
}

// A reopen's id, good for the open it was read for.
interface Reopened {
  opening: string | undefined;
  id: string | undefined;
}

interface ResumePoint {
  lastEventId: string | undefined;
  // The id an open now would carry.
  read: () => string | undefined;
  // Opens again with `id`, which the cache holds a newer revision than the id it opened with.
  reopenAt: (id: string | undefined) => void;
}

// The id the subscription opens with, read when it opens (on showing the Session), not on every row, and read again for a reopen. No id is a cold open: the subscription brings the tail itself. From then on tRPC's client sends the id of the last event it received when its socket reconnects.
function useResumePoint(cacheId: string, opening: Opening): ResumePoint {
  const queryClient = useQueryClient();
  const [reopened, setReopened] = useState<Reopened | null>(null);

  const opened = useMemo(
    () => pointToOpen(queryClient, cacheId, { shown: opening.shown }),
    [queryClient, cacheId, opening.shown],
  );

  return {
    lastEventId:
      reopened !== null && reopened.opening === opened ? reopened.id : opened,
    read: (): string | undefined => pointToOpen(queryClient, cacheId, opening),
    reopenAt: (id): void => setReopened({ opening: opened, id }),
  };
}

// The Session's own Feed opens cold on the tail; a Feed that waits for `loaded` resumes after its rows.
const opensCold = (
  loaded: boolean | undefined,
  id: string | undefined,
): boolean => loaded === undefined && id === undefined;

const opensAt = (
  loaded: boolean | undefined,
  id: string | undefined,
): boolean => loaded === undefined || id !== undefined;

const subscribeInput = (
  sessionId: string | undefined,
  {
    loaded,
    lastEventId,
  }: { loaded: boolean | undefined; lastEventId: string | undefined },
): FeedSubscribeInput => ({
  sessionId: sessionId ?? '',
  after: null,
  lastEventId,
  tail: opensCold(loaded, lastEventId),
});

export function useFeedLive(
  sessionId: string | undefined,
  { cacheId = '', shown, loaded }: LiveOptions,
): FeedLive {
  const trpc = useTRPC();
  const [closure, setClosure] = useState<FeedLive['closure']>(null);
  const [tailed, setTailed] = useState<string | null>(null);

  const receive = useFrames(sessionId, { cacheId, shown }, () =>
    setTailed(cacheId),
  );

  const { lastEventId, read, reopenAt } = useResumePoint(cacheId, {
    shown,
    loaded,
  });

  const changes = useSubscription(
    trpc.feed.subscribe.subscriptionOptions(
      subscribeInput(sessionId, { loaded, lastEventId }),
      {
        enabled:
          sessionId !== undefined && shown && opensAt(loaded, lastEventId),
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
    const next = read();

    if (next === lastEventId) changes.reset();
    else reopenAt(next);
  };

  useResubscribeOnReconnect({ status: changes.status, reset: reopen });

  return {
    changes,
    closure,
    awaitingTail:
      shown &&
      opensCold(loaded, lastEventId) &&
      tailed !== cacheId &&
      changes.status !== 'error',
    retryOpen: (): void => {
      setClosure(null);
      reopen();
    },
  };
}
