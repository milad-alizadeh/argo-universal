import { SessionNewInput, type SessionNewOutput } from '@repo/contracts';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import type { SessionOperationCall } from '../sessions';
import type { SessionInvoke } from './implementations';
import type { OperationsDeps } from './operations';
import { operationParams } from './params';
import type { SessionStartAdmission, SessionStarts } from './session-starts';
import type { SessionCaller } from './session-tokens';

type SessionStart = {
  deps: OperationsDeps;
  caller: SessionCaller;
  call: SessionOperationCall;
  starts: SessionStarts;
  invoke: SessionInvoke;
};

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
