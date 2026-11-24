import {
  type FeedSubscribeInput,
  type FeedSubscribeOutput,
  feedEventId,
  type SessionUpdate,
  syncPointOfEventId,
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
  // The Feed's query holds rows, which a Feed that cannot open on its tail waits for.
  held: boolean;
  // The Session's own Feed opens cold on the tail while its query holds nothing. A Feed that is not the Session's own (a subagent's reports) sets this to false and opens after its rows.
  coldOpen?: boolean;
  // A Server built before event ids and the tail refuses their keys as a bad request. The Feed is then read by page and the subscription opens with `after` alone, once: `onRefused` is called for that first refusal, and `refused` is the caller's answer to it.
  refused: boolean;
  onRefused: () => void;
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
  onReset: () => void,
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

    // A rebuilt Feed has no rows until its tail comes again: a new open brings it.
    if (events.some((event) => event.type === 'reset')) onReset();
  };

  return (event): void => {
    batch.current.push(event);
    frame.current ??= waitForFrame(flush);
  };
}

type Opening = Pick<LiveOptions, 'shown'> & {
  // The rows the open waits for: held when it needs them, or null when it does not.
  rows: boolean | null;
};

// Where a subscription opening now resumes: after the newest revision the cache holds.
function pointToOpen(
  queryClient: QueryClient,
  cacheId: string,
  { shown, rows }: Opening,
): string | undefined {
  if (!shown || rows === false) return;

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
    () =>
      pointToOpen(queryClient, cacheId, {
        shown: opening.shown,
        rows: opening.rows,
      }),
    [queryClient, cacheId, opening.shown, opening.rows],
  );

  return {
    lastEventId:
      reopened !== null && reopened.opening === opened ? reopened.id : opened,
    read: (): string | undefined => pointToOpen(queryClient, cacheId, opening),
    reopenAt: (id): void => setReopened({ opening: opened, id }),
  };
}

interface Opens {
  // Which input the Server takes: event ids and the tail, or `after` alone.
  refused: boolean;
  coldOpen: boolean;
  lastEventId: string | undefined;
}

const canOpen = ({ refused, coldOpen, lastEventId }: Opens): boolean =>
  (coldOpen && !refused) || lastEventId !== undefined;

// The input of a Server that takes event ids and the tail, or the one a Server built before them took.
function subscribeInput(
  sessionId: string | undefined,
  { refused, coldOpen, lastEventId }: Opens,
): FeedSubscribeInput {
  const id = sessionId ?? '';

  if (refused)
    return {
      sessionId: id,
      after: lastEventId ? syncPointOfEventId(lastEventId) : null,
    };

  return {
    sessionId: id,
    after: null,
    lastEventId,
    tail: coldOpen && lastEventId === undefined ? true : undefined,
  };
}

const isRefusal = (error: ClientError): boolean =>
  error.data?.code === 'BAD_REQUEST';

export function useFeedLive(
  sessionId: string | undefined,
  {
    cacheId = '',
    shown,
    held,
    coldOpen = true,
    refused,
    onRefused,
  }: LiveOptions,
): FeedLive {
  const trpc = useTRPC();
  const [closure, setClosure] = useState<FeedLive['closure']>(null);
  const waitsForRows = !coldOpen || refused;

  const receive = useFrames(sessionId, { cacheId, shown }, () => {
    if (!waitsForRows) restartCold();
  });

  const { lastEventId, read, reopenAt } = useResumePoint(cacheId, {
    shown,
    rows: waitsForRows ? held : null,
  });

  const opens = { refused, coldOpen, lastEventId };

  const changes = useSubscription(
    trpc.feed.subscribe.subscriptionOptions(subscribeInput(sessionId, opens), {
      enabled: sessionId !== undefined && shown && canOpen(opens),
      onData: (received) => {
        const event = eventOf(received);

        if (event.type === 'closed')
          setClosure({ error: closedFeedError(event) });
        else receive(event);
      },
      onError: (error) => {
        if (!refused && isRefusal(error)) onRefused();
      },
    }),
  );

  // A new open starts after the newest revision the cache holds: a new id opens it by itself. With no id (a cold open: nothing is held, such as after a reset) the open has nothing new to tell the subscription apart, so it is reset, which opens it again with the same input.
  function reopen(): void {
    const next = read();

    if (next === lastEventId) changes.reset();
    else reopenAt(next);
  }

  // The Server rebuilt the Feed: what is held goes, and a cold open brings the new tail.
  function restartCold(): void {
    if (lastEventId === undefined) changes.reset();
    else reopenAt(undefined);
  }

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
