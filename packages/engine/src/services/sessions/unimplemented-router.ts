import {
  SessionAnswerPlanProposalInput,
  SessionAnswerPlanProposalOutput,
  SessionChangesInput,
  SessionChangesOutput,
  SessionDiffInput,
  SessionDiffOutput,
  SessionRenameInput,
  SessionRenameOutput,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { publicProcedure, router } from '../../rpc';

function rejectUnimplementedProcedure(
  message = 'This procedure is not implemented yet',
): never {
  throw new TRPCError({ code: 'NOT_IMPLEMENTED', message });
}

// The Session procedures the App already names, before the Engine answers them.
export const unimplementedSessionRouter = router({
  rename: publicProcedure
    .input(SessionRenameInput)
    .output(SessionRenameOutput)
    .mutation((): never =>
      rejectUnimplementedProcedure('Session rename is not implemented yet'),
    ),
  answerPlanProposal: publicProcedure
    .input(SessionAnswerPlanProposalInput)
    .output(SessionAnswerPlanProposalOutput)
    .mutation((): never =>
      rejectUnimplementedProcedure(
        'Plan proposal answers are not implemented yet',
      ),
    ),
  changes: publicProcedure
    .input(SessionChangesInput)
    .output(SessionChangesOutput)
    .query((): never => rejectUnimplementedProcedure()),
  diff: publicProcedure
    .input(SessionDiffInput)
    .output(SessionDiffOutput)
    .query((): never => rejectUnimplementedProcedure()),
});
