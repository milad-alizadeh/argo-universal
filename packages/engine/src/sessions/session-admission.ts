import { createElicitationAnswerSchema } from '@repo/contracts';
import type {
  PendingElicitation,
  SessionAnswerPermissionInput,
  SessionAnswerElicitationInput,
  SessionSetConfigOptionInput,
  SessionConfigOption,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import type {
  ElicitationAnswerContent,
  ElicitationAnswerValue,
} from './acp/elicitation-types';
import { answeredRequest, chosenOption } from './admission/answer-admission';
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

  if (answer.message)
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'The Agent does not support Permission feedback',
    });
}

type ElicitationAnswer = Pick<
  SessionAnswerElicitationInput,
  'requestId' | 'action' | 'content'
>;

const pendingElicitation = (
  sessionActor: SessionActorRef | undefined,
  requestId: string,
): PendingElicitation => {
  const request = answeredRequest(
    sessionActor?.getSnapshot().context.elicitationQueue ?? [],
    requestId,
  );

  if (!request)
    throw new TRPCError({ code: 'CONFLICT', message: alreadyAnswered });

  return request;
};

export function validateElicitationAnswer(
  sessionActor: SessionActorRef | undefined,
  answer: ElicitationAnswer,
): asserts sessionActor is SessionActorRef {
  pendingElicitation(sessionActor, answer.requestId);
}

// Skipped questions stay absent from the content the Agent receives.
const answeredFields = (
  fields: Record<string, ElicitationAnswerValue | undefined>,
): ElicitationAnswerContent => {
  const content: ElicitationAnswerContent = {};

  for (const [name, value] of Object.entries(fields))
    if (value !== undefined) content[name] = value;

  return content;
};

// Parses an accepted answer against the pending request's form; other actions carry no content.
export const acceptedElicitationContent = (
  sessionActor: SessionActorRef,
  answer: ElicitationAnswer,
): ElicitationAnswerContent | undefined => {
  if (answer.action !== 'accept') return undefined;
  const request = pendingElicitation(sessionActor, answer.requestId);

  const parsedAnswer = createElicitationAnswerSchema(
    request.requestedSchema,
  ).safeParse(answer.content ?? {});

  if (!parsedAnswer.success)
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'The answer does not match the Elicitation form',
      cause: parsedAnswer.error,
    });

  return answeredFields(parsedAnswer.data);
};

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
