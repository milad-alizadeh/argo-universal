import type { FeedStore } from './use-feed-store';

export function resetSession(input: {
  start: FeedStore['start'];
  setFeed: FeedStore['setFeed'];
  setSnapshot: FeedStore['setSnapshot'];
  setClosureError: FeedStore['setClosureError'];
  commit: FeedStore['commit'];
}): void {
  input.commit.cancel();
  input.setFeed(input.start.feed);
  input.setSnapshot(input.start.snapshot);
  input.setClosureError(null);
}
