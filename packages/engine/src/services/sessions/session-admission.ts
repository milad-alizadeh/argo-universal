import { createElicitationAnswerSchema } from '@repo/contracts';
import type {
  SessionAnswerPermissionInput,
  SessionAnswerElicitationInput,
  SessionSetConfigOptionInput,
  SessionConfigSelectOption,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import type { SessionActorRef } from './session-machine';

const alreadyAnswered = 'already answered';

export function validatePermissionAnswer(
  sessionActor: SessionActorRef | undefined,
  answer: Pick<
    SessionAnswerPermissionInput,
    'toolCallId' | 'optionId' | 'message'
  >,
): asserts sessionActor is SessionActorRef {
  const sessionSnapshot = sessionActor?.getSnapshot();
  const request = sessionSnapshot?.context.permissionQueue[0];
  if (request?.toolCallId !== answer.toolCallId)
    throw new TRPCError({ code: 'CONFLICT', message: alreadyAnswered });
  if (
    !request.options.some(
      (option): boolean => option.optionId === answer.optionId,
    )
  )
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'The Agent did not offer that option',
    });
  if (
    answer.optionId === 'reject_once' &&
    answer.message &&
    sessionSnapshot?.context.capabilities?.permissionFeedback !== true
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
  const request = sessionActor?.getSnapshot().context.pendingElicitation;
  if (request?.requestId !== answer.requestId)
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
  sessionActor: SessionActorRef,
  configChoice: Pick<SessionSetConfigOptionInput, 'configId' | 'value'>,
): void {
  const option = sessionActor
    .getSnapshot()
    .context.configOptions.find(
      (option): boolean => option.configId === configChoice.configId,
    );
  const isOfferedChoice =
    option?.type === 'boolean'
      ? typeof configChoice.value === 'boolean'
      : option?.options
          .flatMap((choice): SessionConfigSelectOption[] =>
            'groupId' in choice ? choice.options : [choice],
          )
          .some((choice): boolean => choice.value === configChoice.value);
  if (!isOfferedChoice)
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `The Agent did not offer ${configChoice.configId}=${String(configChoice.value)}`,
    });
}
