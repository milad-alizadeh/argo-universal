import type { SessionPromptInput, SessionPromptOutput } from '@repo/contracts';
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
    'sessions' | 'readSession' | 'createId' | 'sessionCommandSignal'
  >,
  { sessionId, prompt }: SessionPromptInput,
): Promise<SessionPromptOutput> => {
  const sessionActor = await openReadySession(deps, sessionId);
  const turnId = deps.createId();
  validateSessionCommandAdmission(deps);
  await submitSessionPrompt(sessionActor, { turnId, content: prompt });
  return { messageId: userMessageId(turnId) };
};
