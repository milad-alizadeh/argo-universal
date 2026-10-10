import {
  FeedPageInput,
  FeedPageOutput,
  FeedRowInput,
  FeedRowOutput,
  FeedSubscribeInput,
  FeedSubscribeOutput,
} from '@repo/contracts';
import {
  mergeRouters,
  publicProcedure,
  router,
  routerFactory,
  zAsyncIterable,
} from '../../rpc';
import { type FeedDeps, readFeedPage, readFeedRow, streamFeed } from './feed';

const createFeedReadRouter = routerFactory((deps: FeedDeps) =>
  router({
    page: publicProcedure
      .input(FeedPageInput)
      .output(FeedPageOutput)
      .query(({ input }): FeedPageOutput => readFeedPage(deps, input)),
    row: publicProcedure
      .input(FeedRowInput)
      .output(FeedRowOutput)
      .query(({ input }): FeedRowOutput => readFeedRow(deps, input)),
  }),
);

const createFeedStreamRouter = routerFactory((deps: FeedDeps) =>
  router({
    subscribe: publicProcedure
      .input(FeedSubscribeInput)
      .output(zAsyncIterable({ yield: FeedSubscribeOutput }))
      .subscription(async function* ({
        input,
        signal,
      }): AsyncGenerator<FeedSubscribeOutput, void> {
        yield* streamFeed(deps, input, signal);
      }),
  }),
);

export const createFeedRouter = routerFactory((deps: FeedDeps) =>
  mergeRouters(createFeedReadRouter(deps), createFeedStreamRouter(deps)),
);
