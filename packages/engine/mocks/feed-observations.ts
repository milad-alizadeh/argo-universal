import type { FeedSubscribeOutput } from '@repo/contracts';
import { appendRowEvent, upsertRowEvent } from './feed-inputs';
const appendChange = (
  values: FeedSubscribeOutput[],
  event: FeedSubscribeOutput,
): void => {
  if (event.type !== 'snapshot') values.push(event);
};
export const takeFeedChanges = async (
  feedUpdates: AsyncIterator<FeedSubscribeOutput>,
  changeCount: number,
): Promise<FeedSubscribeOutput[]> => {
  const values: FeedSubscribeOutput[] = [];
  while (values.length < changeCount) {
    const next = await feedUpdates.next();
    if (next.done) break;
    appendChange(values, next.value);
  }
  return values;
};

export const summarizeFeedChanges = (
  outputs: FeedSubscribeOutput[],
): string[] =>
  outputs.map((output): string => {
    if (output.type === upsertRowEvent)
      return `upsert ${output.row.id} @${output.rev}`;
    if (output.type === appendRowEvent)
      return `append ${output.id} +${output.text} at ${output.off} @${output.rev}`;
    return output.type;
  });

const closeDeadline = (): {
  timer: ReturnType<typeof setTimeout>;
  promise: Promise<never>;
} => {
  const deadline = Promise.withResolvers<never>();
  const timer = setTimeout(
    () => deadline.reject(new Error('Feed did not close within 1000 ms')),
    1000,
  );
  return { timer, promise: deadline.promise };
};
const drain = async (
  updates: AsyncIterator<FeedSubscribeOutput>,
): Promise<FeedSubscribeOutput[]> => {
  const events: FeedSubscribeOutput[] = [];
  for await (const event of { [Symbol.asyncIterator]: () => updates })
    events.push(event);
  return events;
};
export async function drainClosedFeed(
  updates: AsyncIterator<FeedSubscribeOutput>,
): Promise<FeedSubscribeOutput[]> {
  const deadline = closeDeadline();
  try {
    return await Promise.race([drain(updates), deadline.promise]);
  } finally {
    clearTimeout(deadline.timer);
  }
}
