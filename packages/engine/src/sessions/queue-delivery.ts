import type { SentPromptSender } from '@repo/contracts';
import type { WriterJob } from '../storage';
import type { OpenSessions } from './open-sessions';
import { changePromptQueue, queueWrite } from './prompt-queue';
import type { AppendCommand } from './queued-prompt-append';
import { sendQueueCommand } from './sent-prompt/queue';
import { steerOrWait } from './sent-prompt/steering';

export type PromptDelivery = {
  command: Omit<AppendCommand, 'sender'>;
  sender: SentPromptSender;
  queuedId: string;
  commitWith?: WriterJob;
};

export type PromptDeliverySessions = Pick<
  OpenSessions,
  'admit' | 'queued' | 'session' | 'write'
>;

type QueueDeliveryOutcome = 'queued' | 'not-ready' | 'archived';

type QueueTarget = {
  sessionId: string;
  delivery: PromptDelivery;
  pauseWhenClosed: string;
};

/*
 * The stable id and receipt travel with the Prompt. An open Session keeps its queue policy.
 * A closed Session keeps the Prompt without reopening and waits for an explicit resume.
 */
export async function deliverQueuedPrompt(
  sessions: PromptDeliverySessions,
  target: QueueTarget,
  signal: AbortSignal,
): Promise<QueueDeliveryOutcome> {
  sessions.admit(signal);
  const live = sessions.session(target.sessionId);

  if (!live) return appendToStoredQueue(sessions, target);

  if (!live.getSnapshot().hasTag('ready')) return 'not-ready';

  const { sender, queuedId } = target.delivery;
  await sendQueueCommand(live, target.delivery);

  if (sender.type === 'session' && sender.delegatedInput)
    void steerOrWait(live, { sender, id: queuedId });

  return 'queued';
}

async function appendToStoredQueue(
  sessions: Pick<PromptDeliverySessions, 'queued' | 'write'>,
  { sessionId, delivery, pauseWhenClosed }: QueueTarget,
): Promise<'queued' | 'archived'> {
  const stored = sessions.queued(sessionId);

  if (stored.archivedAt !== null) return 'archived';
  const { command, sender, queuedId, commitWith } = delivery;

  const { promptQueue } = changePromptQueue(
    {
      promptQueue: stored.promptQueue,
      queueHolds: {},
      dispatchingQueueId: null,
    },
    { ...command, sender, queuedId },
    () => queuedId,
  );

  await sessions.write(
    queueWrite(
      sessionId,
      {
        ...promptQueue,
        pauseReason: promptQueue.pauseReason ?? pauseWhenClosed,
      },
      commitWith,
    ),
  );

  return 'queued';
}
