import type { FeedActorRef } from '../../feed';
import type { CallingSession } from './calling-session';

// Where a call was made: the calling Session, its Feed, and the Turn it was made in.
export type CallSite = {
  session: CallingSession;
  feed: FeedActorRef;
  turnId: string | null;
};

function ownsTurn({ session, feed }: CallSite, turnId: string): boolean {
  return (
    session.activeTurnId === turnId &&
    feed.getSnapshot().context.lastSettledTurnId !== turnId
  );
}

// A Permission request needs the Turn that made the call to be running still.
export function canConfirmCall(site: CallSite): boolean {
  if (site.turnId === null) return false;

  return site.session.inTurn && ownsTurn(site, site.turnId);
}

// A call made outside a Turn settles while its Session is open; one made in a Turn, only in that Turn.
export function canSettleCall(site: CallSite): boolean {
  if (!site.session.open) return false;

  if (site.turnId === null) return true;

  return ownsTurn(site, site.turnId);
}
