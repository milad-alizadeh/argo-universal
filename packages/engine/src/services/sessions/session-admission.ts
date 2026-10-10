import { createElicitationAnswerSchema } from '@repo/contracts';
import type {
  PermissionOption,
  SessionAnswerPermissionInput,
  SessionAnswerElicitationInput,
  SessionSetConfigOptionInput,
  SessionConfigSelectOption,
  SessionConfigOption,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import type { SessionActorRef } from './session-machine';

const alreadyAnswered = 'already answered';

// Only a rejection carries feedback, and only to an Agent that reads it.
const canDeliverFeedback = (
  sessionSnapshot: ReturnType<SessionActorRef['getSnapshot']> | undefined,
  option: PermissionOption,
): boolean =>
  option.kind.startsWith('reject') &&
  sessionSnapshot?.context.capabilities?.permissionFeedback === true;

export function validatePermissionAnswer(
  sessionActor: SessionActorRef | undefined,
  answer: Pick<
    SessionAnswerPermissionInput,
    'requestId' | 'optionId' | 'message'
  >,
): asserts sessionActor is SessionActorRef {
  const sessionSnapshot = sessionActor?.getSnapshot();
  const request = sessionSnapshot?.context.permissionQueue[0];
  if (request?.requestId !== answer.requestId)
    throw new TRPCError({ code: 'CONFLICT', message: alreadyAnswered });
  const option = request.options.find(
    (candidate): boolean => candidate.optionId === answer.optionId,
  );
  if (!option)
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'The Agent did not offer that option',
    });
  if (answer.message && !canDeliverFeedback(sessionSnapshot, option))
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
  const request = sessionActor?.getSnapshot().context.elicitationQueue[0];
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
  configOptions: SessionConfigOption[],
  configChoice: Pick<SessionSetConfigOptionInput, 'configId' | 'value'>,
): void {
  const option = configOptions.find(
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
