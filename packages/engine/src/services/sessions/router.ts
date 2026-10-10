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
import { findMachineActor } from '../../lib/machine-actor';
import { publicProcedure, routerFactory, zAsyncIterable } from '../../rpc';
import { userMessageId } from '../feed';
import type { SessionRouterDeps } from './router-deps';
import {
  validatePermissionAnswer,
  validateElicitationAnswer,
} from './session-admission';
import { closeSession } from './session-closure';
import {
  sendSessionCommand,
  submitSessionPrompt,
  validateSessionCommandAdmission,
} from './session-command';
import { configureSession } from './session-configuration';
import { createSession } from './session-creation';
import { createSessionList } from './session-list';
import { sessionMachine } from './session-machine';
import { openReadySession } from './session-opening';
import { requireLiveSessionActor } from './session-system';
import { sessionActorId } from './session-system';

export const createSessionRouter = routerFactory((deps: SessionRouterDeps) => {
  const sessionList = createSessionList(deps);
  return {
    list: publicProcedure
      .input(SessionListInput)
      .output(SessionListOutput)
      .query(({ input }): Promise<SessionListOutput> =>
        sessionList.list(input),
      ),
    listUpdates: publicProcedure
      .output(zAsyncIterable({ yield: SessionListUpdate }))
      .subscription(async function* ({
        signal,
      }): AsyncGenerator<SessionListUpdate, void> {
        yield* sessionList.listUpdates(signal);
      }),
    counts: publicProcedure
      .output(zAsyncIterable({ yield: SessionCounts }))
      .subscription(async function* ({
        signal,
      }): AsyncGenerator<SessionCounts, void> {
        yield* sessionList.counts(signal);
      }),
    new: publicProcedure
      .input(SessionNewInput)
      .output(SessionNewOutput)
      .mutation(({ input }): Promise<SessionNewOutput> =>
        createSession(deps, input),
      ),
    prompt: publicProcedure
      .input(SessionPromptInput)
      .output(SessionPromptOutput)
      .mutation(async ({ input }): Promise<SessionPromptOutput> => {
        const sessionActor = await openReadySession(deps, input.sessionId);
        const turnId = deps.createId();
        validateSessionCommandAdmission(deps);
        await submitSessionPrompt(sessionActor, {
          turnId,
          content: input.prompt,
        });
        return { messageId: userMessageId(turnId) };
      }),
    close: publicProcedure
      .input(SessionCloseInput)
      .output(SessionCloseOutput)
      .mutation(({ input }): Promise<SessionCloseOutput> =>
        closeSession(deps, input.sessionId),
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
      .mutation(({ input }): SessionCancelOutput => {
        validateSessionCommandAdmission(deps);
        sendSessionCommand(
          requireLiveSessionActor(deps.sessions.system, input.sessionId),
          {
            type: 'session.cancel',
          },
        );
        return {};
      }),
    setConfigOption: publicProcedure
      .input(SessionSetConfigOptionInput)
      .output(SessionSetConfigOptionOutput)
      .mutation(({ input }): Promise<SessionSetConfigOptionOutput> =>
        configureSession(deps, input),
      ),
    answerPermission: publicProcedure
      .input(SessionAnswerPermissionInput)
      .output(SessionAnswerPermissionOutput)
      .mutation(({ input }): SessionAnswerPermissionOutput => {
        validateSessionCommandAdmission(deps);
        const sessionActor = findMachineActor(
          deps.sessions.system,
          sessionActorId(input.sessionId),
          sessionMachine,
        );
        validatePermissionAnswer(sessionActor, input);
        sendSessionCommand(sessionActor, {
          type: 'session.answerPermission',
          requestId: input.requestId,
          optionId: input.optionId,
          message: input.message,
        });
        return {};
      }),
    answerElicitation: publicProcedure
      .input(SessionAnswerElicitationInput)
      .output(SessionAnswerElicitationOutput)
      .mutation(({ input }): SessionAnswerElicitationOutput => {
        validateSessionCommandAdmission(deps);
        const sessionActor = findMachineActor(
          deps.sessions.system,
          sessionActorId(input.sessionId),
          sessionMachine,
        );
        validateElicitationAnswer(sessionActor, input);
        sendSessionCommand(sessionActor, {
          type: 'session.answerElicitation',
          requestId: input.requestId,
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
  };
});

function rejectUnimplementedProcedure(
  message = 'This procedure is not implemented yet',
): never {
  throw new TRPCError({ code: 'NOT_IMPLEMENTED', message });
}
