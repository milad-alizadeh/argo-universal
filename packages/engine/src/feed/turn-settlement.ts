import type {
  FeedChange,
  FeedUpdate,
  Notice,
  SessionUpdate,
  TurnEnd,
} from '@repo/contracts';
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

/*
 * A Turn ending settles its Feed in one rule (ADR-0024), `settleFeedTurn`, whichever adapter runs it:
 * - live (`feed-turn-settlement.ts`): the Feed machine's context; its rows leave through a queued `FeedRowsJob`.
 * - stored (`stored-turn-settlement.ts`): a database transaction, for Engine restart and archive; its rows are written in that transaction and never queued as a job.
 * Only a `FeedRowsJob` reaches `committedTurnEndings`, so a restart or archive ending raises no notification.
 */

// A durable Feed marker: #148 owns its drawing, separately from crash Notices.
const turnEndChange = (turnId: string, end: TurnEnd): FeedChange => ({
  type: 'upsert',
  update: {
    id: `${turnId}:end`,
    sessionUpdate: 'notice',
    state: 'settled',
    severity: 'info',
    title: 'Turn ended',
    _meta: { argo: { turnEnd: end } },
  },
});

export type CommittedTurnEnding = { sessionId: string; turnId: string };

const argoMeta = (notice: Notice): NonNullable<Notice['_meta']>['argo'] =>
  notice._meta?.argo;

const endsTurn = (row: SessionUpdate): boolean =>
  row.sessionUpdate === 'notice' && argoMeta(row)?.turnEnd !== undefined;

const endedTurnIds = (row: SessionUpdate): string[] =>
  endsTurn(row) && row.turnId ? [row.turnId] : [];

// The Turns whose `turnEndChange` marker is among `rows`.
export const turnEndingsOf = (
  sessionId: string,
  rows: readonly SessionUpdate[],
): CommittedTurnEnding[] =>
  rows.flatMap(endedTurnIds).map((turnId) => ({ sessionId, turnId }));

export const restartTurnError = {
  code: 'interrupted',
  message: 'The Server stopped during the Turn',
} as const;

// A Tool call that reports its own ending, so settling it early would read as cancelled while it runs.
export const unfinishedTool = (row: SessionUpdate | FeedUpdate): boolean =>
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
  | Extract<TurnEndingNotice, { kind: 'agent_crash' }>
) & {
  turnEnd?: TurnEnd;
  waitingPermissions?: { acpSessionId: string; toolCallIds: readonly string[] };
};

const endingNotices = (ending: FeedTurnEnding): TurnEndingNotice[] => {
  if (ending.kind === 'agent_crash') return [ending, { kind: 'interruption' }];

  return [];
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

const endChanges = (
  turnId: string | null,
  end: TurnEnd | undefined,
): FeedChange[] => {
  if (!turnId) return [];

  return end ? [turnEndChange(turnId, end)] : [];
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
  ...endChanges(turnId, ending.turnEnd),
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
