import {
  selectActivePlan,
  type SessionSnapshot,
  type SessionUpdate,
} from '@repo/contracts';
import type { FeedView, FeedViewItem } from './feed-view';
import { isGroupRow, startsNewTurn } from './grouping-rules';
import { OpenGroup } from './open-group';

function appendRow(
  row: SessionUpdate,
  group: OpenGroup,
  items: FeedViewItem[],
): void {
  if (row.sessionUpdate === 'plan_update') return;

  if (isGroupRow(row)) return group.add(row);
  items.push(...group.flush(), { type: 'row', row });
}

export function toFeedView(
  rows: readonly SessionUpdate[],
  snapshot: SessionSnapshot,
): FeedView {
  const group = new OpenGroup(snapshot);
  const items: FeedViewItem[] = [];
  let previousTurnId: string | null | undefined;

  for (const row of rows) {
    if (startsNewTurn(row, previousTurnId)) items.push(...group.flush());
    previousTurnId = row.turnId;
    appendRow(row, group, items);
  }

  items.push(...group.flush());

  return { items, plan: selectActivePlan(rows) };
}
