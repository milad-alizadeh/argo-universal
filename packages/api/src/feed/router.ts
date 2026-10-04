import {
  FeedPageInput,
  FeedPageOutput,
  FeedRowInput,
  FeedRowOutput,
  FeedSubscribeInput,
  FeedSubscribeOutput,
} from '@repo/contracts';
import { publicProcedure, router, zAsyncIterable } from '../trpc';

// The Feed procedures of spec 0001 section 6.
export const feedRouter = router({
  page: publicProcedure
    .input(FeedPageInput)
    .output(FeedPageOutput)
    .query(({ ctx, input }) => ctx.services.feed.page(input)),
  row: publicProcedure
    .input(FeedRowInput)
    .output(FeedRowOutput)
    .query(({ ctx, input }) => ctx.services.feed.row(input)),
  subscribe: publicProcedure
    .input(FeedSubscribeInput)
    .output(zAsyncIterable({ yield: FeedSubscribeOutput }))
    .subscription(async function* ({ ctx, input, signal }) {
      yield* ctx.services.feed.subscribe(input, signal);
    }),
});
