import type { SessionSnapshot, SessionUpdate } from '@repo/contracts';
import {
  skipToken,
  type UseQueryResult,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useTRPCClient } from '#features/connection';
import {
  feedKey,
  feedPageSize,
  feedQueryDefaults,
  snapshotKey,
  snapshotQueryDefaults,
  viewKey,
} from '../api/feed-query';
import { emptyFeed, type FeedState, mergeNewestPage } from '../view/feed-state';
import type { FeedView } from '../view/feed-view';
import { shownRows } from '../view/held-plan';
import { keepUnchangedItems } from '../view/keep-unchanged-items';

// Translates Feed rows to the Feed view, such as the Session's own or a subagent's.
export type FeedViewTranslator = (
  rows: readonly SessionUpdate[],
  snapshot: SessionSnapshot,
) => FeedView;

interface FeedWindowOptions {
  // The key of the Feed the App keeps; the Session's id unless a screen shows another Feed of it.
  cacheId: string | undefined;
  // The Session's own tail pages itself; a window fed by other pages, such as a subagent's reports, does not.
  tail: boolean;
}

export interface FeedWindow {
  cacheId: string;
  feed: FeedState;
  snapshot: SessionSnapshot | null;
  view: FeedView | null;
  // The query that holds the window.
  query: UseQueryResult<FeedState>;
}

// The Session's Feed from the query cache, drawn as a view: a Session seen before draws at once, with no page read.
export function useFeedWindow(
  sessionId: string | undefined,
  translate: FeedViewTranslator,
  { cacheId = '', tail }: FeedWindowOptions,
): FeedWindow {
  const queryClient = useQueryClient();
  const client = useTRPCClient();

  const query = useQuery<FeedState>({
    ...feedQueryDefaults,
    queryKey: feedKey(cacheId),
    queryFn: tail
      ? async (): Promise<FeedState> => {
          const page = await client.feed.page.query({
            sessionId: sessionId ?? '',
            direction: 'tail',
            limit: feedPageSize,
          });

          return mergeNewestPage(
            queryClient.getQueryData<FeedState>(feedKey(cacheId)) ?? emptyFeed,
            page,
          );
        }
      : skipToken,
    enabled: sessionId !== undefined,
  });

  const { data: snapshot = null } = useQuery<SessionSnapshot | null>({
    ...snapshotQueryDefaults,
    queryKey: snapshotKey(cacheId),
    queryFn: skipToken,
  });

  const feed = query.data ?? emptyFeed;
  const view = useFeedView({ cacheId, feed, snapshot, translate });

  return { cacheId, feed, snapshot, view, query };
}

interface ViewInputs {
  cacheId: string;
  feed: FeedState;
  snapshot: SessionSnapshot | null;
  translate: FeedViewTranslator;
}

// The view follows the rows, the Plan and the snapshot, not the revision, and keeps the items the last draw had.
function useFeedView({
  cacheId,
  feed: { rows, plan },
  snapshot,
  translate,
}: ViewInputs): FeedView | null {
  const queryClient = useQueryClient();

  const view = useMemo(
    () =>
      snapshot
        ? keepUnchangedItems(
            queryClient.getQueryData<FeedView>(viewKey(cacheId)) ?? null,
            translate(shownRows({ rows, plan }), snapshot),
          )
        : null,
    [queryClient, cacheId, rows, plan, snapshot, translate],
  );

  useEffect(() => {
    if (view) queryClient.setQueryData(viewKey(cacheId), view);
  }, [queryClient, cacheId, view]);

  return view;
}
