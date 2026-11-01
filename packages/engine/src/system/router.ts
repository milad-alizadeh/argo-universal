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
    /*
     * Both halves of the setting are Server-Device-only. ADR-0045 names keeping the Server running after the desktop app quits alongside Local network access as one pair of the owner's own settings, and ADR-0022's reason is the Server Device's configuration being no business of a Paired Device's, which reading it is as much as changing it.
     * So the Server refuses the question as well as the change, rather than leaving the App's hidden row as the check.
     */
    keepRunning: serverDeviceProcedure
      .output(KeepRunning)
      .query((): KeepRunning => readKeepRunning(deps.database)),
    setKeepRunning: serverDeviceProcedure
      .input(KeepRunning)
      .output(KeepRunning)
      .mutation(({ input }) => setKeepRunning(deps, input.enabled)),
  }),
);
