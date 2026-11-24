import type {
  FeedSubscribeOutput,
  FeedSyncPoint,
  SessionUpdate,
} from '@repo/contracts';
import {
  focusManager,
  type QueryClient,
  useQueryClient,
} from '@tanstack/react-query';
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

export type LiveChanges = TRPCSubscriptionResult<
  FeedSubscribeOutput,
  ClientError
>;

type Changes = Exclude<FeedSubscribeOutput, { type: 'closed' }>;

interface LiveOptions {
  cacheId: string | undefined;
  shown: boolean;
  // The Feed has rows to resume after.
  loaded: boolean;
}

export interface FeedLive {
  changes: LiveChanges;
  // The Server closed the Feed, with or without an error to show.
  closure: { error: Error | null } | null;
  // Opens live changes again after the newest revision the cache holds.
  retryOpen: () => void;
}

interface Opening {
  shown: boolean;
  loaded: boolean;
  // How many times the subscription was asked to open again.
  opened: number;
}

// The point a subscription opening now resumes after: the newest revision the cache holds.
function pointToOpen(
  queryClient: QueryClient,
  cacheId: string,
  { shown, loaded }: Opening,
): FeedSyncPoint | null {
  if (!shown || !loaded) return null;

  return syncPointOf(
    queryClient.getQueryData<FeedState>(feedKey(cacheId)) ?? emptyFeed,
  );
}

// Live changes gather for a frame, then are written once; what arrives after the Session is hidden is dropped.
function useFrames(
  sessionId: string | undefined,
  { cacheId, shown }: { cacheId: string; shown: boolean },
): (event: Changes) => void {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const batch = useRef<Changes[]>([]);
  const frame = useRef<(() => void) | undefined>(null);

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

// The subscription reopens when the socket is lost (tRPC would send it again with the input it opened with), when the App returns to the foreground, and when the Connection reopens after an error.
function useResumeTriggers(changes: LiveChanges, resume: () => void): void {
  useResubscribeOnReconnect(changes, resume);

  useEffect(
    () =>
      focusManager.subscribe((focused) => {
        if (focused) resume();
      }),
    // `resume` only counts, so the first one is as good as the last.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
}

interface Reopening {
  // How many times the subscription was asked to open again.
  opened: number;
  resume: () => void;
  closure: FeedLive['closure'];
  setClosure: (closure: FeedLive['closure']) => void;
  retryOpen: () => void;
}

function useReopening(): Reopening {
  const [opened, setOpened] = useState(0);
  const [closure, setClosure] = useState<FeedLive['closure']>(null);
  const resume = (): void => setOpened((count) => count + 1);

  return {
    opened,
    resume,
    closure,
    setClosure,
    retryOpen: (): void => {
      setClosure(null);
      resume();
    },
  };
}

// A connection that was pending and is connecting again was lost; one that was never pending is only opening.
function useDropped(resume: () => void): (change: { state: string }) => void {
  const pending = useRef(false);

  return ({ state }): void => {
    if (state === 'connecting' && pending.current) resume();
    pending.current = state === 'pending';
  };
}

export function useFeedLive(
  sessionId: string | undefined,
  { cacheId = '', shown, loaded }: LiveOptions,
): FeedLive {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { opened, resume, closure, setClosure, retryOpen } = useReopening();
  const receive = useFrames(sessionId, { cacheId, shown });
  const dropped = useDropped(resume);

  // Read when it opens, so a row written since does not open it again.
  const after = useMemo(
    () => pointToOpen(queryClient, cacheId, { shown, loaded, opened }),
    [queryClient, cacheId, shown, loaded, opened],
  );

  const options = trpc.feed.subscribe.subscriptionOptions({
    sessionId: sessionId ?? '',
    after,
  });

  const changes = useSubscription({
    ...options,
    // The open count is in the key, so each reopen starts a subscription afresh, after the point read then.
    queryKey: [[...options.queryKey[0], `open-${opened}`], options.queryKey[1]],
    enabled: sessionId !== undefined && after !== null,
    onData: (event) =>
      event.type === 'closed'
        ? setClosure({ error: closedFeedError(event) })
        : receive(event),
    onConnectionStateChange: dropped,
  });

  useResumeTriggers(changes, resume);

  return { changes, closure, retryOpen };
}
