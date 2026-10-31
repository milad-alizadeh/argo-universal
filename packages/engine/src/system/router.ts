import { ClockTick, KeepRunning, SystemInfo } from '@repo/contracts';
import { publicProcedure, router, routerFactory, zAsyncIterable } from '../rpc';
import { streamClock } from './clock';
import { readSystemInfo, type SystemDeps } from './info';
import { readKeepRunning, setKeepRunning } from './keep-running';

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
    keepRunning: publicProcedure
      .output(KeepRunning)
      .query((): KeepRunning => readKeepRunning(deps.database)),
    // Server Device only. The Server will refuse a paired Device with `serverDeviceProcedure` (#1497); until then the App hides the row from one.
    setKeepRunning: publicProcedure
      .input(KeepRunning)
      .output(KeepRunning)
      .mutation(({ input }) => setKeepRunning(deps, input.enabled)),
  }),
);
