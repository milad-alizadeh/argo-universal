import {
  SessionAnswerElicitationInput,
  SessionAnswerElicitationOutput,
  SessionAnswerPermissionInput,
  SessionAnswerPermissionOutput,
  SessionAnswerPlanProposalInput,
  SessionAnswerPlanProposalOutput,
  SessionCancelInput,
  SessionCancelOutput,
  SessionChangesInput,
  SessionChangesOutput,
  SessionCounts,
  SessionDiffInput,
  SessionDiffOutput,
  SessionListInput,
  SessionListOutput,
  SessionListUpdate,
  SessionNewInput,
  SessionNewOutput,
  SessionPromptInput,
  SessionPromptOutput,
  SessionRenameInput,
  SessionRenameOutput,
  SessionSetConfigOptionInput,
  SessionSetConfigOptionOutput,
} from '@repo/contracts';
import { publicProcedure, router, zAsyncIterable } from '../trpc';

export const sessionRouter = router({
  list: publicProcedure
    .input(SessionListInput)
    .output(SessionListOutput)
    .query(({ ctx, input }) => ctx.services.session.list(input)),
  listUpdates: publicProcedure
    .output(zAsyncIterable({ yield: SessionListUpdate }))
    .subscription(async function* ({ ctx, signal }) {
      yield* ctx.services.session.listUpdates(signal);
    }),
  counts: publicProcedure
    .output(zAsyncIterable({ yield: SessionCounts }))
    .subscription(async function* ({ ctx, signal }) {
      yield* ctx.services.session.counts(signal);
    }),
  new: publicProcedure
    .input(SessionNewInput)
    .output(SessionNewOutput)
    .mutation(({ ctx, input }) => ctx.services.session.new(input)),
  prompt: publicProcedure
    .input(SessionPromptInput)
    .output(SessionPromptOutput)
    .mutation(({ ctx, input }) => ctx.services.session.prompt(input)),
  rename: publicProcedure
    .input(SessionRenameInput)
    .output(SessionRenameOutput)
    .mutation(({ ctx, input }) => ctx.services.session.rename(input)),
  cancel: publicProcedure
    .input(SessionCancelInput)
    .output(SessionCancelOutput)
    .mutation(({ ctx, input }) => ctx.services.session.cancel(input)),
  setConfigOption: publicProcedure
    .input(SessionSetConfigOptionInput)
    .output(SessionSetConfigOptionOutput)
    .mutation(({ ctx, input }) => ctx.services.session.setConfigOption(input)),
  answerPermission: publicProcedure
    .input(SessionAnswerPermissionInput)
    .output(SessionAnswerPermissionOutput)
    .mutation(({ ctx, input }) => ctx.services.session.answerPermission(input)),
  answerElicitation: publicProcedure
    .input(SessionAnswerElicitationInput)
    .output(SessionAnswerElicitationOutput)
    .mutation(({ ctx, input }) =>
      ctx.services.session.answerElicitation(input),
    ),
  answerPlanProposal: publicProcedure
    .input(SessionAnswerPlanProposalInput)
    .output(SessionAnswerPlanProposalOutput)
    .mutation(({ ctx, input }) =>
      ctx.services.session.answerPlanProposal(input),
    ),
  changes: publicProcedure
    .input(SessionChangesInput)
    .output(SessionChangesOutput)
    .query(({ ctx, input }) => ctx.services.session.changes(input)),
  diff: publicProcedure
    .input(SessionDiffInput)
    .output(SessionDiffOutput)
    .query(({ ctx, input }) => ctx.services.session.diff(input)),
});
