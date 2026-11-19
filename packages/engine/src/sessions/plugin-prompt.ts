import type { NonUserPromptSender, SessionPromptInput } from '@repo/contracts';
import type {
  PluginPromptAnswer,
  PluginWithdrawAnswer,
} from '@repo/contracts/plugins/argo-calls';
import { TRPCError } from '@trpc/server';
import type { QueueSessionCommand } from './queue-command-types';
import { sendSessionCommand } from './session-command';
import type { SessionContext } from './session-context';
import type { SessionActorRef } from './session-machine';
import { startSessionPrompt } from './session-prompt';
import type { HandlerSources } from './session-sources';

const queueEvent = 'session.queue';

type PluginPromptSources = HandlerSources<
  'readSession' | 'createId' | 'installedAgents' | 'hooks',
  'admit' | 'ready' | 'context'
>;

// A Turn runs, or work already waits, or the queue is paused: the Prompt cannot start now.
const hasWork = ({
  activeTurnId,
  pendingSubmission,
  promptQueue,
}: Pick<
  SessionContext,
  'activeTurnId' | 'pendingSubmission' | 'promptQueue'
>): boolean =>
  [
    activeTurnId !== null,
    pendingSubmission !== null,
    promptQueue.items.length > 0,
    promptQueue.pauseReason !== null,
  ].some(Boolean);

// Where a Prompt from a sender other than the person went: the Turn it started, or its place in the queue.
export type SentPrompt =
  | { status: 'started'; turnId: string }
  | { status: 'queued'; queuedId: string };

// A Prompt a `prompt.submit` Hook dropped before its Turn started; `drop` says why.
type DroppedPrompt = { status: 'dropped'; drop: string };

/*
 * Who sends the Prompt; the id it takes, as its Turn's id or, queued, as its queued id, which its Turn takes when the
 * queue starts it; and the caller's budget, which also stops its admission.
 */
export type SendRequest = {
  sender: NonUserPromptSender;
  id: string;
  signal?: AbortSignal;
};

// A Plugin's Prompt (ADR-0055): it learns whether it started, or the queued id it may withdraw.
export async function promptFromPlugin(
  sources: PluginPromptSources,
  input: Pick<SessionPromptInput, 'sessionId' | 'prompt'>,
  sender: NonUserPromptSender,
): Promise<PluginPromptAnswer> {
  const request = { sender, id: sources.createId() };
  const sent = requireSent(await sendPromptAs(sources, input, request));

  return sent.status === 'started' ? { status: 'started' } : sent;
}

// A Plugin's and the Voice call's Prompt that a Hook dropped is refused, saying why.
export function requireSent(sent: SentPrompt | DroppedPrompt): SentPrompt {
  if (sent.status !== 'dropped') return sent;

  throw new TRPCError({
    code: 'CONFLICT',
    message: `A Hook dropped the Prompt: ${sent.drop}`,
  });
}

/*
 * A Prompt from a sender other than the person. An idle Session starts a Turn with that sender; a busy or paused
 * one takes it at the end of the queue with that sender, behind everything already there. It only appends:
 * it never resumes a paused queue.
 */
export async function sendPromptAs(
  sources: PluginPromptSources,
  input: Pick<SessionPromptInput, 'sessionId' | 'prompt'>,
  request: SendRequest,
): Promise<SentPrompt | DroppedPrompt> {
  const { sessionId } = input;
  const { signal } = request;
  const session = await sources.open.ready(sessionId, queueEvent, signal);
  const context = sources.open.context(sessionId);

  if (!context || !hasWork(context))
    return startPluginPrompt(sources, input, request);

  sources.open.admit(signal);

  return queuePluginPrompt(session, input.prompt, request);
}

// Appends under an id the Server chose, so the Plugin can withdraw it, and the Turn that starts it takes it.
async function queuePluginPrompt(
  session: SessionActorRef,
  prompt: SessionPromptInput['prompt'],
  { sender, id: queuedId }: SendRequest,
): Promise<SentPrompt> {
  await sendQueueCommand(session, {
    command: { action: 'append', prompt },
    sender,
    queuedId,
  });

  return { status: 'queued', queuedId };
}

/*
 * A Plugin takes back a Queued Prompt it sent (ADR-0055). One that started, is gone, or the person is editing stays as
 * it is and answers not withdrawn; anyone else's is refused. The queue step that changes the queue gives the answer.
 */
export async function withdrawFromPlugin(
  sources: PluginPromptSources,
  input: { sessionId: string; queuedId: string; pluginId: string },
): Promise<PluginWithdrawAnswer> {
  const session = await sources.open.ready(input.sessionId, queueEvent);

  sources.open.admit();

  const answer = Promise.withResolvers<boolean>();
  const command = { action: 'withdraw' as const, id: input.queuedId };

  await sendQueueCommand(session, {
    command: { ...command, pluginId: input.pluginId, decided: answer.resolve },
  });

  return { withdrawn: await answer.promise };
}

async function startPluginPrompt(
  sources: PluginPromptSources,
  input: Pick<SessionPromptInput, 'sessionId' | 'prompt'>,
  { sender, id, signal }: SendRequest,
): Promise<SentPrompt | DroppedPrompt> {
  const request = { sender, turnId: id, signal };
  const started = await startSessionPrompt(sources, input, request).accepted;

  return started.messageId === null
    ? { status: 'dropped', drop: started.drop }
    : { status: 'started', turnId: started.turnId };
}

type ServerQueueEvent = Omit<
  Extract<QueueSessionCommand, { type: typeof queueEvent }>,
  'type' | 'committed' | 'connectionSignal'
>;

function sendQueueCommand(
  session: SessionActorRef,
  event: ServerQueueEvent,
): Promise<void> {
  const committed = Promise.withResolvers<void>();
  sendSessionCommand(session, { type: queueEvent, ...event, committed });

  return committed.promise;
}
