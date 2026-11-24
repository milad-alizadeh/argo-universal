import type { SessionSnapshot, SessionUpdate } from '@repo/contracts';
import type { FeedViewItem } from './feed-view';
import { isGroupRow } from './grouping-rules';
import { OpenGroup } from './open-group';
import { subagentItem } from './subagent-items';
import { isTodoCall } from './todo-call';
import { turnEndItem } from './turn-end-item';

interface Pass {
  group: OpenGroup;
  items: FeedViewItem[];
  folded: ReadonlySet<string>;
  snapshot: SessionSnapshot;
}

// A Conversation's Prompt is stored for the Agent and never drawn (ADR-0064).
const isVoicePrompt = (row: SessionUpdate): boolean =>
  row.sessionUpdate === 'prompt_message' &&
  row._meta.argo.sender.type === 'conversation';

// The Composer shows the checklist, so neither its row nor the calls that keep it draw in the Feed.
const drawsNothing = (row: SessionUpdate): boolean =>
  row.sessionUpdate === 'plan_update' || isTodoCall(row) || isVoicePrompt(row);

function appendRow(row: SessionUpdate, pass: Pass): void {
  if (drawsNothing(row)) return;
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
  const item = subagentItem(row, pass.folded, pass.snapshot);

  if (!item) return;

  pass.items.push(...pass.group.flush(), item);
}

// One Turn's rows as the Feed's items: its open group, the Subagent prompts folded into their spawn, and the snapshot. A Turn's rows never group with another's.
export function translateTurn(
  rows: readonly SessionUpdate[],
  snapshot: SessionSnapshot,
  folded: ReadonlySet<string>,
): FeedViewItem[] {
  const pass: Pass = {
    group: new OpenGroup(snapshot),
    items: [],
    folded,
    snapshot,
  };

  for (const row of rows) appendRow(row, pass);

  pass.items.push(...pass.group.flush());

  return pass.items;
}
