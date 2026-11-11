import type {
  ContentBlock,
  SessionUpdate,
  SubagentUpdate,
} from '@repo/contracts';
import type { FeedView, FeedViewItem, ParentResult } from './feed-view';

function resultItem(row: SessionUpdate, childId: string): FeedViewItem[] {
  if (row.sessionUpdate !== 'subagent_update') return [];

  if (row.subagentSessionId !== childId) return [];

  return contentItem(row);
}

const resultContent = (row: SubagentUpdate): ContentBlock[] | undefined =>
  row._meta?.argo?.result;

const childPositionOf = (row: SubagentUpdate): number | undefined =>
  row._meta?.argo?.childPosition;

function placed(item: ParentResult, row: SubagentUpdate): ParentResult {
  const childPosition = childPositionOf(row);

  if (childPosition !== undefined) item.childPosition = childPosition;

  return item;
}

function contentItem(row: SubagentUpdate): FeedViewItem[] {
  const item: ParentResult = {
    type: 'parent_result',
    id: row.id,
    position: row.position,
    revision: row.revision,
    content: resultContent(row) ?? [],
  };

  return [placed(item, row)];
}

export function toParentResults(
  rows: readonly SessionUpdate[],
  childId: string,
): FeedView {
  return { items: rows.flatMap((row) => resultItem(row, childId)), plan: null };
}
