import type { SessionUpdate } from '@repo/contracts';
import { useCallback, useState } from 'react';
import { type ClientError, useTRPCClient } from '#features/connection';
import {
  toParentResults,
  useFeedLive,
  useFeedWindow,
  useOlderHistory,
  type FeedPageReader,
  type FeedViewItem,
} from '#features/feed';

type ParentResult = Extract<FeedViewItem, { type: 'parent_result' }>;

type Reports = {
  items: ParentResult[];
  hasOlder: boolean;
  loading: boolean;
  loadOlder: () => void;
  error: Error | ClientError | null;
  retry: () => void;
};

const reportsPageSize = 40;

const isReport = (item: FeedViewItem): item is ParentResult =>
  item.type === 'parent_result';

// A subagent's reports are pages of the parent's Feed that its own Feed window holds, with the parent's live changes.
export function useSubagentReports(parentId: string, childId: string): Reports {
  const client = useTRPCClient();
  const [refused, setRefused] = useState(false);

  const translate = useCallback(
    (rows: readonly SessionUpdate[]) => toParentResults(rows, childId),
    [childId],
  );

  const readPage: FeedPageReader = (cursor) =>
    client.feed.reports.query({
      sessionId: parentId,
      childSessionId: childId,
      limit: reportsPageSize,
      ...cursor,
    });

  const { cacheId, feed, view, query } = useFeedWindow(parentId, translate, {
    cacheId: JSON.stringify(['reports', parentId, childId]),
    readPage,
  });

  const live = useFeedLive(parentId, {
    cacheId,
    shown: true,
    held: feed.epoch !== null,
    coldOpen: false,
    refused,
    onRefused: () => setRefused(true),
  });

  const older = useOlderHistory(cacheId, readPage);

  return {
    items: (view?.items ?? [])
      .filter(isReport)
      .filter((item) => item.content.length > 0),
    hasOlder: feed.hasOlder,
    loading: older.isPending,
    loadOlder: () => older.mutate(),
    error: query.error ?? live.openError,
    retry: () => {
      void query.refetch();
      live.retryOpen();
    },
  };
}
