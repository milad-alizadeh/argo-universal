import { TRPCError } from '@trpc/server';
import type { FeedActorRef } from '../../feed';
import type { HandlerSources } from '../session-sources';
import { OperationCall, type SessionOperationCall } from './call';
import { CallingSession } from './calling-session';
import type { CalledOperation } from './rows';

type CallerSources = HandlerSources<'findFeed', 'live'>;

export type { SessionOperationCall } from './call';

export type { OperationCard } from './permission';

export { readOperationCall, type OperationCallRead } from './read';

export type { CalledOperation } from './rows';

// Begins the Tool call of an Operation a Session calls, in the calling Session's Feed.
export function beginOperationCall(
  sources: CallerSources,
  sessionId: string,
  operation: CalledOperation,
): SessionOperationCall {
  const session = new CallingSession(sources.open.live(sessionId));

  if (!session.stored)
    throw callerConflict('The calling Session is still opening');

  return new OperationCall(
    { session, feed: requireOpenFeed(sources, session, sessionId) },
    operation,
  );
}

function requireOpenFeed(
  sources: CallerSources,
  session: CallingSession,
  sessionId: string,
): FeedActorRef {
  const feed = sources.findFeed(sessionId);

  if (!feed || !session.open)
    throw callerConflict('The calling Session is closed');

  return feed;
}

const callerConflict = (message: string): TRPCError =>
  new TRPCError({ code: 'CONFLICT', message });
