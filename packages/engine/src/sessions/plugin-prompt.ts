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

/*
 * A Plugin's Prompt (ADR-0055). An idle Session starts a Turn with the Plugin as sender; a busy or paused
 * one takes it at the end of the queue with that sender, behind everything already there. It only appends:
 * it never resumes a paused queue.
 */
export async function promptFromPlugin(
  sources: PluginPromptSources,
  input: Pick<SessionPromptInput, 'sessionId' | 'prompt'>,
  sender: NonUserPromptSender,
): Promise<PluginPromptAnswer> {
  const session = await sources.open.ready(input.sessionId, queueEvent);
  const context = sources.open.context(input.sessionId);

  if (!context || !hasWork(context))
    return startPluginPrompt(sources, input, sender);

  sources.open.admit();

  const queuedId = sources.createId();

  return queuePluginPrompt(session, { prompt: input.prompt, sender, queuedId });
}

type QueuedPluginPrompt = Pick<SessionPromptInput, 'prompt'> & {
  sender: NonUserPromptSender;
  queuedId: string;
};

// Appends under an id the Server chose, so the Plugin can withdraw it.
async function queuePluginPrompt(
  session: SessionActorRef,
  { prompt, sender, queuedId }: QueuedPluginPrompt,
): Promise<PluginPromptAnswer> {
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
  sender: NonUserPromptSender,
): Promise<PluginPromptAnswer> {
  const started = await startSessionPrompt(sources, input, { sender }).accepted;

  if (started.messageId !== null) return { status: 'started' };

  throw new TRPCError({
    code: 'CONFLICT',
    message: `A Hook dropped the Prompt: ${started.drop}`,
  });
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
