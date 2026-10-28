import { SessionPromptInput, type SessionPromptOutput } from '@repo/contracts';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import {
  promptSessionAccepted,
  sessionPromptSender,
  type AcceptedSessionPrompt,
  type SessionOperationCall,
} from '../sessions';
import type { OperationsDeps } from './operations';
import { operationParams } from './params';
import type { SessionStartAdmission, SessionStarts } from './session-starts';
import type { SessionCaller } from './session-tokens';

type SessionPrompt = {
  deps: OperationsDeps;
  caller: SessionCaller;
  call: SessionOperationCall;
  starts: SessionStarts;
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
    return await confirmedPrompt(context, input, admission);
  } finally {
    admission.release();
  }
}

async function confirmedPrompt(
  context: SessionPrompt,
  input: SessionPromptInput,
  admission: SessionStartAdmission,
): Promise<SessionPromptOutput> {
  if (requiresConfirmation(context, input.sessionId, admission))
    await context.call.confirm(
      'Send a prompt outside the calling Session’s Agents or delegation limits.',
    );
  const accepted = await submitPrompt(context, input);

  return promptOutput(context.call, input, accepted);
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

function promptOutput(
  call: SessionOperationCall,
  input: SessionPromptInput,
  accepted: AcceptedSessionPrompt,
): SessionPromptOutput {
  if (accepted.messageId === null) return accepted;
  call.started({
    kind: 'turn',
    sessionId: input.sessionId,
    turnId: accepted.turnId,
  });

  return { messageId: accepted.messageId };
}

function submitPrompt(
  { deps, caller }: SessionPrompt,
  input: SessionPromptInput,
): Promise<AcceptedSessionPrompt> {
  return promptSessionAccepted(
    deps,
    input,
    sessionPromptSender(deps.readSession, caller.sessionId),
  );
}
