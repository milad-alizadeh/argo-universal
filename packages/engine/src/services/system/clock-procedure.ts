import { ClockTick } from '@repo/contracts';
import { publicProcedure, zAsyncIterable } from '../../engine/trpc';
import { streamClock } from './clock';

export const clock = publicProcedure
  .output(zAsyncIterable({ yield: ClockTick }))
  .subscription(async function* ({ signal }): AsyncGenerator<ClockTick, void> {
    yield* streamClock(signal);
  });
