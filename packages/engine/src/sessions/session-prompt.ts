import type { SessionPromptInput, SessionPromptOutput } from '@repo/contracts';
import { requireInstalledAgent } from '../agents';
import { userMessageId } from '../feed';
import type { SessionRouterDeps } from './router-deps';
import {
  submitSessionPrompt,
  validateSessionCommandAdmission,
} from './session-command';
import { openReadySession } from './session-opening';

export const promptSession = async (
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
): Promise<SessionPromptOutput> => {
  requireInstalledAgent(
    deps.installedAgents,
    deps.readSession(sessionId).agent,
  );
  const sessionActor = await openReadySession(deps, sessionId);
  const answer = await deps.hooks['prompt.submit']({ sessionId, prompt });

  if ('drop' in answer) return { messageId: null, drop: answer.drop };
  const turnId = deps.createId();
  validateSessionCommandAdmission(deps);
  await submitSessionPrompt(sessionActor, { turnId, content: answer.prompt });

  return { messageId: userMessageId(turnId) };
};
