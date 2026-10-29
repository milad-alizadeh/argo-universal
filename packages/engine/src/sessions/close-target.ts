import { TRPCError } from '@trpc/server';
import type { OpenSessions } from './open-sessions';
import type { SessionContext, SessionMachineInput } from './session-context';

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
  open: OpenSessions,
  sessionId: string,
): SessionCloseTarget {
  try {
    return open.queued(sessionId);
  } catch (cause) {
    return openingTarget(open, { sessionId, cause });
  }
}

function openingTarget(
  open: OpenSessions,
  { sessionId, cause }: { sessionId: string; cause: unknown },
): SessionCloseTarget {
  requireMissingSession(cause);

  const context = open.context(sessionId);

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
