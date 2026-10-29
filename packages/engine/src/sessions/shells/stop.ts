import type {
  SessionStopShellInput,
  SessionStopShellOutput,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import type { SessionRouterDeps } from '../router-deps';
import { validateSessionCommandAdmission } from '../session-command';
import { requireLiveSessionActor } from '../session-system';
import { requireShell } from './output-reader';

export const stopShell = (
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

const requireStoppable = (canStop: boolean): void => {
  if (!canStop)
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'Shell cannot be stopped',
    });
};
