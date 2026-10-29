import { TRPCError } from '@trpc/server';
import type { SessionRowSources } from './router-deps';
import type { SessionContext, SessionMachineInput } from './session-context';
import { createQueuedSessionReader } from './session-record';
import { readOpenSession } from './session-system';

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
  deps: SessionRowSources,
  sessionId: string,
): SessionCloseTarget {
  try {
    return createQueuedSessionReader(deps)(sessionId);
  } catch (cause) {
    return openingTarget(deps, { sessionId, cause });
  }
}

function openingTarget(
  deps: SessionRowSources,
  { sessionId, cause }: { sessionId: string; cause: unknown },
): SessionCloseTarget {
  requireMissingSession(cause);

  const context = readOpenSession(deps.sessions, sessionId);

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
