import type { SessionUpdate } from '@repo/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import type { ClientError } from '#features/connection';
import {
  emptyFeed,
  feedKey,
  type FeedState,
  mergeHistoryPages,
  toParentResults,
  useFeedLive,
  useFeedWindow,
  type FeedViewItem,
} from '#features/feed';
import { useReportsPages, type ReportQuery } from './subagent-report-query';

type ParentResult = Extract<FeedViewItem, { type: 'parent_result' }>;

type Window = ReturnType<typeof useFeedWindow>;

type Live = ReturnType<typeof useFeedLive>;

type Reports = {
  items: ParentResult[];
  hasOlder: boolean;
  loading: boolean;
  loadOlder: () => void;
  error: Error | ClientError | null;
  retry: () => void;
};

const isReport = (item: FeedViewItem): item is ParentResult =>
  item.type === 'parent_result';

function useReportFeed(parentId: string, childId: string): Window {
  const translate = useCallback(
    (rows: readonly SessionUpdate[]) => toParentResults(rows, childId),
    [childId],
  );

  const cacheId = JSON.stringify(['reports', parentId, childId]);

  return useFeedWindow(parentId, translate, { cacheId, tail: false });
}

const noItems: readonly FeedViewItem[] = [];

function reportItems(window: Window): ParentResult[] {
  return (window.view?.items ?? noItems)
    .filter(isReport)
    .filter((item) => item.content.length > 0);
}

function retryReports(pages: ReportQuery, live: Live): void {
  void pages.refetch();
  live.retryOpen();
}

const reportError = (live: Live): Reports['error'] =>
  live.closure?.error ?? live.changes.error;

function reportControls(
  pages: ReportQuery,
  window: Window,
  live: Live,
): Reports {
  return {
    items: reportItems(window),
    hasOlder: pages.hasNextPage,
    loading: pages.isFetchingNextPage,
    loadOlder: (): void => void pages.fetchNextPage(),
    error: pages.error ?? reportError(live),
    retry: (): void => retryReports(pages, live),
  };
}

export function useSubagentReports(parentId: string, childId: string): Reports {
  const window = useReportFeed(parentId, childId);

  const pages = useReportsPages(
    parentId,
    childId,
    window.feed.epoch ?? undefined,
  );

  useReportPages(window.cacheId, pages);

  const live = useFeedLive(parentId, {
    cacheId: window.cacheId,
    shown: true,
    loaded: window.feed.epoch !== null,
  });

  return reportControls(pages, window, live);
}

// The report pages merge into the Feed window as they load.
function useReportPages(cacheId: string, pages: ReportQuery): void {
  const queryClient = useQueryClient();
  const { data } = pages;

  useEffect(() => {
    if (data)
      queryClient.setQueryData<FeedState>(
        feedKey(cacheId),
        (held = emptyFeed) => mergeHistoryPages(held, data.pages),
      );
  }, [queryClient, cacheId, data]);
}
