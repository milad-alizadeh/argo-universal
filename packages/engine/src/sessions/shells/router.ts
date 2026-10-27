import {
  SessionShellsInput,
  SessionShellsOutput,
  SessionStopShellInput,
  SessionStopShellOutput,
  ShellOutput,
  ShellOutputInput,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import {
  mergeRouters,
  publicProcedure,
  router,
  routerFactory,
  zAsyncIterable,
} from '../../rpc';
import type { SessionRouterDeps } from '../router-deps';
import { validateSessionCommandAdmission } from '../session-command';
import { requireLiveSessionActor } from '../session-system';
import { watchShellOutput } from './output';
import { requireShell } from './output-reader';
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

const stopShell = (
  deps: SessionRouterDeps,
  input: SessionStopShellInput,
): SessionStopShellOutput => {
  validateSessionCommandAdmission(deps);
  const record = requireShell(deps.database, input);
  const actor = requireLiveSessionActor(deps.sessions.system, input.sessionId);
  const runtime = actor.getSnapshot().context.shellRuntime;

  requireStoppable(runtime.canStop(record.id));
  runtime.stop(input.shellId);

  return {};
};

const createShellListRouter = routerFactory((deps: SessionRouterDeps) =>
  router({
    shells: publicProcedure
      .input(SessionShellsInput)
      .output(SessionShellsOutput)
      .query(({ input }) => listShells(deps, input.sessionId)),
  }),
);

const createShellStopRouter = routerFactory((deps: SessionRouterDeps) =>
  router({
    stopShell: publicProcedure
      .input(SessionStopShellInput)
      .output(SessionStopShellOutput)
      .mutation(({ input }) => stopShell(deps, input)),
  }),
);

export const createShellSessionRouter = routerFactory(
  (deps: SessionRouterDeps) =>
    mergeRouters(createShellListRouter(deps), createShellStopRouter(deps)),
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

const requireStoppable = (canStop: boolean): void => {
  if (!canStop)
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'Shell cannot be stopped',
    });
};
