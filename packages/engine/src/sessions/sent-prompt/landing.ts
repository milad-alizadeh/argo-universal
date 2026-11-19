import type { SessionPromptInput } from '@repo/contracts';
import type { SessionContext } from '../session-context';
import type { SessionActorRef } from '../session-machine';
import { startPromptOn, type PromptLanding } from '../session-prompt';
import type { HandlerSources } from '../session-sources';
import { sendQueueCommand } from './queue';
import { steerOrWait, type QueuedSend } from './steering';

export type SendSources = HandlerSources<
  'readSession' | 'createId' | 'installedAgents' | 'hooks',
  'admit' | 'ready'
>;

/*
 * One Prompt on its way: what it says, who sends it, the id it takes as its Turn's id or, queued, as its queued id,
 * and the caller's budget, which also stops its admission.
 */
export type Sending = QueuedSend & {
  input: SessionPromptInput;
  signal?: AbortSignal;
};

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

// Appends under the id the Server chose, behind everything already queued; it never resumes a paused queue.
async function queuePrompt(
  sources: SendSources,
  session: SessionActorRef,
  { input, sender, id, signal }: Sending,
): Promise<PromptLanding> {
  sources.open.admit(signal);
  await sendQueueCommand(session, {
    command: { action: 'append', prompt: input.prompt },
    sender,
    queuedId: id,
  });

  return steerOrWait(session, { sender, id });
}

// An idle Session starts a Turn with the Prompt; a busy or paused one queues it, and steers it when it can.
export function landPrompt(
  sources: SendSources,
  session: SessionActorRef,
  sending: Sending,
): Promise<PromptLanding> {
  if (hasWork(session.getSnapshot().context))
    return queuePrompt(sources, session, sending);

  const { input, sender, id: turnId, signal } = sending;

  return startPromptOn(sources, session, {
    input,
    turn: { turnId, sender, signal },
  });
}
