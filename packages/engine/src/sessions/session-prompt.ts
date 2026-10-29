import type { SessionPromptInput, PromptSender } from '@repo/contracts';
import { requireInstalledAgent } from '../agents';
import { promptMessageId } from '../feed';
import type { NativeStart, SessionOrigin } from './prompt-sender';
import type { SessionRouterDeps } from './router-deps';
import {
  submitSessionPrompt,
  validateSessionCommandAdmission,
} from './session-command';
import type { SessionActorRef } from './session-machine';
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

const requirePromptAgent = (deps: PromptDeps, sessionId: string): void => {
  requireInstalledAgent(
    deps.installedAgents,
    deps.readSession(sessionId).agent,
  );
};

const runPromptHook = (
  deps: PromptDeps,
  { sessionId, prompt }: SessionPromptInput,
): ReturnType<PromptDeps['hooks']['prompt.submit']> =>
  deps.hooks['prompt.submit']({
    sessionId,
    projectId: deps.readSession(sessionId).projectId,
    prompt,
  });

export type AcceptedSessionPrompt =
  | { messageId: string; turnId: string }
  | { messageId: null; drop: string };

async function submitAcceptedPrompt(
  sessionActor: SessionActorRef,
  { turnId, sender }: PromptTurn,
  content: SessionPromptInput['prompt'],
): Promise<AcceptedSessionPrompt> {
  await submitSessionPrompt(sessionActor, { turnId, content, sender });

  return { messageId: promptMessageId(turnId, sender), turnId };
}

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
  requirePromptAgent(deps, sessionId);
  const sessionActor = await openReadySession(deps, sessionId);
  validateSessionCommandAdmission(deps);

  const answer = await runPromptHook(deps, { sessionId, prompt });

  if ('drop' in answer) return { messageId: null, drop: answer.drop };
  validateSessionCommandAdmission(deps);

  return submitAcceptedPrompt(sessionActor, { turnId, sender }, answer.prompt);
}
