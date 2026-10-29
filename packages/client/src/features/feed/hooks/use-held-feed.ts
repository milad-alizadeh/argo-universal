import type { SessionUpdate } from '@repo/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useTRPC } from '#features/connection';
import {
  type FeedConvert,
  type HeldFeedPorts,
  type HeldFeedState,
  HeldFeedStore,
} from '../stores';
import { waitForFrame } from './frame-wait';
import { useHeldSlot } from './held-feed';
import { useResetHistory } from './use-feed-history';

const uncached = { staleTime: 0, gcTime: 0 };

interface HeldFeedHandle {
  store: HeldFeedStore;
  state: HeldFeedState;
}

// The Session's held Feed, which shows the Session while this screen does.
export function useHeldFeed(
  sessionId: string | undefined,
  convert: FeedConvert,
): HeldFeedHandle {
  const ports = useHeldFeedPorts(sessionId, convert);
  const store = useMemo(() => new HeldFeedStore(ports), [ports]);
  useEffect(() => store.start(), [store]);

  const state = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState,
  );

  return { store, state };
}

function useHeldFeedPorts(
  sessionId: string | undefined,
  convert: FeedConvert,
): HeldFeedPorts {
  const held = useHeldSlot(sessionId);
  const fetchRow = useFetchRow(sessionId);
  const resetHistory = useResetHistory(sessionId);

  return useMemo(
    () => ({ held, frame: waitForFrame, fetchRow, resetHistory, convert }),
    [held, fetchRow, resetHistory, convert],
  );
}

function useFetchRow(
  sessionId: string | undefined,
): (id: string) => Promise<SessionUpdate> {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useCallback(
    (id: string) =>
      queryClient.fetchQuery({
        ...trpc.feed.row.queryOptions({ sessionId: sessionId ?? '', id }),
        ...uncached,
      }),
    [queryClient, trpc, sessionId],
  );
}
