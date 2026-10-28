import {
  SessionShellsInput,
  SessionShellsOutput,
  ShellOutput,
  ShellOutputInput,
} from '@repo/contracts';
import {
  publicProcedure,
  router,
  routerFactory,
  zAsyncIterable,
} from '../../rpc';
import type { SessionRouterDeps } from '../router-deps';
import { watchShellOutput } from './output';
import { readShellRecords } from './reader';
import { toShell } from './shell-data';

const listShells = (
  deps: SessionRouterDeps,
  sessionId: string,
): SessionShellsOutput => {
  deps.readSession(sessionId);
  const actor = deps.sessions.getSnapshot().context.sessions[sessionId];
  const runtime = actor?.getSnapshot().context.shellRuntime;

  return readShellRecords(deps.database, sessionId).map((record) =>
    toShell(record, {
      now: Date.now(),
      terminalAvailable: runtime?.canStop(record.id) ?? false,
    }),
  );
};

export const createShellSessionRouter = routerFactory(
  (deps: SessionRouterDeps) =>
    router({
      shells: publicProcedure
        .input(SessionShellsInput)
        .output(SessionShellsOutput)
        .query(({ input }) => listShells(deps, input.sessionId)),
    }),
);

export const createShellRouter = routerFactory(
  (deps: SessionRouterDeps & { blobsFolder: string }) =>
    router({
      output: publicProcedure
        .input(ShellOutputInput)
        .output(zAsyncIterable({ yield: ShellOutput }))
        .subscription(({ input, signal }) =>
          watchShellOutput(deps, input, signal),
        ),
    }),
);
