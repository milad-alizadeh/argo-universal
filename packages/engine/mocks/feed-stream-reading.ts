import type { FeedSubscribeOutput } from '@repo/contracts';

const upsertType = 'row.upsert';

export const isIdle = (event: FeedSubscribeOutput): boolean =>
  event.type === 'snapshot' && event.snapshot.state === 'idle';

export const isTurnComplete = (event: FeedSubscribeOutput): boolean =>
  event.type === 'snapshot' && event.snapshot.activeTurnId === null;

export const isUpsert = (event: FeedSubscribeOutput): boolean =>
  event.type === upsertType;

export const isQueuedTool = (event: FeedSubscribeOutput): boolean =>
  event.type === upsertType && event.row.revision === 3;

export const isNextMessage = (event: FeedSubscribeOutput): boolean => {
  if (event.type !== upsertType) return false;

  return (
    event.row.sessionUpdate === 'agent_message' &&
    event.row.messageId === 'next-row'
  );
};

export async function readThrough(
  stream: AsyncIterator<FeedSubscribeOutput>,
  complete: (event: FeedSubscribeOutput) => boolean,
): Promise<FeedSubscribeOutput[]> {
  const events: FeedSubscribeOutput[] = [];

  for await (const event of { [Symbol.asyncIterator]: () => stream }) {
    events.push(event);

    if (complete(event)) break;
  }

  return events;
}

export async function closeStream(
  stream: AsyncIterator<FeedSubscribeOutput>,
): Promise<void> {
  await stream.return?.();
}
