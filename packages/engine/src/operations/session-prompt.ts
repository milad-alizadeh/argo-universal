import { SessionPromptInput, type SessionPromptOutput } from '@repo/contracts';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import type { SessionOperationCall } from '../sessions';
import type { SessionInvoke } from './implementations';
import type { OperationsDeps } from './operations';
import { operationParams } from './params';
import type { SessionStartAdmission, SessionStarts } from './session-starts';
import type { SessionCaller } from './session-tokens';

type SessionPrompt = {
  deps: OperationsDeps;
  caller: SessionCaller;
  call: SessionOperationCall;
  starts: SessionStarts;
  invoke: SessionInvoke;
};

export async function runSessionPrompt(
  context: SessionPrompt,
  params: Json,
): Promise<SessionPromptOutput> {
  const input = operationParams(SessionPromptInput, params);

  const admission = context.starts.reserve(context.caller, {
    kind: 'prompt',
    sessionId: input.sessionId,
  });

  try {
    return await confirmedPrompt(context, { input, params }, admission);
  } finally {
    admission.release();
  }
}

async function confirmedPrompt(
  context: SessionPrompt,
  { input, params }: { input: SessionPromptInput; params: Json },
  admission: SessionStartAdmission,
): Promise<SessionPromptOutput> {
  if (requiresConfirmation(context, input.sessionId, admission))
    await context.call.confirm(
      'Send a prompt outside the calling Session’s Agents or delegation limits.',
    );

  return context.invoke({ id: 'session.prompt', params });
}

function requiresConfirmation(
  { deps, caller }: SessionPrompt,
  sessionId: string,
  admission: SessionStartAdmission,
): boolean {
  const target = deps.readSession(sessionId);

  const owned =
    target.projectId === caller.projectId &&
    target.startedBySessionId === caller.sessionId;

  return !owned || admission.needsConfirmation;
}
