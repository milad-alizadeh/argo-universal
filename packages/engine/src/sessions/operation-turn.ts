import type { FeedActorRef } from '../feed';
import type { SessionActorRef } from './session-machine';

export function ownsOperationTurn(
  session: SessionActorRef,
  feed: FeedActorRef,
  turnId: string,
): boolean {
  return (
    session.getSnapshot().context.activeTurnId === turnId &&
    feed.getSnapshot().context.lastSettledTurnId !== turnId
  );
}

export function canConfirmOperation(
  session: SessionActorRef,
  feed: FeedActorRef,
  turnId: string | null,
): boolean {
  if (turnId === null) return false;

  return (
    session.getSnapshot().matches({ open: { acp: 'activeTurn' } }) &&
    ownsOperationTurn(session, feed, turnId)
  );
}
