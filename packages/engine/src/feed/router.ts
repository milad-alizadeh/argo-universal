import {
  FeedPageInput,
  FeedPageOutput,
  FeedReportsInput,
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
  zTrackedAsyncIterable,
} from '../rpc';
import { type FeedDeps, readFeedPage, readFeedRow, trackedFeed } from './feed';

const createFeedReadRouter = routerFactory((deps: FeedDeps) =>
  router({
    page: publicProcedure
      .input(FeedPageInput)
      .output(FeedPageOutput)
      .query(({ input }): FeedPageOutput => readFeedPage(deps, input)),
    reports: publicProcedure
      .input(FeedReportsInput)
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
    // Every event but `closed` carries an id (`tracked`): tRPC's client keeps the newest one as `lastEventId` and sends it again on a reconnect, and an event without an id would clear it (@trpc/client wsLink, `handleResponseMessage`).
    subscribe: publicProcedure
      .input(FeedSubscribeInput)
      .output(zTrackedAsyncIterable({ yield: FeedSubscribeOutput }))
      .subscription(({ input, signal }) => trackedFeed(deps, input, signal)),
  }),
);

export const createFeedRouter = routerFactory((deps: FeedDeps) =>
  mergeRouters(createFeedReadRouter(deps), createFeedStreamRouter(deps)),
);
