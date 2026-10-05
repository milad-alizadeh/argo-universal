import {
  SessionCancelInput,
  SessionCancelOutput,
  SessionNewInput,
  SessionNewOutput,
  SessionPromptInput,
  SessionPromptOutput,
  SessionSetConfigOptionInput,
  SessionSetConfigOptionOutput,
} from '@repo/contracts';
import { publicProcedure, router } from '../trpc';

export const sessionRouter = router({
  new: publicProcedure
    .input(SessionNewInput)
    .output(SessionNewOutput)
    .mutation(({ ctx, input }) => ctx.services.session.new(input)),
  prompt: publicProcedure
    .input(SessionPromptInput)
    .output(SessionPromptOutput)
    .mutation(({ ctx, input }) => ctx.services.session.prompt(input)),
  cancel: publicProcedure
    .input(SessionCancelInput)
    .output(SessionCancelOutput)
    .mutation(({ ctx, input }) => ctx.services.session.cancel(input)),
  setConfigOption: publicProcedure
    .input(SessionSetConfigOptionInput)
    .output(SessionSetConfigOptionOutput)
    .mutation(({ ctx, input }) => ctx.services.session.setConfigOption(input)),
});
