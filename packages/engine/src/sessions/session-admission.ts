import { createElicitationAnswerSchema } from '@repo/contracts';
import type {
  PendingElicitation,
  PendingPermission,
  SessionAnswerPermissionInput,
  SessionAnswerElicitationInput,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import type { ZodError } from 'zod';
import type {
  ElicitationAnswerContent,
  ElicitationAnswerValue,
} from './acp/requests/elicitation-types';
import { answeredRequest, chosenOption } from './admission/answer-admission';
import type { SessionActorRef } from './session-machine';

const alreadyAnswered = 'already answered';

const permissionQueue = (
  actor: SessionActorRef | undefined,
): PendingPermission[] => actor?.getSnapshot().context.permissionQueue ?? [];

const elicitationQueue = (
  actor: SessionActorRef | undefined,
): PendingElicitation[] => actor?.getSnapshot().context.elicitationQueue ?? [];

const answeredError = (): TRPCError =>
  new TRPCError({ code: 'CONFLICT', message: alreadyAnswered });

const unofferedOption = (): TRPCError =>
  new TRPCError({
    code: 'BAD_REQUEST',
    message: 'The Agent did not offer that option',
  });

function pendingPermission(
  actor: SessionActorRef | undefined,
  requestId: string,
): PendingPermission {
  const request = answeredRequest(permissionQueue(actor), requestId);

  if (!request) throw answeredError();

  return request;
}

export function validatePermissionAnswer(
  sessionActor: SessionActorRef | undefined,
  answer: Pick<SessionAnswerPermissionInput, 'requestId' | 'optionId'>,
): asserts sessionActor is SessionActorRef {
  const request = pendingPermission(sessionActor, answer.requestId);
  const option = chosenOption(request, answer.optionId);

  if (!option) throw unofferedOption();
}

type ElicitationAnswer = Pick<
  SessionAnswerElicitationInput,
  'requestId' | 'action' | 'content'
>;

const pendingElicitation = (
  sessionActor: SessionActorRef | undefined,
  requestId: string,
): PendingElicitation => {
  const request = answeredRequest(elicitationQueue(sessionActor), requestId);

  if (!request) throw answeredError();

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

const invalidElicitation = (cause: ZodError): TRPCError =>
  new TRPCError({
    code: 'BAD_REQUEST',
    message: 'The answer does not match the Elicitation form',
    cause,
  });

function parseElicitation(
  request: PendingElicitation,
  answer: ElicitationAnswer,
): ElicitationAnswerContent {
  const parsed = createElicitationAnswerSchema(
    request.requestedSchema,
  ).safeParse(answer.content ?? {});

  if (!parsed.success) throw invalidElicitation(parsed.error);

  return answeredFields(parsed.data);
}

// Parses an accepted answer against the pending request's form; other actions carry no content.
export const acceptedElicitationContent = (
  sessionActor: SessionActorRef,
  answer: ElicitationAnswer,
): ElicitationAnswerContent | undefined => {
  if (answer.action !== 'accept') return undefined;
  const request = pendingElicitation(sessionActor, answer.requestId);

  return parseElicitation(request, answer);
};
