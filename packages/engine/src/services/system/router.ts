import { ClockTick, SystemInfo } from '@repo/contracts';
import { publicProcedure, router, zAsyncIterable } from '../../engine/trpc';
import { streamClock } from './clock';
import { readSystemInfo } from './info';

const clock = publicProcedure
  .output(zAsyncIterable({ yield: ClockTick }))
  .subscription(async function* ({ signal }): AsyncGenerator<ClockTick, void> {
    yield* streamClock(signal);
  });

const info = publicProcedure
  .output(SystemInfo)
  .query(({ ctx: engineContext }): SystemInfo => readSystemInfo(engineContext));

export const systemRouter = router({ info, clock });
