import { ClockTick, KeepRunning, SystemInfo } from '@repo/contracts';
import {
  publicProcedure,
  router,
  routerFactory,
  serverDeviceProcedure,
  zAsyncIterable,
} from '../rpc';
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
    // Server-Device-only (ADR-0022, ADR-0045): how the Server Device runs is its own, so `serverDeviceProcedure` refuses a Paired Device rather than leaving the hidden row as the check.
    setKeepRunning: serverDeviceProcedure
      .input(KeepRunning)
      .output(KeepRunning)
      .mutation(({ input }) => setKeepRunning(deps, input.enabled)),
  }),
);
