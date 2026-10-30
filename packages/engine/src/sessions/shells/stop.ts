import type {
  SessionStopShellInput,
  SessionStopShellOutput,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import type { HandlerSources } from '../session-sources';
import { requireShell } from './output-reader';

type StopSources = HandlerSources<'database', 'admit' | 'live'>;

export const stopShell = (
  sources: StopSources,
  input: SessionStopShellInput,
): SessionStopShellOutput => {
  sources.open.admit();

  const record = requireShell(sources.database, input);

  const runtime = sources.open.live(input.sessionId).getSnapshot()
    .context.shellRuntime;

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
