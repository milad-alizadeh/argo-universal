import type { FeedActorRef } from './feed-machine';
export type FeedPublication = Pick<
  PromiseWithResolvers<void>,
  'resolve' | 'reject'
>;
export const publishTurnContent = (
  feed: FeedActorRef,
  turnId: string,
): Promise<void> => {
  if (feed.getSnapshot().status !== 'active')
    return Promise.reject(new Error('Session Feed is unavailable'));
  const published = Promise.withResolvers<void>();
  const subscription = feed.subscribe({
    complete: () =>
      published.reject(new Error('Feed closed before Turn publication')),
    error: (error) => published.reject(error),
  });
  feed.send({ type: 'feed.completeTurn', turnId, published });
  return published.promise.finally(() => subscription.unsubscribe());
};
