import { TRPCError } from '@trpc/server';
import type { OpenSessions } from './open-sessions';
import type { SessionContext, SessionMachineInput } from './session-context';

type TargetSessions = Pick<OpenSessions, 'queued' | 'context'>;

type SessionCloseTarget = {
  projectId: string;
  parentSessionId: string | null;
  startedBySessionId: string | null;
};

type NewSessionContext = SessionContext & {
  input: Extract<SessionMachineInput, { kind: 'new' }>;
};

// A native opening can be closed before the Agent makes its first stored Session row.
export function readSessionCloseTarget(
  sessions: TargetSessions,
  sessionId: string,
): SessionCloseTarget {
  try {
    return sessions.queued(sessionId);
  } catch (cause) {
    return openingTarget(sessions, { sessionId, cause });
  }
}

function openingTarget(
  sessions: TargetSessions,
  { sessionId, cause }: { sessionId: string; cause: unknown },
): SessionCloseTarget {
  requireMissingSession(cause);

  const context = sessions.context(sessionId);

  requireNewSession(context, cause);

  return {
    projectId: context.input.projectId,
    parentSessionId: null,
    startedBySessionId: context.input.startedBySessionId ?? null,
  };
}

function requireNewSession(
  context: SessionContext | undefined,
  cause: unknown,
): asserts context is NewSessionContext {
  if (!context || context.input.kind !== 'new') throw cause;
}

function requireMissingSession(cause: unknown): void {
  if (!(cause instanceof TRPCError)) throw cause;

  if (cause.code !== 'NOT_FOUND') throw cause;
}
