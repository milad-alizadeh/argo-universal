import type { QueuedPrompt } from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import type { WithdrawCommand } from './queue-command-types';
import type { SessionContext } from './session-context';

type QueueChange = Pick<SessionContext, 'promptQueue' | 'queueHolds'>;

type QueueContext = QueueChange & Pick<SessionContext, 'dispatchingQueueId'>;

const sentBy = (row: QueuedPrompt, pluginId: string): boolean =>
  row.sender?.type === 'plugin' && row.sender.pluginId === pluginId;

// The row still waiting under this id; one that started is no longer the queue's.
const waitingRow = (
  { promptQueue, dispatchingQueueId }: QueueContext,
  id: string,
): QueuedPrompt | undefined =>
  promptQueue.items.find((item) => item.id === id && id !== dispatchingQueueId);

// The person holding a Prompt for editing makes it theirs.
const removable = (
  { queueHolds }: QueueContext,
  row?: QueuedPrompt,
): row is QueuedPrompt => row !== undefined && !queueHolds[row.id];

const notSent = 'This Prompt was not sent by this Plugin';

// The queue without the row, when it may be taken back.
const keptOf = (context: QueueContext, row?: QueuedPrompt): QueuedPrompt[] => {
  const { items } = context.promptQueue;

  return removable(context, row)
    ? items.filter((item) => item.id !== row.id)
    : items;
};

/*
 * A Plugin takes back a Prompt it sent (ADR-0055). One that started or is gone has nothing to take back, and one the
 * person holds for editing is theirs now; both stay as they are. Anyone else's Prompt is refused.
 */
export function withdrawRow(
  context: QueueContext,
  { id, pluginId }: WithdrawCommand,
): QueueChange {
  const row = waitingRow(context, id);

  if (row && !sentBy(row, pluginId))
    throw new TRPCError({ code: 'CONFLICT', message: notSent });

  return {
    promptQueue: { ...context.promptQueue, items: keptOf(context, row) },
    queueHolds: context.queueHolds,
  };
}
