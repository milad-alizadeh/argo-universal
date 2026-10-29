import { TRPCError } from '@trpc/server';
import type { AnyActorRef } from 'xstate';
import { feedMachine, type FeedActorRef } from '../feed';
import { findMachineActor } from '../lib/machine-actor';
import type { OpenSessionsActorRef } from './open-sessions-machine';
import type { SessionContext } from './session-context';
import { type SessionActorRef, sessionMachine } from './session-machine';

export const sessionActorId = (sessionId: string): string =>
  `session:${sessionId}`;

export function requireLiveSessionActor(
  system: AnyActorRef['system'],
  sessionId: string,
): SessionActorRef {
  const sessionActor = findMachineActor(
    system,
    sessionActorId(sessionId),
    sessionMachine,
  );

  if (!sessionActor)
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `No Session ${sessionId}`,
    });

  return sessionActor;
}

export function findSessionFeed(
  system: AnyActorRef['system'],
  sessionId: string,
): FeedActorRef | undefined {
  const actor = findMachineActor(
    system,
    sessionActorId(sessionId),
    sessionMachine,
  );

  return (
    actor?.getSnapshot().children.feed ??
    findMachineActor(system, `subagent-feed:${sessionId}`, feedMachine)
  );
}

// An open Session's actor, or undefined when the Session is not open.
export function findOpenSession(
  sessions: OpenSessionsActorRef,
  sessionId: string,
): SessionActorRef | undefined {
  return sessions.getSnapshot().context.sessions[sessionId];
}

export function readOpenSession(
  sessions: OpenSessionsActorRef,
  sessionId: string,
): SessionContext | undefined {
  return findOpenSession(sessions, sessionId)?.getSnapshot().context;
}
