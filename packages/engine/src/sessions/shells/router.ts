import {
  SessionShellsInput,
  SessionShellsOutput,
  SessionStopShellInput,
  SessionStopShellOutput,
  ShellOutput,
  ShellOutputInput,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { publicProcedure, router, zAsyncIterable } from '../../rpc';

// #89 supplies terminal ownership, persistence and output; no capability is advertised yet.
const unavailable = (): never => {
  throw new TRPCError({
    code: 'NOT_IMPLEMENTED',
    message: 'Shell runtime is not implemented yet',
  });
};

export const shellSessionRouter = router({
  shells: publicProcedure
    .input(SessionShellsInput)
    .output(SessionShellsOutput)
    .query(unavailable),
  stopShell: publicProcedure
    .input(SessionStopShellInput)
    .output(SessionStopShellOutput)
    .mutation(unavailable),
});

export const shellRouter = router({
  output: publicProcedure
    .input(ShellOutputInput)
    .output(zAsyncIterable({ yield: ShellOutput }))
    .subscription((): AsyncIterable<ShellOutput> => unavailable()),
});
