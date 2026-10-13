import type { FeedActorRef } from './feed-machine';
import type { FeedTurnEnding } from './turn-settlement';
export type FeedPublication = Pick<
  PromiseWithResolvers<void>,
  'resolve' | 'reject'
>;
const watchPublication = (
  feed: FeedActorRef,
  published: FeedPublication,
): ReturnType<FeedActorRef['subscribe']> =>
  feed.subscribe({
    complete: () =>
      published.reject(new Error('Feed closed before Turn publication')),
    error: (error) => published.reject(error),
  });
export const publishTurnContent = (
  feed: FeedActorRef,
  turnId: string,
  ending?: FeedTurnEnding,
): Promise<void> => {
  if (feed.getSnapshot().status !== 'active')
    return Promise.reject(new Error('Session Feed is unavailable'));
  const published = Promise.withResolvers<void>();
  const subscription = watchPublication(feed, published);
  feed.send({ type: 'feed.completeTurn', turnId, ending, published });
  return published.promise.finally(() => subscription.unsubscribe());
};
