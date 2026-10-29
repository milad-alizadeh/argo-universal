import type { SessionPromptInput, PromptSender } from '@repo/contracts';
import { requireInstalledAgent } from '../agents';
import { promptMessageId } from '../feed';
import type { OpenSessions } from './open-sessions';
import type { NativeStart, NativeStartRequest } from './prompt-sender';
import { submitSessionPrompt } from './session-command';
import type { SessionActorRef } from './session-machine';

// A caller's budget also stops the Prompt it is waiting to admit.
type PromptTurn = {
  turnId: string;
  sender: PromptSender;
  signal?: AbortSignal;
};

const requirePromptAgent = (open: OpenSessions, sessionId: string): void => {
  requireInstalledAgent(
    open.installedAgents,
    open.readSession(sessionId).agent,
  );
};

const runPromptHook = (
  open: OpenSessions,
  { sessionId, prompt }: SessionPromptInput,
): ReturnType<OpenSessions['hooks']['prompt.submit']> =>
  open.hooks['prompt.submit']({
    sessionId,
    projectId: open.readSession(sessionId).projectId,
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
  open: OpenSessions,
  input: SessionPromptInput,
  { sender, signal }: Pick<NativeStartRequest, 'sender' | 'signal'>,
): NativeStart<AcceptedSessionPrompt> {
  const turnId = open.createId();

  return {
    sessionId: input.sessionId,
    turnId,
    accepted: admitPrompt(open, input, { turnId, sender, signal }),
  };
}

async function admitPrompt(
  open: OpenSessions,
  { sessionId, prompt }: SessionPromptInput,
  { turnId, sender, signal }: PromptTurn,
): Promise<AcceptedSessionPrompt> {
  requirePromptAgent(open, sessionId);
  const sessionActor = await open.ready(sessionId, 'session.prompt', signal);
  open.admit(signal);

  const answer = await runPromptHook(open, { sessionId, prompt });

  if ('drop' in answer) return { messageId: null, drop: answer.drop };
  open.admit(signal);

  return submitAcceptedPrompt(sessionActor, { turnId, sender }, answer.prompt);
}
