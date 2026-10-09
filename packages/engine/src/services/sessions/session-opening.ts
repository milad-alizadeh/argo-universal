import { TRPCError } from '@trpc/server';
import { waitFor } from 'xstate';
import type { Context } from '../../engine/context';
import type { RegistryActorRef, RegistryCommand } from './registry-machine';
import type { SessionActorRef } from './session-machine';
import { isSessionReady } from './session-snapshot';
import { findSessionActor } from './session-system';

export function sendRegistryCommand(
  sessions: RegistryActorRef,
  command: RegistryCommand,
): void {
  const snapshot = sessions.getSnapshot();
  if (!snapshot.can(command))
    throw new TRPCError({
      code: 'CONFLICT',
      message: `Session registry cannot accept ${command.type} in ${JSON.stringify(snapshot.value)}`,
    });
  sessions.send(command);
}

export function requireSessionActor(
  sessions: RegistryActorRef,
  sessionId: string,
): SessionActorRef {
  const actor = findSessionActor(sessions.system, sessionId);
  if (!actor)
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Session ${sessionId} did not open`,
    });
  return actor;
}

async function ready(actor: SessionActorRef): Promise<SessionActorRef> {
  const snapshot = await waitFor(
    actor,
    (snapshot): boolean =>
      snapshot.status !== 'active' || isSessionReady(snapshot),
    { timeout: Infinity },
  );
  if (snapshot.status !== 'active')
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message:
        snapshot.context.failure ??
        `Session ${snapshot.context.sessionId} closed`,
    });
  return actor;
}

export async function openSession(
  context: Pick<Context, 'sessions' | 'readSession'>,
  sessionId: string,
): Promise<SessionActorRef> {
  const row = context.readSession(sessionId);
  if (row.parentSessionId !== null)
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'A Subagent is read-only',
    });
  sendRegistryCommand(context.sessions, {
    type: 'sessions.open',
    sessionId,
    agent: row.agent,
  });
  return ready(requireSessionActor(context.sessions, sessionId));
}
