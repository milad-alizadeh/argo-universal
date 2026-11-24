import type {
  FeedPageInput,
  FeedPageOutput,
  SessionSnapshot,
  SessionUpdate,
} from '@repo/contracts';
import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  skipToken,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { useTRPCClient } from '#features/connection';
import {
  feedKey,
  feedPageSize,
  feedQueryDefaults,
  snapshotKey,
  snapshotQueryDefaults,
} from '../api/feed-query';
import {
  emptyFeed,
  type FeedState,
  mergeNewestPage,
  mergeOlderPage,
} from '../view/feed-state';
import type { FeedView } from '../view/feed-view';
import { shownRows } from '../view/held-plan';
import { keepUnchangedItems } from '../view/keep-unchanged-items';
import type { TranslatedFeed, TranslatedTurn } from '../view/to-feed-view';

// Translates Feed rows to the Feed view, such as the Session's own or a subagent's. The last draw's Turns come with the rows, so only the Turns that changed are translated again.
export type FeedViewTranslator = (
  rows: readonly SessionUpdate[],
  snapshot: SessionSnapshot,
  previous?: readonly TranslatedTurn[],
) => TranslatedFeed;

type FeedPageCursor = Pick<FeedPageInput, 'direction' | 'cursor' | 'epoch'>;

// Reads a page of the Feed's rows: the Session's own, or a subagent's reports.
export type FeedPageReader = (
  cursor: FeedPageCursor,
) => Promise<FeedPageOutput>;

// The Session's own pages, `feed.page`.
export function useSessionPages(sessionId: string | undefined): FeedPageReader {
  const client = useTRPCClient();

  return (cursor) =>
    client.feed.page.query({
      sessionId: sessionId ?? '',
      limit: feedPageSize,
      ...cursor,
    });
}

interface FeedWindowOptions {
  // The key of the Feed the App keeps; the Session's id unless a screen shows another Feed of it.
  cacheId: string | undefined;
  readPage: FeedPageReader;
  // The tail comes from a page read, false while a subscription brings it.
  readsPage?: boolean;
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
  { cacheId = '', readPage, readsPage = true }: FeedWindowOptions,
): FeedWindow {
  const queryClient = useQueryClient();

  const query = useQuery<FeedState>({
    ...feedQueryDefaults,
    queryKey: feedKey(cacheId),
    queryFn: async (): Promise<FeedState> => {
      const page = await readPage({ direction: 'tail' });

      return mergeNewestPage(
        queryClient.getQueryData<FeedState>(feedKey(cacheId)) ?? emptyFeed,
        page,
      );
    },
    enabled: sessionId !== undefined && readsPage,
  });

  const { data: snapshot = null } = useQuery<SessionSnapshot | null>({
    ...snapshotQueryDefaults,
    queryKey: snapshotKey(cacheId),
    queryFn: skipToken,
  });

  const feed = query.data ?? emptyFeed;
  const view = useFeedView({ feed, snapshot, translate });

  return { cacheId, feed, snapshot, view, query };
}

// Older rows merge into the same query; a failed page is not a Feed error, and scrolling asks again.
export function useOlderHistory(
  cacheId: string,
  readPage: FeedPageReader,
): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { epoch, hasOlder, startCursor } =
        queryClient.getQueryData<FeedState>(feedKey(cacheId)) ?? emptyFeed;

      if (epoch === null || !hasOlder || startCursor === null) return;

      const page = await readPage({
        direction: 'before',
        cursor: startCursor,
        epoch,
      });

      queryClient.setQueryData<FeedState>(
        feedKey(cacheId),
        (held = emptyFeed) => mergeOlderPage(held, page),
      );
    },
  });
}

// What the last draw showed, and the Turns it was translated from.
type Drawn = Pick<TranslatedFeed, 'view' | 'turns'>;

const none: Partial<Drawn> = {};

interface ViewInputs {
  feed: FeedState;
  snapshot: SessionSnapshot | null;
  translate: FeedViewTranslator;
}

/*
 * The view follows the rows, the Plan and the snapshot, not the revision, and keeps the items the last draw had.
 * `useQuery({ select })` cannot do this alone: its result is shared with `replaceData(previous, selected, options)`, and an observer's `structuralSharing` option is also the one the query writes its own data with (queryObserver.ts `setOptions`, query.ts `setData`). The window must stay unshared, so a shared view would need a function that tells the two apart.
 */
function useFeedView({
  feed: { rows, plan },
  snapshot,
  translate,
}: ViewInputs): FeedView | null {
  const drawn = useRef<Drawn | null>(null);

  const next = useMemo((): Drawn | null => {
    if (!snapshot) return null;

    // eslint-disable-next-line react/refs -- the last draw is what the Turns and items are kept from
    const { view: lastView = null, turns: lastTurns } = drawn.current ?? none;

    const { view, turns } = translate(
      shownRows({ rows, plan }),
      snapshot,
      lastTurns,
    );

    return { view: keepUnchangedItems(lastView, view), turns };
  }, [rows, plan, snapshot, translate]);

  useEffect(() => {
    drawn.current = next;
  }, [next]);

  return next?.view ?? null;
}
