import type { SessionPromptInput, PromptSender } from '@repo/contracts';
import { requireInstalledAgent } from '../agents';
import { promptMessageId } from '../feed';
import type { NativeStart, SessionOrigin } from './prompt-sender';
import type { SessionRouterDeps } from './router-deps';
import {
  submitSessionPrompt,
  validateSessionCommandAdmission,
} from './session-command';
import { openReadySession } from './session-opening';

type PromptDeps = Pick<
  SessionRouterDeps,
  | 'sessions'
  | 'readSession'
  | 'createId'
  | 'sessionCommandSignal'
  | 'installedAgents'
  | 'hooks'
>;

type PromptTurn = { turnId: string; sender: PromptSender };

export type AcceptedSessionPrompt =
  | { messageId: string; turnId: string }
  | { messageId: null; drop: string };

// The Turn id is allocated before admission, so a caller that stops waiting can still follow the Turn.
export function startSessionPrompt(
  deps: PromptDeps,
  input: SessionPromptInput,
  { sender }: Pick<SessionOrigin, 'sender'>,
): NativeStart<AcceptedSessionPrompt> {
  const turnId = deps.createId();

  return {
    sessionId: input.sessionId,
    turnId,
    accepted: admitPrompt(deps, input, { turnId, sender }),
  };
}

async function admitPrompt(
  deps: PromptDeps,
  { sessionId, prompt }: SessionPromptInput,
  { turnId, sender }: PromptTurn,
): Promise<AcceptedSessionPrompt> {
  requireInstalledAgent(
    deps.installedAgents,
    deps.readSession(sessionId).agent,
  );
  const sessionActor = await openReadySession(deps, sessionId);
  validateSessionCommandAdmission(deps);

  const answer = await deps.hooks['prompt.submit']({
    sessionId,
    projectId: deps.readSession(sessionId).projectId,
    prompt,
  });

  if ('drop' in answer) return { messageId: null, drop: answer.drop };
  validateSessionCommandAdmission(deps);
  await submitSessionPrompt(sessionActor, {
    turnId,
    content: answer.prompt,
    sender,
  });

  return { messageId: promptMessageId(turnId, sender), turnId };
}
