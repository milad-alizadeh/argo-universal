import type { SentPromptSender } from '@repo/contracts';
import type { WriterJob } from '../storage';
import type { OpenSessions } from './open-sessions';
import { changePromptQueue, queueWrite } from './prompt-queue';
import type { AppendCommand } from './queued-prompt-append';
import { sendQueueCommand } from './sent-prompt/queue';

export type PromptDelivery = {
  command: Omit<AppendCommand, 'sender'>;
  sender: SentPromptSender;
  queuedId: string;
  commitWith: WriterJob;
};

export type PromptDeliverySessions = Pick<
  OpenSessions,
  'admit' | 'queued' | 'session' | 'write'
>;

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
): Promise<'settled' | 'not-ready'> {
  sessions.admit(signal);
  const live = sessions.session(target.sessionId);

  if (live && !live.getSnapshot().hasTag('ready')) return 'not-ready';

  await (live
    ? sendQueueCommand(live, target.delivery)
    : appendToStoredQueue(sessions, target));

  return 'settled';
}

async function appendToStoredQueue(
  sessions: Pick<PromptDeliverySessions, 'queued' | 'write'>,
  { sessionId, delivery, pauseWhenClosed }: QueueTarget,
): Promise<void> {
  const stored = sessions.queued(sessionId);

  if (stored.archivedAt !== null) return;
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
}
