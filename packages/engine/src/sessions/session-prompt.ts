import type { SessionPromptInput } from '@repo/contracts';
import { requireInstalledAgent } from '../agents';
import { promptMessageId } from '../feed';
import type { PromptSend } from './prompt-sender';
import { submitSessionPrompt, waitForReadySession } from './session-command';
import type { SessionActorRef } from './session-machine';
import type { HandlerSources } from './session-sources';

type PromptSources = HandlerSources<
  'readSession' | 'createId' | 'installedAgents' | 'hooks',
  'admit' | 'ready'
>;

/*
 * Where a Prompt landed, with the Feed row it takes: the Turn it started or was steered into, or its place in the
 * queue, whose id the Turn that starts it takes. A queued Prompt that could have steered says why it waits. A Prompt a
 * `prompt.submit` Hook dropped has no Turn, and says why.
 */
export type PromptLanding =
  | { status: 'started' | 'steered'; messageId: string; turnId: string }
  | {
      status: 'queued';
      messageId: string;
      queuedId: string;
      notSteered: string | null;
    }
  | { status: 'dropped'; drop: string };

type StartedPrompt =
  | { status: 'started'; messageId: string; turnId: string }
  | Extract<PromptLanding, { status: 'dropped' }>;

// The Prompt, and the Turn it starts, under the send's id.
type PromptStart = { input: SessionPromptInput; turn: PromptSend };

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

async function submitAcceptedPrompt(
  sessionActor: SessionActorRef,
  { input, turn: { id: turnId, sender } }: PromptStart,
  content: SessionPromptInput['prompt'],
): Promise<StartedPrompt> {
  const { followUpSuggestions } = input;

  await submitSessionPrompt(sessionActor, {
    turnId,
    content,
    sender,
    followUpSuggestions,
  });

  const messageId = promptMessageId(turnId, sender);

  return { status: 'started', messageId, turnId };
}

// Admits the Prompt as the start of a Turn under the send's id, which the caller allocated so it can follow the Turn.
export async function admitSessionPrompt(
  sources: PromptSources,
  input: SessionPromptInput,
  turn: PromptSend,
): Promise<StartedPrompt> {
  requirePromptAgent(sources, input.sessionId);

  const session = await sources.open.ready(
    input.sessionId,
    'session.prompt',
    turn.signal,
  );

  return submitPromptTo(sources, session, { input, turn });
}

/*
 * Starts a Turn with the Prompt on a Session that was readied for another command: it waits out the Session's
 * settling, as a Prompt does, then admits the Prompt as `admitSessionPrompt` does.
 */
export async function startPromptOn(
  sources: PromptSources,
  session: SessionActorRef,
  start: PromptStart,
): Promise<StartedPrompt> {
  requirePromptAgent(sources, start.input.sessionId);
  await waitForReadySession(session, 'session.prompt');

  return submitPromptTo(sources, session, start);
}

// Runs the `prompt.submit` Hooks, then submits what they leave unless one dropped it.
async function submitPromptTo(
  sources: PromptSources,
  session: SessionActorRef,
  start: PromptStart,
): Promise<StartedPrompt> {
  const { signal } = start.turn;

  sources.open.admit(signal);

  const answer = await runPromptHook(sources, start.input);

  if ('drop' in answer) return { status: 'dropped', drop: answer.drop };

  sources.open.admit(signal);

  return submitAcceptedPrompt(session, start, answer.prompt);
}
