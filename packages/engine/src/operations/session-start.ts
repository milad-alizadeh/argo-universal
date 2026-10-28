import { SessionNewInput, type SessionNewOutput } from '@repo/contracts';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { operationParams } from './params';
import type {
  SessionStartAdmission,
  SessionStartContext,
} from './session-starts';

type SessionStart = SessionStartContext;

type NewSession = SessionStart & { sessionId: string; params: Json };

export async function runSessionStart(
  context: SessionStart,
  params: Json,
): Promise<SessionNewOutput> {
  const { deps, caller, starts } = context;
  const input = operationParams(SessionNewInput, params);
  const sessionId = deps.createId();
  const admission = starts.reserve(caller, { kind: 'new', input, sessionId });
  const start = { ...context, sessionId, params };

  try {
    return await confirmedStart(start, input, admission);
  } finally {
    admission.release();
  }
}

async function confirmedStart(
  { caller, call, invoke, sessionId, params }: NewSession,
  input: SessionNewInput,
  admission: SessionStartAdmission,
): Promise<SessionNewOutput> {
  if (input.projectId !== caller.projectId || admission.needsConfirmation)
    await call.confirm(
      'Start a Session outside the calling Session’s Project or delegation limits.',
    );

  return invoke({ id: 'session.new', params }, { sessionId });
}
