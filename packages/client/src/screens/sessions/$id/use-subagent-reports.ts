import type { SessionUpdate } from '@repo/contracts';
import { useCallback } from 'react';
import type { ClientError } from '#features/connection';
import {
  toParentResults,
  useSessionFeedStore,
  useFeedHistoryPages,
  useFeedLiveChanges,
  type FeedViewItem,
} from '#features/feed';
import { useReportsPages, type ReportQuery } from './subagent-report-query';

type ParentResult = Extract<FeedViewItem, { type: 'parent_result' }>;

type LiveReports = ReturnType<typeof useSessionFeedStore>;

type Changes = ReturnType<typeof useFeedLiveChanges>;

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

function useReportFeed(parentId: string, childId: string): LiveReports {
  const translate = useCallback(
    (rows: readonly SessionUpdate[]) => toParentResults(rows, childId),
    [childId],
  );

  const cacheId = JSON.stringify(['reports', parentId, childId]);

  return useSessionFeedStore(parentId, translate, cacheId);
}

const noItems: readonly FeedViewItem[] = [];

function reportItems(live: LiveReports): ParentResult[] {
  return (live.state.view?.items ?? noItems)
    .filter(isReport)
    .filter((item) => item.content.length > 0);
}

function useReportChanges(
  parentId: string,
  live: LiveReports,
  pages: ReportQuery,
): Changes {
  useFeedHistoryPages(live.store, pages.data);

  return useFeedLiveChanges(parentId, live.store, live.state.syncPoint);
}

function retryReports(
  pages: ReportQuery,
  live: LiveReports,
  changes: Changes,
): void {
  void pages.refetch();

  if (live.store.retryOpen()) changes.reset();
}

const reportError = (live: LiveReports, changes: Changes): Reports['error'] =>
  live.state.closure?.error ?? changes.error;

function reportControls(
  pages: ReportQuery,
  live: LiveReports,
  changes: Changes,
): Reports {
  return {
    items: reportItems(live),
    hasOlder: pages.hasNextPage,
    loading: pages.isFetchingNextPage,
    loadOlder: (): void => void pages.fetchNextPage(),
    error: pages.error ?? reportError(live, changes),
    retry: (): void => retryReports(pages, live, changes),
  };
}

export function useSubagentReports(parentId: string, childId: string): Reports {
  const live = useReportFeed(parentId, childId);

  const pages = useReportsPages(
    parentId,
    childId,
    live.state.feed.epoch ?? undefined,
  );

  const changes = useReportChanges(parentId, live, pages);

  return reportControls(pages, live, changes);
}
