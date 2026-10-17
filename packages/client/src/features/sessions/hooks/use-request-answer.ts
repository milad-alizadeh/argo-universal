import type { UseMutationResult } from '@tanstack/react-query';
import { useCallback, useRef, type RefObject } from 'react';
import type { ClientError } from '#features/connection';
import type { RequestState } from '#features/requests';

// Which Session and request an answer settles.
interface AnswerIdentity {
  sessionId: string;
  requestId: string;
}

export type AnswerMutation<Answer> = UseMutationResult<
  unknown,
  ClientError,
  AnswerIdentity & Answer
>;

type Answering = RefObject<string | null>;

type Submit<Answer> = (input: AnswerIdentity & Answer) => void;

export interface SessionRequest<Request> {
  sessionId: string;
  request: Request | null | undefined;
}

// What a request card needs to answer the Agent's open request.
export interface RequestAnswer<Request, Answer> {
  request: Request;
  state: RequestState;
  error?: string;
  onAnswer: (answer: Answer) => void;
}

type OpenRequest<Request> = SessionRequest<Request> & { request: Request };

// The Agent's open request with its answer's progress; gone once the Server settles it.
export function useRequestAnswer<Request extends { requestId: string }, Answer>(
  props: SessionRequest<Request>,
  mutation: AnswerMutation<Answer>,
): RequestAnswer<Request, Answer> | undefined {
  const submit = useSubmitAnswer(mutation);

  if (!props.request) return undefined;

  return requestAnswer({ ...props, request: props.request }, mutation, submit);
}

function requestAnswer<Request extends { requestId: string }, Answer>(
  props: OpenRequest<Request>,
  mutation: AnswerMutation<Answer>,
  submit: Submit<Answer>,
): RequestAnswer<Request, Answer> | undefined {
  const status = currentRequest(mutation, props.request.requestId);

  if (isResolved(status)) return undefined;

  return {
    request: props.request,
    state: answerState(status),
    error: answerError(status),
    onAnswer: (answer) => submit({ ...identity(props), ...answer }),
  };
}

const identity = <Request extends { requestId: string }>({
  sessionId,
  request,
}: OpenRequest<Request>): AnswerIdentity => ({
  sessionId,
  requestId: request.requestId,
});

function answerState<Answer>(
  status: AnswerMutation<Answer> | undefined,
): RequestState {
  return status?.isPending ? { kind: 'submitting' } : { kind: 'open' };
}

function answerError<Answer>(
  status: AnswerMutation<Answer> | undefined,
): string | undefined {
  return status?.error?.message;
}

function currentRequest<Answer>(
  mutation: AnswerMutation<Answer>,
  requestId: string,
): AnswerMutation<Answer> | undefined {
  if (mutation.variables?.requestId !== requestId) return undefined;

  return mutation;
}

function useSubmitAnswer<Answer>(
  mutation: AnswerMutation<Answer>,
): Submit<Answer> {
  const answering = useRef<string | null>(null);
  const mutate = mutation.mutate;

  return useCallback((input) => sendAnswer(input, mutate, answering), [mutate]);
}

// One answer per request: a second tap while the first is in flight sends nothing.
function sendAnswer<Answer>(
  input: AnswerIdentity & Answer,
  mutate: AnswerMutation<Answer>['mutate'],
  answering: Answering,
): void {
  if (answering.current === input.requestId) return;
  answering.current = input.requestId;
  mutate(input, { onSettled: () => releaseAnswer(answering, input.requestId) });
}

function releaseAnswer(answering: Answering, requestId: string): void {
  if (answering.current === requestId) answering.current = null;
}

// Answered, or already settled elsewhere: the Server says CONFLICT.
function isResolved<Answer>(
  status: AnswerMutation<Answer> | undefined,
): boolean {
  if (!status) return false;

  return status.isSuccess || isConflict(status.error);
}

function isConflict(error: ClientError | null): boolean {
  return error?.data?.code === 'CONFLICT';
}
