import {
  FeedPageInput,
  FeedPageOutput,
  FeedRowInput,
  FeedRowOutput,
  FeedSubscribeInput,
  FeedSubscribeOutput,
} from '@repo/contracts';
import { publicProcedure, router, zAsyncIterable } from '../../engine/trpc';
import { readFeedPage, readFeedRow, streamFeed } from './feed';

// The Feed procedures.
export const feedRouter = router({
  page: publicProcedure
    .input(FeedPageInput)
    .output(FeedPageOutput)
    .query(({ ctx, input }): FeedPageOutput => readFeedPage(ctx, input)),
  row: publicProcedure
    .input(FeedRowInput)
    .output(FeedRowOutput)
    .query(({ ctx, input }): FeedRowOutput => readFeedRow(ctx, input)),
  subscribe: publicProcedure
    .input(FeedSubscribeInput)
    .output(zAsyncIterable({ yield: FeedSubscribeOutput }))
    .subscription(async function* ({
      ctx,
      input,
      signal,
    }): AsyncGenerator<FeedSubscribeOutput, void> {
      yield* streamFeed(ctx, input, signal);
    }),
});
