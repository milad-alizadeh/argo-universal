import type { UseMutationResult } from '@tanstack/react-query';
import { useCallback, useRef, useState, type RefObject } from 'react';
import type { ClientError } from '#features/connection';
import type { RequestState } from '#features/requests';

// Which Session and request an answer settles.
interface AnswerIdentity {
  sessionId: string;
  requestId: string;
}

type AnswerMutation<Answer> = UseMutationResult<
  unknown,
  ClientError,
  AnswerIdentity & Answer
>;

type Answering = RefObject<string | null>;

type Submit<Answer> = (input: AnswerIdentity & Answer) => void;

export interface SessionRequest<Request> {
  sessionId: string;
  request: Request | null | undefined;
  // The running Turn, which keeps a late answer's card until it ends.
  turnId: string | null | undefined;
}

// The request this App answered, and the Turn it was answered in.
interface Sent<Request> {
  request: Request;
  turnId: string;
}

const answeredElsewhere = 'Already answered on another device';

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
  const [sent, setSent] = useSentRequest(props.request);
  const request = props.request ?? lateRequest(sent, mutation, props.turnId);

  if (!request) return undefined;

  return requestAnswer({ ...props, request }, mutation, (input) => {
    if (props.turnId) setSent({ request, turnId: props.turnId });
    submit(input);
  });
}

function useSentRequest<Request extends { requestId: string }>(
  open: Request | null | undefined,
): [Sent<Request> | undefined, (sent: Sent<Request> | undefined) => void] {
  const [sent, setSent] = useState<Sent<Request>>();

  // The Session asked again, so an earlier late answer no longer holds the card.
  if (asksAgain(sent, open)) setSent(undefined);

  return [sent, setSent];
}

const asksAgain = <Request extends { requestId: string }>(
  sent: Sent<Request> | undefined,
  open: Request | null | undefined,
): boolean => !!open && !!sent && open.requestId !== sent.request.requestId;

// Another App answered first: this App keeps its request, read as already answered, until the Session asks again or the Turn ends.
function lateRequest<Request extends { requestId: string }, Answer>(
  sent: Sent<Request> | undefined,
  mutation: AnswerMutation<Answer>,
  turnId: string | null | undefined,
): Request | undefined {
  const request = sentThisTurn(sent, turnId);

  if (!request) return undefined;

  return conflicted(currentRequest(mutation, request.requestId))
    ? request
    : undefined;
}

const sentThisTurn = <Request>(
  sent: Sent<Request> | undefined,
  turnId: string | null | undefined,
): Request | undefined =>
  sent && sent.turnId === turnId ? sent.request : undefined;

function requestAnswer<Request extends { requestId: string }, Answer>(
  props: OpenRequest<Request>,
  mutation: AnswerMutation<Answer>,
  submit: Submit<Answer>,
): RequestAnswer<Request, Answer> | undefined {
  const status = currentRequest(mutation, props.request.requestId);

  if (status?.isSuccess) return undefined;

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
  if (conflicted(status))
    return { kind: 'answered', reason: answeredElsewhere };

  return progressState(status);
}

const progressState = <Answer>(
  status: AnswerMutation<Answer> | undefined,
): RequestState =>
  status?.isPending ? { kind: 'submitting' } : { kind: 'open' };

// A late answer reads as already answered, not as an error.
function answerError<Answer>(
  status: AnswerMutation<Answer> | undefined,
): string | undefined {
  if (conflicted(status)) return undefined;

  return errorMessage(status);
}

const errorMessage = <Answer>(
  status: AnswerMutation<Answer> | undefined,
): string | undefined => status?.error?.message;

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

// Already settled elsewhere: the Server says CONFLICT.
const conflicted = <Answer>(
  status: AnswerMutation<Answer> | undefined,
): boolean => isConflict(status?.error);

function isConflict(error: ClientError | null | undefined): boolean {
  return error?.data?.code === 'CONFLICT';
}
