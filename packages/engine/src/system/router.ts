import { ClockTick, SystemInfo } from '@repo/contracts';
import { publicProcedure, router, routerFactory, zAsyncIterable } from '../rpc';
import { streamClock } from './clock';
import { readSystemInfo, type SystemDeps } from './info';

const clock = publicProcedure
  .output(zAsyncIterable({ yield: ClockTick }))
  .subscription(async function* ({ signal }): AsyncGenerator<ClockTick, void> {
    yield* streamClock(signal);
  });

export const createSystemRouter = routerFactory((deps: SystemDeps) =>
  router({
    info: publicProcedure
      .output(SystemInfo)
      .query((): SystemInfo => readSystemInfo(deps)),
    clock,
  }),
);
