import type { SessionUpdate } from '@repo/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useTRPC } from '#features/connection';
import {
  type FeedViewTranslator,
  type SessionFeedPorts,
  type SessionFeedState,
  SessionFeedStore,
} from '../stores';
import { waitForFrame } from './frame-wait';
import { useKeptFeedSlot } from './kept-feeds';
import { useResetHistory } from './use-feed-history';

const uncached = { staleTime: 0, gcTime: 0 };

interface SessionFeedHandle {
  store: SessionFeedStore;
  state: SessionFeedState;
}

// The store shows the Session while this screen does; new ports reach it without dropping its rows.
export function useSessionFeedStore(
  sessionId: string | undefined,
  translate: FeedViewTranslator,
  cacheId = sessionId,
): SessionFeedHandle {
  const ports = useSessionFeedPorts(sessionId, translate, cacheId);
  const store = useStoreFor(cacheId, ports);
  useEffect(() => store.setPorts(ports));
  useEffect(() => store.start(), [store]);

  const state = useFeedStoreState(store);

  return { store, state };
}

// One store per Session, made during the render that first shows it.
function useStoreFor(
  sessionId: string | undefined,
  ports: SessionFeedPorts,
): SessionFeedStore {
  const [shown, setShown] = useState(() => ({
    sessionId,
    store: new SessionFeedStore(ports),
  }));

  if (shown.sessionId === sessionId) return shown.store;

  const next = { sessionId, store: new SessionFeedStore(ports) };
  setShown(next);

  return next.store;
}

function useSessionFeedPorts(
  sessionId: string | undefined,
  translate: FeedViewTranslator,
  cacheId: string | undefined,
): SessionFeedPorts {
  const kept = useKeptFeedSlot(cacheId);
  const fetchRow = useFetchRow(sessionId);
  const resetHistory = useResetHistory(sessionId);

  return { kept, frame: waitForFrame, fetchRow, resetHistory, translate };
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

function useFeedStoreState(store: SessionFeedStore): SessionFeedState {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
