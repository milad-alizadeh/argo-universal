import {
  SessionAnswerElicitationInput,
  SessionAnswerElicitationOutput,
  SessionAnswerPermissionInput,
  SessionAnswerPermissionOutput,
  SessionAnswerPlanProposalInput,
  SessionAnswerPlanProposalOutput,
  SessionCancelInput,
  SessionCancelOutput,
  SessionCloseInput,
  SessionCloseOutput,
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
import { TRPCError } from '@trpc/server';
import { publicProcedure, router, zAsyncIterable } from '../../engine/trpc';
import { userMessageId } from '../feed';
import {
  validatePermissionAnswer,
  validateElicitationAnswer,
  validateConfigChoice,
} from './session-admission';
import { closeSession } from './session-closure';
import {
  sendSessionCommand,
  validateSessionCommandAdmission,
} from './session-command';
import { createSession } from './session-creation';
import { openReadySession } from './session-opening';
import { findSessionActor, requireLiveSessionActor } from './session-system';

export const sessionRouter = router({
  list: publicProcedure
    .input(SessionListInput)
    .output(SessionListOutput)
    .query(({ ctx, input }): Promise<SessionListOutput> =>
      ctx.sessionList.list(input),
    ),
  listUpdates: publicProcedure
    .output(zAsyncIterable({ yield: SessionListUpdate }))
    .subscription(async function* ({
      ctx,
      signal,
    }): AsyncGenerator<SessionListUpdate, void> {
      yield* ctx.sessionList.listUpdates(signal);
    }),
  counts: publicProcedure
    .output(zAsyncIterable({ yield: SessionCounts }))
    .subscription(async function* ({
      ctx,
      signal,
    }): AsyncGenerator<SessionCounts, void> {
      yield* ctx.sessionList.counts(signal);
    }),
  new: publicProcedure
    .input(SessionNewInput)
    .output(SessionNewOutput)
    .mutation(({ ctx, input }): Promise<SessionNewOutput> =>
      createSession(ctx, input),
    ),
  prompt: publicProcedure
    .input(SessionPromptInput)
    .output(SessionPromptOutput)
    .mutation(async ({ ctx, input }): Promise<SessionPromptOutput> => {
      const sessionActor = await openReadySession(ctx, input.sessionId);
      const turnId = ctx.createId();
      validateSessionCommandAdmission(ctx);
      sendSessionCommand(sessionActor, {
        type: 'session.prompt',
        turnId,
        content: input.prompt,
      });
      return { messageId: userMessageId(turnId) };
    }),
  close: publicProcedure
    .input(SessionCloseInput)
    .output(SessionCloseOutput)
    .mutation(({ ctx, input }): Promise<SessionCloseOutput> =>
      closeSession(ctx, input.sessionId),
    ),
  rename: publicProcedure
    .input(SessionRenameInput)
    .output(SessionRenameOutput)
    .mutation((): never =>
      rejectUnimplementedProcedure('Session rename is not implemented yet'),
    ),
  cancel: publicProcedure
    .input(SessionCancelInput)
    .output(SessionCancelOutput)
    .mutation(({ ctx, input }): SessionCancelOutput => {
      validateSessionCommandAdmission(ctx);
      sendSessionCommand(
        requireLiveSessionActor(ctx.sessions.system, input.sessionId),
        {
          type: 'session.cancel',
        },
      );
      return {};
    }),
  setConfigOption: publicProcedure
    .input(SessionSetConfigOptionInput)
    .output(SessionSetConfigOptionOutput)
    .mutation(async ({ ctx, input }): Promise<SessionSetConfigOptionOutput> => {
      const sessionActor = await openReadySession(
        ctx,
        input.sessionId,
        'session.setConfigOption',
      );
      validateConfigChoice(sessionActor, input);
      validateSessionCommandAdmission(ctx);
      sendSessionCommand(sessionActor, {
        type: 'session.setConfigOption',
        configId: input.configId,
        value: input.value,
      });
      return {
        configOptions: sessionActor.getSnapshot().context.configOptions,
      };
    }),
  answerPermission: publicProcedure
    .input(SessionAnswerPermissionInput)
    .output(SessionAnswerPermissionOutput)
    .mutation(({ ctx, input }): SessionAnswerPermissionOutput => {
      validateSessionCommandAdmission(ctx);
      const sessionActor = findSessionActor(
        ctx.sessions.system,
        input.sessionId,
      );
      validatePermissionAnswer(sessionActor, input);
      sendSessionCommand(sessionActor, {
        type: 'session.answerPermission',
        toolCallId: input.toolCallId,
        optionId: input.optionId,
        message: input.message,
      });
      return {};
    }),
  answerElicitation: publicProcedure
    .input(SessionAnswerElicitationInput)
    .output(SessionAnswerElicitationOutput)
    .mutation(({ ctx, input }): SessionAnswerElicitationOutput => {
      validateSessionCommandAdmission(ctx);
      const sessionActor = findSessionActor(
        ctx.sessions.system,
        input.sessionId,
      );
      validateElicitationAnswer(sessionActor, input);
      sendSessionCommand(sessionActor, {
        type: 'session.answerElicitation',
        action: input.action,
        content: input.content,
      });
      return {};
    }),
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

function rejectUnimplementedProcedure(
  message = 'This procedure is not implemented yet',
): never {
  throw new TRPCError({ code: 'NOT_IMPLEMENTED', message });
}
