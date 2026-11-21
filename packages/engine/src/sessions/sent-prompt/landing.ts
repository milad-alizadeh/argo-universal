import type { SentPromptSender, SessionPromptInput } from '@repo/contracts';
import type { PromptSend } from '../prompt-sender';
import type { SessionContext } from '../session-context';
import type { SessionActorRef } from '../session-machine';
import { startPromptOn, type PromptLanding } from '../session-prompt';
import type { HandlerSources } from '../session-sources';
import { sendQueueCommand } from './queue';
import { steerOrWait } from './steering';

export type SendSources = HandlerSources<
  'readSession' | 'createId' | 'installedAgents' | 'hooks',
  'admit' | 'ready'
>;

// One Prompt on its way: what it says, and its send; its id is its Turn's id or, queued, its queued id.
export type Sending = PromptSend<SentPromptSender> & {
  input: SessionPromptInput;
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

/*
 * Appends under the id the Server chose, behind everything already queued; it never resumes a paused queue. The
 * Conversation's Prompt may instead join its own still waiting, and then lands under that one's id (ADR-0064).
 */
async function queuePrompt(
  sources: SendSources,
  session: SessionActorRef,
  { input, sender, id, signal }: Sending,
): Promise<PromptLanding> {
  sources.open.admit(signal);
  let landedId = id;

  await sendQueueCommand(session, {
    command: { action: 'append', prompt: input.prompt },
    sender,
    queuedId: id,
    landed: (queuedId) => (landedId = queuedId),
  });

  return steerOrWait(session, { sender, id: landedId });
}

// An idle Session starts a Turn with the Prompt; a busy or paused one queues it, and steers it when it can.
export function landPrompt(
  sources: SendSources,
  session: SessionActorRef,
  sending: Sending,
): Promise<PromptLanding> {
  if (hasWork(session.getSnapshot().context))
    return queuePrompt(sources, session, sending);

  const { input, ...turn } = sending;

  return startPromptOn(sources, session, { input, turn });
}
