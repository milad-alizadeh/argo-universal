import type { SessionPromptInput, PromptSender } from '@repo/contracts';
import { requireInstalledAgent } from '../agents';
import { promptMessageId } from '../feed';
import type { NativeStart, NativeStartRequest } from './prompt-sender';
import { submitSessionPrompt } from './session-command';
import type { SessionActorRef } from './session-machine';
import type { HandlerSources } from './session-sources';

type PromptSources = HandlerSources<
  'readSession' | 'createId' | 'installedAgents' | 'hooks',
  'admit' | 'ready'
>;

// A caller's budget also stops the Prompt it is waiting to admit.
type PromptTurn = {
  turnId: string;
  sender: PromptSender;
  signal?: AbortSignal;
};

const requirePromptAgent = (
  sources: PromptSources,
  sessionId: string,
): void => {
  requireInstalledAgent(
    sources.installedAgents,
    sources.readSession(sessionId).agent,
  );
};

const runPromptHook = (
  sources: PromptSources,
  { sessionId, prompt }: SessionPromptInput,
): ReturnType<PromptSources['hooks']['prompt.submit']> =>
  sources.hooks['prompt.submit']({
    sessionId,
    projectId: sources.readSession(sessionId).projectId,
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
  sources: PromptSources,
  input: SessionPromptInput,
  { sender, signal }: Pick<NativeStartRequest, 'sender' | 'signal'>,
): NativeStart<AcceptedSessionPrompt> {
  const turnId = sources.createId();

  return {
    sessionId: input.sessionId,
    turnId,
    accepted: admitPrompt(sources, input, { turnId, sender, signal }),
  };
}

async function readyPromptSession(
  sources: PromptSources,
  sessionId: string,
  signal: AbortSignal | undefined,
): Promise<SessionActorRef> {
  requirePromptAgent(sources, sessionId);

  const sessionActor = await sources.open.ready(
    sessionId,
    'session.prompt',
    signal,
  );

  sources.open.admit(signal);

  return sessionActor;
}

async function admitPrompt(
  sources: PromptSources,
  { sessionId, prompt }: SessionPromptInput,
  { turnId, sender, signal }: PromptTurn,
): Promise<AcceptedSessionPrompt> {
  const sessionActor = await readyPromptSession(sources, sessionId, signal);
  const answer = await runPromptHook(sources, { sessionId, prompt });

  if ('drop' in answer) return { messageId: null, drop: answer.drop };

  sources.open.admit(signal);

  return submitAcceptedPrompt(sessionActor, { turnId, sender }, answer.prompt);
}
