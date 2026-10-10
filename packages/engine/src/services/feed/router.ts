import {
  FeedPageInput,
  FeedPageOutput,
  FeedRowInput,
  FeedRowOutput,
  FeedSubscribeInput,
  FeedSubscribeOutput,
} from '@repo/contracts';
import { publicProcedure, routerFactory, zAsyncIterable } from '../../rpc';
import { type FeedDeps, readFeedPage, readFeedRow, streamFeed } from './feed';

// The Feed procedures.
export const createFeedRouter = routerFactory((deps: FeedDeps) => ({
  page: publicProcedure
    .input(FeedPageInput)
    .output(FeedPageOutput)
    .query(({ input }): FeedPageOutput => readFeedPage(deps, input)),
  row: publicProcedure
    .input(FeedRowInput)
    .output(FeedRowOutput)
    .query(({ input }): FeedRowOutput => readFeedRow(deps, input)),
  subscribe: publicProcedure
    .input(FeedSubscribeInput)
    .output(zAsyncIterable({ yield: FeedSubscribeOutput }))
    .subscription(async function* ({
      input,
      signal,
    }): AsyncGenerator<FeedSubscribeOutput, void> {
      yield* streamFeed(deps, input, signal);
    }),
}));
