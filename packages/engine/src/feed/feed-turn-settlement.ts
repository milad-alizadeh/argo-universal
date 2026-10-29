import { acpToolCallRowId } from './acp/tools';
import type { FeedApplication } from './feed-application';
import { rejectedFeedApplication } from './feed-application';
import type { Feed, FeedStreamEvent } from './feed-change';
import type { FeedContext, FeedEvent, FeedInternalEvent } from './feed-machine';
import {
  settleFeedTurn,
  type FeedTurnEnding,
  type SettledFeed,
} from './turn-settlement';

type CompleteTurn = Extract<FeedEvent, { type: 'feed.completeTurn' }>;

// The live adapter of Turn settlement (see `turn-settlement.ts`): the Feed machine's context; its changed rows leave through a queued `FeedRowsJob`.
export type SettlementContext = Pick<
  FeedContext,
  | 'sessionId'
  | 'rows'
  | 'maxRevision'
  | 'nextPosition'
  | 'findWrittenRow'
  | 'streamEvents'
  | 'changedRowIds'
  | 'messageStreams'
  | 'toolContents'
>;

const settledRowId = (change: FeedStreamEvent): string =>
  change.type === 'row.upsert' ? change.row.id : change.id;

const settledFeedState = (
  context: SettlementContext,
  result: SettledFeed,
  turnId: string,
): Partial<FeedContext> => ({
  lastSettledTurnId: turnId,
  rows: result.feed.rows,
  maxRevision: result.feed.maxRevision,
  nextPosition: result.feed.nextPosition,
  streamEvents: [...context.streamEvents, ...result.events],
  changedRowIds: [
    ...new Set([...context.changedRowIds, ...result.events.map(settledRowId)]),
  ],
  ...remainingStreams(context, result.feed, turnId),
});

const remainingStreams = (
  context: SettlementContext,
  feed: Feed,
  turnId: string,
): Pick<FeedContext, 'messageStreams' | 'toolContents'> => ({
  messageStreams: remainingMessageStreams(context, turnId),
  toolContents: remainingToolContents(context, feed, turnId),
});

const remainingToolContents = (
  context: SettlementContext,
  feed: Feed,
  turnId: string,
): FeedContext['toolContents'] =>
  Object.fromEntries(
    Object.entries(context.toolContents ?? {}).filter(
      ([id]) => feed.rows[id]?.turnId !== turnId,
    ),
  );

const remainingMessageStreams = (
  context: SettlementContext,
  turnId: string,
): FeedContext['messageStreams'] =>
  Object.fromEntries(
    Object.entries(context.messageStreams).filter(
      ([, stream]) => stream.turnId !== turnId,
    ),
  );

const settlementEvents = (
  result: SettledFeed,
  event: CompleteTurn,
): FeedInternalEvent[] => {
  const events: FeedInternalEvent[] = [];

  if (result.events.length > 0)
    events.push({
      type: 'feed.changeApplied',
      settled: true,
      commitWith: event.commitWith,
    });
  events.push({ type: 'feed.publish', published: event.published });

  return events;
};

const restorePermissionRow = (
  context: SettlementContext,
  rows: Feed['rows'],
  id: string,
): Feed['rows'] => {
  const row = rows[id] ?? context.findWrittenRow(id);

  return row ? { ...rows, [id]: row } : rows;
};

const restoreWaitingRows = (
  context: SettlementContext,
  waiting: NonNullable<FeedTurnEnding['waitingPermissions']>,
): Feed['rows'] =>
  waiting.toolCallIds.reduce(
    (rows, id) =>
      restorePermissionRow(
        context,
        rows,
        acpToolCallRowId(waiting.acpSessionId, id),
      ),
    context.rows,
  );

const readSettlementFeed = (
  context: SettlementContext,
  ending?: FeedTurnEnding,
): Feed => {
  const waiting = ending?.waitingPermissions;

  return waiting
    ? { ...context, rows: restoreWaitingRows(context, waiting) }
    : context;
};

const applyTurnSettlement = (
  context: SettlementContext,
  event: CompleteTurn,
): SettledFeed | { rejection: string } => {
  try {
    const feed = readSettlementFeed(context, event.ending);

    return settleFeedTurn(feed, event.turnId, event.ending);
  } catch (error) {
    return {
      rejection: `could not read a Turn's Permission rows: ${String(error)}`,
    };
  }
};

export const prepareTurnSettlement = (
  context: SettlementContext,
  event: CompleteTurn,
): FeedApplication => {
  const result = applyTurnSettlement(context, event);

  if ('rejection' in result) {
    event.published?.reject(new Error(result.rejection));

    return rejectedFeedApplication(result.rejection);
  }

  return {
    state: settledFeedState(context, result, event.turnId),
    events: settlementEvents(result, event),
  };
};
