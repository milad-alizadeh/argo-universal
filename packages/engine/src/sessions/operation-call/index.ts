import { TRPCError } from '@trpc/server';
import type { FeedActorRef } from '../../feed';
import type { SessionWorkSources } from '../router-deps';
import { findSessionFeed, requireLiveSessionActor } from '../session-system';
import { OperationCall, type SessionOperationCall } from './call';
import { CallingSession } from './calling-session';
import { readOperationCall, type OperationCallRead } from './read';
import type { CalledOperation } from './rows';

export type { SessionOperationCall } from './call';

export type { OperationCard } from './permission';

export type { OperationCallRead } from './read';

export type { CalledOperation } from './rows';

// The Tool calls of Operations that Sessions call: begin one in the calling Session, or read one back.
export type OperationCalls = {
  begin: (
    sessionId: string,
    operation: CalledOperation,
  ) => SessionOperationCall;
  read: (sessionId: string, toolCallId: string) => OperationCallRead;
};

export function createOperationCalls(deps: SessionWorkSources): OperationCalls {
  return {
    begin: (sessionId, operation) => beginCall(deps, sessionId, operation),
    read: (sessionId, toolCallId) =>
      readOperationCall(deps, sessionId, toolCallId),
  };
}

function beginCall(
  { sessions }: SessionWorkSources,
  sessionId: string,
  operation: CalledOperation,
): SessionOperationCall {
  const session = new CallingSession(
    requireLiveSessionActor(sessions.system, sessionId),
  );

  if (!session.stored)
    throw callerConflict('The calling Session is still opening');

  return new OperationCall(
    { session, feed: requireOpenFeed(sessions, session, sessionId) },
    operation,
  );
}

function requireOpenFeed(
  sessions: SessionWorkSources['sessions'],
  session: CallingSession,
  sessionId: string,
): FeedActorRef {
  const feed = findSessionFeed(sessions.system, sessionId);

  if (!feed || !session.open)
    throw callerConflict('The calling Session is closed');

  return feed;
}

const callerConflict = (message: string): TRPCError =>
  new TRPCError({ code: 'CONFLICT', message });
