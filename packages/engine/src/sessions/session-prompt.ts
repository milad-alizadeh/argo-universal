import type {
  SessionPromptInput,
  SessionPromptOutput,
  PromptSender,
} from '@repo/contracts';
import { requireInstalledAgent } from '../agents';
import { promptMessageId } from '../feed';
import type { SessionRouterDeps } from './router-deps';
import {
  submitSessionPrompt,
  validateSessionCommandAdmission,
} from './session-command';
import { openReadySession } from './session-opening';

export const promptSessionAccepted = async (
  deps: Pick<
    SessionRouterDeps,
    | 'sessions'
    | 'readSession'
    | 'createId'
    | 'sessionCommandSignal'
    | 'installedAgents'
    | 'hooks'
  >,
  { sessionId, prompt }: SessionPromptInput,
  sender: PromptSender = { type: 'user' },
): Promise<AcceptedSessionPrompt> => {
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
  const turnId = deps.createId();
  validateSessionCommandAdmission(deps);
  await submitSessionPrompt(sessionActor, {
    turnId,
    content: answer.prompt,
    sender,
  });

  return { messageId: promptMessageId(turnId, sender), turnId };
};

export type AcceptedSessionPrompt =
  | { messageId: string; turnId: string }
  | { messageId: null; drop: string };

export async function promptSession(
  deps: Parameters<typeof promptSessionAccepted>[0],
  input: SessionPromptInput,
): Promise<SessionPromptOutput> {
  const accepted = await promptSessionAccepted(deps, input);

  return accepted.messageId === null
    ? accepted
    : { messageId: accepted.messageId };
}
