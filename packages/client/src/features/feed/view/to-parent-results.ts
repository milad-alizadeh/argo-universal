import type {
  ContentBlock,
  SessionUpdate,
  SubagentUpdate,
} from '@repo/contracts';
import type { FeedView, FeedViewItem } from './feed-view';

function resultItem(row: SessionUpdate, childId: string): FeedViewItem[] {
  if (row.sessionUpdate !== 'subagent_update') return [];

  if (row.subagentSessionId !== childId) return [];

  return contentItem(row);
}

const resultContent = (row: SubagentUpdate): ContentBlock[] | undefined =>
  row._meta?.argo?.result;

function contentItem(row: SubagentUpdate): FeedViewItem[] {
  const content = resultContent(row);

  return [
    {
      type: 'parent_result',
      id: row.id,
      position: row.position,
      revision: row.revision,
      content: content ?? [],
    },
  ];
}

export function toParentResults(
  rows: readonly SessionUpdate[],
  childId: string,
): FeedView {
  return { items: rows.flatMap((row) => resultItem(row, childId)), plan: null };
}
