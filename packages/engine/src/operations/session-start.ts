import { SessionNewInput, type SessionNewOutput } from '@repo/contracts';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import {
  startSessionCreation,
  sessionPromptSender,
  type SessionOperationCall,
} from '../sessions';
import type { OperationsDeps } from './operations';
import { operationParams } from './params';
import type { SessionStartAdmission, SessionStarts } from './session-starts';
import type { SessionCaller } from './session-tokens';

type SessionStart = {
  deps: OperationsDeps;
  caller: SessionCaller;
  call: SessionOperationCall;
  starts: SessionStarts;
};

export async function runSessionStart(
  context: SessionStart,
  params: Json,
): Promise<SessionNewOutput> {
  const { deps, caller, starts } = context;
  const input = operationParams(SessionNewInput, params);
  const sessionId = deps.createId();
  const admission = starts.reserve(caller, { kind: 'new', input, sessionId });

  try {
    return await confirmedStart({ ...context, sessionId }, input, admission);
  } finally {
    admission.release();
  }
}

async function confirmedStart(
  { deps, caller, call, sessionId }: SessionStart & { sessionId: string },
  input: SessionNewInput,
  admission: SessionStartAdmission,
): Promise<SessionNewOutput> {
  if (input.projectId !== caller.projectId || admission.needsConfirmation)
    await call.confirm(
      'Start a Session outside the calling Session’s Project or delegation limits.',
    );

  const creation = await startSessionCreation(deps, input, {
    sessionId,
    startedBySessionId: caller.sessionId,
    sender: sessionPromptSender(deps.readSession, caller.sessionId),
  });

  call.started({ kind: 'creation', sessionId, turnId: creation.turnId });
  const accepted = await creation.accepted;

  if (accepted.turnId)
    call.started({ kind: 'turn', sessionId, turnId: accepted.turnId });

  return { sessionId };
}
