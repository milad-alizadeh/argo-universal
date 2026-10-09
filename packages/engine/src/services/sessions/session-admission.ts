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

export function requirePermissionAnswer(
  actor: SessionActorRef,
  input: SessionAnswerPermissionInput,
): void {
  const snapshot = actor.getSnapshot();
  const request = snapshot.context.permissionQueue[0];
  if (request?.toolCallId !== input.toolCallId)
    throw new TRPCError({ code: 'CONFLICT', message: alreadyAnswered });
  if (
    !request.options.some(
      (option): boolean => option.optionId === input.optionId,
    )
  )
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'The Agent did not offer that option',
    });
  if (
    input.optionId === 'reject_once' &&
    input.message &&
    snapshot.context.capabilities?.permissionFeedback !== true
  )
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'The Agent does not support Permission feedback',
    });
}

export function requireElicitationAnswer(
  actor: SessionActorRef,
  input: SessionAnswerElicitationInput,
): void {
  const request = actor.getSnapshot().context.pendingElicitation;
  if (request?.requestId !== input.requestId)
    throw new TRPCError({ code: 'CONFLICT', message: alreadyAnswered });
  if (input.action !== 'accept') return;
  const answer = createElicitationAnswerSchema(
    request.requestedSchema,
  ).safeParse(input.content ?? {});
  if (!answer.success)
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'The answer does not match the Elicitation form',
      cause: answer.error,
    });
}

export function requireConfigChoice(
  actor: SessionActorRef,
  input: SessionSetConfigOptionInput,
): void {
  const option = actor
    .getSnapshot()
    .context.configOptions.find(
      (option): boolean => option.configId === input.configId,
    );
  const allowed =
    option?.type === 'boolean'
      ? typeof input.value === 'boolean'
      : option?.options
          .flatMap((choice): SessionConfigSelectOption[] =>
            'groupId' in choice ? choice.options : [choice],
          )
          .some((choice): boolean => choice.value === input.value);
  if (!allowed)
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `The Agent did not offer ${input.configId}=${String(input.value)}`,
    });
}
