import type {
  SessionStopShellInput,
  SessionStopShellOutput,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import type { OpenSessions } from '../open-sessions';
import { requireShell } from './output-reader';

export const stopShell = (
  open: OpenSessions,
  input: SessionStopShellInput,
): SessionStopShellOutput => {
  open.admit();
  const record = requireShell(open.database, input);
  const runtime = open.live(input.sessionId).getSnapshot().context.shellRuntime;

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
