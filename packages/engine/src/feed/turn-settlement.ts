import type { SessionUpdate, FeedChange } from '@repo/contracts';
import {
  applyFeedChange,
  changedRowId,
  type Feed,
  type FeedStreamEvent,
} from './feed-change';
import {
  cancelledPermissionOutcome,
  turnEndingNotice,
  type TurnEndingNotice,
} from './turn-ending';

const unfinishedTool = (row: SessionUpdate): boolean =>
  row.sessionUpdate === 'tool_call_update' &&
  (row.status === 'pending' || row.status === 'in_progress');

const settlementPatch = (row: SessionUpdate): FeedChange => ({
  type: 'patch',
  id: row.id,
  set: unfinishedTool(row)
    ? { state: 'settled', status: 'cancelled' }
    : { state: 'settled' },
});

const readUnfinishedTurnRows = (
  feed: Feed,
  turnId: string | null,
): Feed['rows'][string][] =>
  Object.values(feed.rows).filter(
    (row) =>
      row.turnId === turnId && (row.state === 'open' || unfinishedTool(row)),
  );

export type FeedTurnEnding = (
  | { kind: 'completion' | 'cancel' | 'engine_restart' }
  | Extract<TurnEndingNotice, { kind: 'agent_crash' | 'cancel_timeout' }>
) & {
  waitingPermissions?: { acpSessionId: string; toolCallIds: readonly string[] };
};

const endingNotices = (ending: FeedTurnEnding): TurnEndingNotice[] => {
  if (ending.kind === 'agent_crash') return [ending, { kind: 'interruption' }];

  return ending.kind === 'cancel_timeout' ? [ending] : [];
};

const permissionChanges = (
  feed: Feed,
  ending: FeedTurnEnding,
): FeedChange[] => {
  const waiting = ending.waitingPermissions;

  if (!waiting) return [];

  return waiting.toolCallIds
    .map((id) => cancelledPermissionOutcome(waiting.acpSessionId, id))
    .filter((change) => Object.hasOwn(feed.rows, changedRowId(change)));
};

const settlementChanges = (
  feed: Feed,
  turnId: string | null,
  ending: FeedTurnEnding = { kind: 'completion' },
): FeedChange[] => [
  ...permissionChanges(feed, ending),
  ...endingNotices(ending).map((notice) =>
    turnEndingNotice(feed.sessionId, turnId, notice),
  ),
  ...readUnfinishedTurnRows(feed, turnId).map(settlementPatch),
];

export type SettledFeed = { feed: Feed; events: FeedStreamEvent[] };

export const settleFeedTurn = (
  feed: Feed,
  turnId: string | null,
  ending?: FeedTurnEnding,
): SettledFeed | { rejection: string } => {
  const events: FeedStreamEvent[] = [];
  let currentFeed = feed;

  for (const change of settlementChanges(feed, turnId, ending)) {
    const result = applyFeedChange(currentFeed, change, turnId);

    if ('rejection' in result) return result;
    currentFeed = result.feed;
    events.push(result.streamEvent);
  }

  return { feed: currentFeed, events };
};
