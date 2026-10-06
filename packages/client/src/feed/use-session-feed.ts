import type { FeedSyncPoint, SessionSnapshot } from '@repo/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTRPC } from '../trpc/context';
import {
  applyFeedEvent,
  emptyFeed,
  type FeedState,
  receiveOlder,
  receiveTail,
} from './feed-state';

// Rows per page (ADR-0007 pages by position): long enough that paging rarely shows while reading back.
const pageSize = 150;

// A Session's Feed rows and snapshot: the newest page, older pages on request, and live changes after them (ADR 0007).
export function useSessionFeed(sessionId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const tail = useQuery(
    trpc.feed.page.queryOptions(
      { sessionId, direction: 'tail', limit: pageSize },
      { staleTime: Number.POSITIVE_INFINITY, gcTime: 0 },
    ),
  );
  const [feed, setFeed] = useState<FeedState>(emptyFeed);
  const feedRef = useRef(feed);
  const update = useCallback((next: FeedState) => {
    feedRef.current = next;
    setFeed(next);
  }, []);
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  // Fixed at the first tail, so a later page never restarts the subscription.
  const [syncPoint, setSyncPoint] = useState<FeedSyncPoint | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const olderInFlight = useRef(false);
  const rowsInFlight = useRef(new Set<string>());

  useEffect(() => {
    if (!tail.data) return;
    update(receiveTail(feedRef.current, tail.data));
    setSyncPoint(
      (point) =>
        point ?? { epoch: tail.data.epoch, revision: tail.data.maxRevision },
    );
  }, [tail.data, update]);

  const fetchRow = useCallback(
    async (id: string) => {
      if (rowsInFlight.current.has(id)) return;
      rowsInFlight.current.add(id);
      try {
        const row = await queryClient.fetchQuery({
          ...trpc.feed.row.queryOptions({ sessionId, id }),
          staleTime: 0,
          gcTime: 0,
        });
        update(
          applyFeedEvent(feedRef.current, {
            type: 'row.upsert',
            rev: row.revision,
            row,
          }).feed,
        );
      } catch {
        // The row keeps its last revision until a later change fetches it again.
      } finally {
        rowsInFlight.current.delete(id);
      }
    },
    [queryClient, trpc, sessionId, update],
  );

  const { refetch } = tail;
  useSubscription(
    trpc.feed.subscribe.subscriptionOptions(
      { sessionId, after: syncPoint },
      {
        enabled: syncPoint !== null,
        onData: (event) => {
          if (event.type === 'snapshot') {
            setSnapshot(event.snapshot);
            return;
          }
          const result = applyFeedEvent(feedRef.current, event);
          update(result.feed);
          if (result.fetchRow) void fetchRow(result.fetchRow);
          if (result.reset) void refetch();
        },
      },
    ),
  );

  // Pages the rows before the oldest held one, one request at a time.
  const loadOlder = useCallback(async () => {
    const { hasOlder, startCursor, epoch } = feedRef.current;
    if (olderInFlight.current || !hasOlder) return;
    if (startCursor === null || epoch === null) return;
    olderInFlight.current = true;
    setLoadingOlder(true);
    try {
      const page = await queryClient.fetchQuery({
        ...trpc.feed.page.queryOptions({
          sessionId,
          direction: 'before',
          cursor: startCursor,
          limit: pageSize,
          epoch,
        }),
        staleTime: 0,
        gcTime: 0,
      });
      update(receiveOlder(feedRef.current, page));
    } catch {
      // The rows stay as they were; the reader asks again by scrolling back to the top.
    } finally {
      olderInFlight.current = false;
      setLoadingOlder(false);
    }
  }, [queryClient, trpc, sessionId, update]);

  return {
    feed,
    snapshot,
    // The first page and the snapshot have both arrived.
    ready: feed.epoch !== null && snapshot !== null,
    error: tail.error,
    retry: refetch,
    loadingOlder,
    loadOlder,
  };
}
