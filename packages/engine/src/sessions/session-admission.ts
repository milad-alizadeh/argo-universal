import { createElicitationAnswerSchema } from '@repo/contracts';
import type {
  SessionAnswerPermissionInput,
  SessionAnswerElicitationInput,
  SessionSetConfigOptionInput,
  SessionConfigOption,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import {
  answeredRequest,
  canDeliverFeedback,
  chosenOption,
} from './admission/answer-admission';
import { isOfferedConfigChoice } from './admission/config-admission';
import type { SessionActorRef } from './session-machine';

const alreadyAnswered = 'already answered';

export function validatePermissionAnswer(
  sessionActor: SessionActorRef | undefined,
  answer: Pick<
    SessionAnswerPermissionInput,
    'requestId' | 'optionId' | 'message'
  >,
): asserts sessionActor is SessionActorRef {
  const context = sessionActor?.getSnapshot().context;
  const request = answeredRequest(
    context?.permissionQueue ?? [],
    answer.requestId,
  );
  if (!request)
    throw new TRPCError({ code: 'CONFLICT', message: alreadyAnswered });
  const option = chosenOption(request, answer.optionId);
  if (!option)
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'The Agent did not offer that option',
    });
  if (
    answer.message &&
    !canDeliverFeedback(context?.capabilities ?? null, option)
  )
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'The Agent does not support Permission feedback',
    });
}

export function validateElicitationAnswer(
  sessionActor: SessionActorRef | undefined,
  answer: Pick<
    SessionAnswerElicitationInput,
    'requestId' | 'action' | 'content'
  >,
): asserts sessionActor is SessionActorRef {
  const request = answeredRequest(
    sessionActor?.getSnapshot().context.elicitationQueue ?? [],
    answer.requestId,
  );
  if (!request)
    throw new TRPCError({ code: 'CONFLICT', message: alreadyAnswered });
  if (answer.action !== 'accept') return;
  const parsedAnswer = createElicitationAnswerSchema(
    request.requestedSchema,
  ).safeParse(answer.content ?? {});
  if (!parsedAnswer.success)
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'The answer does not match the Elicitation form',
      cause: parsedAnswer.error,
    });
}

export function validateConfigChoice(
  configOptions: SessionConfigOption[],
  configChoice: Pick<SessionSetConfigOptionInput, 'configId' | 'value'>,
): void {
  if (!isOfferedConfigChoice(configOptions, configChoice))
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `The Agent did not offer ${configChoice.configId}=${String(configChoice.value)}`,
    });
}
