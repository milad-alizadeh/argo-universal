import { ClockTick } from '@repo/contracts';
import { publicProcedure, zAsyncIterable } from '../trpc';

export const clock = publicProcedure
  .output(zAsyncIterable({ yield: ClockTick }))
  .subscription(async function* ({
    ctx,
    signal,
  }): AsyncGenerator<ClockTick, void> {
    yield* ctx.services.system.clock(signal);
  });
