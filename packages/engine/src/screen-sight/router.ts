import {
  ScreenSightReply,
  ScreenSightReport,
  ScreenSightStreamEvent,
} from '@repo/contracts/operations';
import { z } from 'zod';
import { publicProcedure, router, routerFactory, zAsyncIterable } from '../rpc';
import type { ScreenSight } from './screen-sight';

export interface ScreenSightDeps {
  screenSight: ScreenSight;
}

// App plumbing (ADR-0044): a desktop App listens for capture requests and answers each one it hears.
export const createScreenSightRouter = routerFactory(
  ({ screenSight }: ScreenSightDeps) =>
    router({
      requests: publicProcedure
        .input(ScreenSightReport)
        .output(zAsyncIterable({ yield: ScreenSightStreamEvent }))
        .subscription(({ ctx, input, signal }) =>
          screenSight.requests(ctx.connection, input, signal),
        ),
      answer: publicProcedure
        .input(ScreenSightReply)
        .output(z.void())
        .mutation(({ ctx, input }): void =>
          screenSight.answer(ctx.connection, input),
        ),
    }),
);
