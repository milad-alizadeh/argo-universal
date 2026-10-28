import { TRPCError } from '@trpc/server';
import type { FeedActorRef } from '../../feed';
import type { SessionActorRef } from '../session-machine';
import { findSessionFeed, requireLiveSessionActor } from '../session-system';
import { OperationCall, type SessionOperationCall } from './call';
import {
  readOperationCall,
  type CallSources,
  type OperationCallRead,
} from './read';
import type { CalledOperation } from './rows';

export type { SessionOperationCall } from './call';

export type { OperationCard } from './permission';

export type { OperationCallRead } from './read';

// The Tool calls of Operations that Sessions call: begin one in the calling Session, or read one back.
export type OperationCalls = {
  begin: (
    sessionId: string,
    operation: CalledOperation,
  ) => SessionOperationCall;
  read: (sessionId: string, toolCallId: string) => OperationCallRead;
};

export function createOperationCalls(deps: CallSources): OperationCalls {
  return {
    begin: (sessionId, operation) => beginCall(deps, sessionId, operation),
    read: (sessionId, toolCallId) =>
      readOperationCall(deps, sessionId, toolCallId),
  };
}

function beginCall(
  { sessions }: CallSources,
  sessionId: string,
  operation: CalledOperation,
): SessionOperationCall {
  const session = requireLiveSessionActor(sessions.system, sessionId);

  if (!session.getSnapshot().context.stored)
    throw callerConflict('The calling Session is still opening');

  return new OperationCall(
    { session, feed: requireOpenFeed(sessions, session, sessionId) },
    operation,
  );
}

function requireOpenFeed(
  sessions: CallSources['sessions'],
  session: SessionActorRef,
  sessionId: string,
): FeedActorRef {
  const feed = findSessionFeed(sessions.system, sessionId);

  if (!feed || session.getSnapshot().status !== 'active')
    throw callerConflict('The calling Session is closed');

  return feed;
}

const callerConflict = (message: string): TRPCError =>
  new TRPCError({ code: 'CONFLICT', message });
