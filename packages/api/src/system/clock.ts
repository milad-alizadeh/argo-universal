import { ClockTick } from '@argo/contracts';
import { publicProcedure, zAsyncIterable } from '../trpc';

export const clock = publicProcedure
  .output(zAsyncIterable({ yield: ClockTick }))
  .subscription(async function* ({ ctx, signal }) {
    yield* ctx.services.system.clock(signal);
  });
