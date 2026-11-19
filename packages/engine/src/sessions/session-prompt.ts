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
  followUpSuggestions?: boolean;
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

/*
 * Where an admitted Prompt landed, with the Turn that holds it or will: a queued Prompt's Turn takes the Prompt's
 * queued id, so its caller follows that Turn before it starts. A dropped one has no Turn.
 */
export type AcceptedSessionPrompt =
  | { status: 'started' | 'steered'; messageId: string; turnId: string }
  | {
      status: 'queued';
      messageId: string;
      turnId: string;
      notSteered: string | null;
    }
  | { messageId: null; drop: string };

type StartedPrompt = { status: 'started'; messageId: string; turnId: string };

type DroppedPrompt = Extract<AcceptedSessionPrompt, { messageId: null }>;

async function submitAcceptedPrompt(
  sessionActor: SessionActorRef,
  { turnId, sender, followUpSuggestions }: PromptTurn,
  content: SessionPromptInput['prompt'],
): Promise<StartedPrompt> {
  await submitSessionPrompt(sessionActor, {
    turnId,
    content,
    sender,
    followUpSuggestions,
  });

  const messageId = promptMessageId(turnId, sender);

  return { status: 'started', messageId, turnId };
}

type StartRequest = Pick<NativeStartRequest, 'sender' | 'signal'> & {
  turnId?: string;
};

// The Turn id is allocated before admission, so a caller that stops waiting can still follow the Turn.
export function startSessionPrompt(
  sources: PromptSources,
  input: SessionPromptInput,
  { sender, signal, turnId = sources.createId() }: StartRequest,
): NativeStart<StartedPrompt | DroppedPrompt> {
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
  { sessionId, prompt, followUpSuggestions }: SessionPromptInput,
  { turnId, sender, signal }: PromptTurn,
): Promise<StartedPrompt | DroppedPrompt> {
  const sessionActor = await readyPromptSession(sources, sessionId, signal);
  const answer = await runPromptHook(sources, { sessionId, prompt });

  if ('drop' in answer) return { messageId: null, drop: answer.drop };

  sources.open.admit(signal);

  const turn = { turnId, sender, followUpSuggestions };

  return submitAcceptedPrompt(sessionActor, turn, answer.prompt);
}
