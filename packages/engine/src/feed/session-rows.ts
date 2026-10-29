import type { FeedChange } from '@repo/contracts';
import {
  nativePermissionOutcomeEvent,
  nativePermissionOutcome,
  type NativePermissionOutcomeEvent,
} from './native-permission-outcome';
import {
  messageRejectedEvent,
  messageRejectedNotice,
  type MessageRejectedEvent,
} from './rejected-message';
import {
  endingFeedChanges,
  permissionSelectedEvent,
  permissionsCancelledEvent,
  selectedPermissionOutcome,
  turnEndingEvent,
  type PermissionSelectedEvent,
  type TurnEndingEvent,
} from './turn-ending';

// Events the Session sends for Feed to turn into rows (ADR-0006).
export type SessionRowEvent =
  | NativePermissionOutcomeEvent
  | TurnEndingEvent
  | PermissionSelectedEvent
  | MessageRejectedEvent;

export const sessionRowEvents: readonly SessionRowEvent['type'][] = [
  turnEndingEvent,
  nativePermissionOutcomeEvent,
  permissionsCancelledEvent,
  permissionSelectedEvent,
  messageRejectedEvent,
];

const writeSessionRows = { actions: 'writeSessionRows' } as const;

// Feed's transitions for these events; the Record makes the list complete.
export const sessionRowTransitions = {
  [turnEndingEvent]: writeSessionRows,
  [nativePermissionOutcomeEvent]: writeSessionRows,
  [permissionsCancelledEvent]: writeSessionRows,
  [permissionSelectedEvent]: writeSessionRows,
  [messageRejectedEvent]: writeSessionRows,
} satisfies Record<SessionRowEvent['type'], typeof writeSessionRows>;

type RowSource = { sessionId: string; createId: () => string };

type SessionRowChange = {
  type: 'feed.change';
  turnId: string | null;
  change: FeedChange;
};

const eventFeedChanges = (
  feed: RowSource,
  event: Exclude<SessionRowEvent, NativePermissionOutcomeEvent>,
): FeedChange[] => {
  switch (event.type) {
    case permissionSelectedEvent:
      return [selectedPermissionOutcome(event)];
    case messageRejectedEvent:
      return [messageRejectedNotice(feed.createId(), event.reason)];
    default:
      return endingFeedChanges(feed.sessionId, event);
  }
};

export const sessionRowChanges = (
  feed: RowSource,
  event: SessionRowEvent,
): SessionRowChange[] =>
  (event.type === nativePermissionOutcomeEvent
    ? [nativePermissionOutcome(event)]
    : eventFeedChanges(feed, event)
  ).map((change) => ({
    type: 'feed.change',
    turnId: event.turnId,
    change,
  }));
