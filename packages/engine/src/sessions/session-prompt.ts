import {
  SessionOpenFailure,
  type SessionPromptInput,
  type SessionPromptOutput,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { hasAgentServer } from '../agents';
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
  requireSessionAgent(deps, sessionId);
  const sessionActor = await openReadySession(deps, sessionId);
  const turnId = deps.createId();
  validateSessionCommandAdmission(deps);
  await submitSessionPrompt(sessionActor, { turnId, content: prompt });

  return { messageId: userMessageId(turnId) };
};

const requireSessionAgent = (
  deps: Pick<SessionRouterDeps, 'sessions' | 'readSession'>,
  sessionId: string,
): void => {
  const agent = deps.readSession(sessionId).agent;

  if (hasAgentServer(deps.sessions.getSnapshot().context.database, agent))
    return;
  const message = `Agent "${agent}" is not installed.`;
  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message,
    cause: new SessionOpenFailure({ type: 'failed', message }),
  });
};
