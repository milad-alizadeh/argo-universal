import {
  SessionChangesInput,
  SessionChangesOutput,
  SessionDiffInput,
  SessionDiffOutput,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { publicProcedure, router } from '../rpc';

function rejectUnimplementedProcedure(): never {
  throw new TRPCError({
    code: 'NOT_IMPLEMENTED',
    message: 'This procedure is not implemented yet',
  });
}

// The Session procedures the App already names, before the Engine answers them.
export const unimplementedSessionRouter = router({
  changes: publicProcedure
    .input(SessionChangesInput)
    .output(SessionChangesOutput)
    .query((): never => rejectUnimplementedProcedure()),
  diff: publicProcedure
    .input(SessionDiffInput)
    .output(SessionDiffOutput)
    .query((): never => rejectUnimplementedProcedure()),
});
