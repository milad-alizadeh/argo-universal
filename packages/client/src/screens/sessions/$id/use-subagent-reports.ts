import type { FeedPageOutput, SessionUpdate } from '@repo/contracts';
import { useCallback, useMemo } from 'react';
import type { ClientError } from '#features/connection';
import {
  toParentResults,
  useSessionFeed,
  type FeedViewItem,
} from '#features/feed';
import { useReportsPages, type ReportQuery } from './subagent-report-query';

type ParentResult = Extract<FeedViewItem, { type: 'parent_result' }>;

const isReport = (item: FeedViewItem): item is ParentResult =>
  item.type === 'parent_result';

function reportsById(
  items: readonly FeedViewItem[],
): Map<string, ParentResult> {
  const reports = new Map<string, ParentResult>();

  for (const item of items.filter(isReport)) keepNewest(reports, item);

  return reports;
}

function keepNewest(
  reports: Map<string, ParentResult>,
  item: ParentResult,
): void {
  const previous = reports.get(item.id);

  if (!previous || item.revision >= previous.revision)
    reports.set(item.id, item);
}

function mergeReports(
  pages: readonly FeedPageOutput[],
  live: readonly FeedViewItem[],
  childId: string,
): ParentResult[] {
  const fromPages = toParentResults(
    pages.flatMap((page) => page.rows),
    childId,
  ).items;

  const unique = reportsById([...fromPages, ...live]);

  return [...unique.values()]
    .filter((item) => item.content.length > 0)
    .sort((a, b) => a.position - b.position);
}

function useParentLive(
  parentId: string,
  childId: string,
): ReturnType<typeof useSessionFeed> {
  const translate = useCallback(
    (rows: readonly SessionUpdate[]) => toParentResults(rows, childId),
    [childId],
  );

  return useSessionFeed(parentId, translate);
}

type Reports = {
  items: ParentResult[];
  hasOlder: boolean;
  loading: boolean;
  loadOlder: () => void;
  error: Error | ClientError | null;
  retry: () => void;
};

const noPages: readonly FeedPageOutput[] = [];

const noItems: readonly FeedViewItem[] = [];

const reportError = (
  pages: ReportQuery,
  live: ReturnType<typeof useSessionFeed>,
): Error | ClientError | null => pages.error ?? live.error ?? live.openError;

function reportControls(
  pages: ReportQuery,
  live: ReturnType<typeof useSessionFeed>,
  items: ParentResult[],
): Reports {
  return {
    items,
    hasOlder: pages.hasNextPage,
    loading: pages.isFetchingNextPage,
    loadOlder: () => void pages.fetchNextPage(),
    error: reportError(pages, live),
    retry: () => retryReports(pages, live),
  };
}

function retryReports(
  pages: ReportQuery,
  live: ReturnType<typeof useSessionFeed>,
): void {
  void pages.refetch();
  live.retry();
  live.retryOpen();
}

const reportEpoch = (
  live: ReturnType<typeof useSessionFeed>,
): number | undefined => live.snapshot?.epoch;

const reportHistory = (pages: ReportQuery): readonly FeedPageOutput[] =>
  pages.data?.pages ?? noPages;

const liveUpdates = (
  live: ReturnType<typeof useSessionFeed>,
): readonly FeedViewItem[] => live.view?.items ?? noItems;

export function useSubagentReports(parentId: string, childId: string): Reports {
  const live = useParentLive(parentId, childId);

  const pages = useReportsPages(parentId, childId, reportEpoch(live));

  const history = reportHistory(pages);

  const updates = liveUpdates(live);

  const items = useMemo(
    () => mergeReports(history, updates, childId),
    [history, updates, childId],
  );

  return reportControls(pages, live, items);
}
