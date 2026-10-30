import { SessionOpenFailure } from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { waitFor } from 'xstate';
import type { LocalSubmission } from './acp/prompts/submission';
import type { SessionActorRef, SessionCommand } from './session-machine';

export const submitSessionPrompt = (
  session: SessionActorRef,
  submission: LocalSubmission,
): Promise<void> => {
  const committed = Promise.withResolvers<void>();
  sendSessionCommand(session, {
    type: 'session.prompt',
    ...submission,
    committed,
  });

  return committed.promise;
};

export function sendSessionCommand(
  session: SessionActorRef,
  command: SessionCommand,
): void {
  const snapshot = session.getSnapshot();

  if (!snapshot.can(command)) rejectSessionCommand(session, command.type);
  session.send(command);
}

// A procedure that needs a ready Session: a Session command, or `session.open`, which only waits for one.
export type ReadySessionCommandType = SessionCommand['type'] | 'session.open';

export function rejectSessionCommand(
  session: SessionActorRef,
  commandType: ReadySessionCommandType,
): never {
  const { value, context } = session.getSnapshot();
  const refusal = `Session cannot accept ${commandType} in ${JSON.stringify(value)}`;
  throw new TRPCError({
    code: 'CONFLICT',
    message:
      context.failure === null ? refusal : `${refusal}: ${context.failure}`,
  });
}

type SessionStanding = { archivedAt: unknown; parentSessionId: unknown };

// An archived Session and a Subagent are read-only: neither takes a Session command.
export function requireWritableSession<Row extends SessionStanding>(
  row: Row,
): Row {
  if (row.archivedAt !== null) throw readOnly('An archived Session');

  if (row.parentSessionId !== null) throw readOnly('A Subagent');

  return row;
}

const readOnly = (subject: string): TRPCError =>
  new TRPCError({ code: 'CONFLICT', message: `${subject} is read-only` });

type SessionSnapshot = ReturnType<SessionActorRef['getSnapshot']>;

// Waits out the Session's start, and for a prompt its settling, then requires a Session that takes the command.
export async function waitForReadySession(
  session: SessionActorRef,
  commandType: ReadySessionCommandType,
): Promise<SessionActorRef> {
  await waitFor(session, (snapshot) => !waits(snapshot, commandType), {
    timeout: Infinity,
  });
  requireOpen(session.getSnapshot());

  if (!session.getSnapshot().hasTag('ready'))
    rejectSessionCommand(session, commandType);

  return session;
}

function requireOpen(snapshot: SessionSnapshot): void {
  if (snapshot.context.openError || snapshot.status !== 'active')
    throw closedSession(snapshot);
}

// A command waits while the Session starts; a prompt also waits while the Session settles a choice or a cancellation.
const waitingTags = (
  commandType: ReadySessionCommandType,
): readonly ('starting' | 'settling')[] =>
  commandType === 'session.prompt'
    ? (['starting', 'settling'] as const)
    : (['starting'] as const);

const waits = (
  snapshot: SessionSnapshot,
  commandType: ReadySessionCommandType,
): boolean =>
  snapshot.status === 'active' &&
  waitingTags(commandType).some((tag) => snapshot.hasTag(tag));

const closedSession = ({ context }: SessionSnapshot): TRPCError =>
  new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    cause: context.openError
      ? new SessionOpenFailure(context.openError)
      : undefined,
    message: context.failure ?? `Session ${context.sessionId} closed`,
  });
