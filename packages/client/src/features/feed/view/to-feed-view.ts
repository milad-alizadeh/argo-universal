import {
  selectActivePlan,
  type SessionSnapshot,
  type SessionUpdate,
} from '@repo/contracts';
import type { FeedView, FeedViewItem } from './feed-view';
import { isGroupRow, startsNewTurn } from './grouping-rules';
import { OpenGroup } from './open-group';
import {
  type SpawnPrompts,
  spawnPrompts,
  subagentItem,
} from './subagent-items';
import { turnEndItem } from './turn-end-item';

interface Pass {
  group: OpenGroup;
  items: FeedViewItem[];
  prompts: SpawnPrompts;
  snapshot: SessionSnapshot;
}

function appendRow(row: SessionUpdate, pass: Pass): void {
  if (row.sessionUpdate === 'plan_update') return;
  const end = turnEndItem(row);

  if (end) {
    pass.items.push(...pass.group.flush(), end);

    return;
  }

  appendContentRow(row, pass);
}

function appendContentRow(row: SessionUpdate, pass: Pass): void {
  if (isGroupRow(row)) return pass.group.add(row);

  if (row.sessionUpdate === 'subagent_update')
    return appendSubagentRow(row, pass);

  pass.items.push(...pass.group.flush(), { type: 'row', row });
}

// Only a Subagent action draws a row; a state change and a folded prompt draw nothing.
function appendSubagentRow(
  row: Extract<SessionUpdate, { sessionUpdate: 'subagent_update' }>,
  pass: Pass,
): void {
  const item = subagentItem(row, pass.prompts, pass.snapshot);

  if (!item) return;

  pass.items.push(...pass.group.flush(), item);
}

// One walk of the rows: the open group, the Subagent prompts folded into their spawn, and the snapshot.
const newPass = (
  rows: readonly SessionUpdate[],
  snapshot: SessionSnapshot,
): Pass => ({
  group: new OpenGroup(snapshot),
  items: [],
  prompts: spawnPrompts(rows),
  snapshot,
});

export function toFeedView(
  rows: readonly SessionUpdate[],
  snapshot: SessionSnapshot,
): FeedView {
  const pass = newPass(rows, snapshot);
  let previousTurnId: string | null | undefined;

  for (const row of rows) {
    if (startsNewTurn(row, previousTurnId))
      pass.items.push(...pass.group.flush());

    previousTurnId = row.turnId;
    appendRow(row, pass);
  }

  pass.items.push(...pass.group.flush());

  return { items: pass.items, plan: selectActivePlan(rows) };
}
