import type {
  PendingElicitation,
  SessionAnswerElicitationInput,
} from '@repo/contracts';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useRef, type RefObject } from 'react';
import {
  type ClientError,
  type ServerMutation,
  type TRPC,
  useTRPC,
} from '#features/connection';
import type { ElicitationFormProps } from '#features/requests';

type AnswerMutation = ServerMutation<TRPC['session']['answerElicitation']>;

type Answering = RefObject<string | null>;

type Submit = (input: SessionAnswerElicitationInput) => void;

type SessionElicitation = {
  sessionId: SessionAnswerElicitationInput['sessionId'];
  request: PendingElicitation | null | undefined;
  resumeAfterCommand: () => void;
};

type RequestProps = SessionElicitation & { request: PendingElicitation };

export function useSessionElicitation(
  props: SessionElicitation,
): ElicitationFormProps | undefined {
  const mutation = useAnswerMutation(props.resumeAfterCommand);
  const submit = useSubmitAnswer(mutation);

  if (!props.request) return undefined;

  return requestProps({ ...props, request: props.request }, mutation, submit);
}

function useAnswerMutation(resume: () => void): AnswerMutation {
  const trpc = useTRPC();

  return useMutation(
    trpc.session.answerElicitation.mutationOptions({ onSettled: resume }),
  );
}

function releaseAnswer(answering: Answering, requestId: string): void {
  if (answering.current === requestId) answering.current = null;
}

function requestProps(
  props: RequestProps,
  mutation: AnswerMutation,
  submit: Submit,
): ElicitationFormProps | undefined {
  const status = currentRequest(mutation, props.request.requestId);

  if (isResolved(status)) return undefined;

  return {
    request: props.request,
    state: answerState(status),
    error: answerError(status),
    onAnswer: requestAnswer(props, submit),
  };
}

function requestAnswer(
  props: RequestProps,
  submit: Submit,
): ElicitationFormProps['onAnswer'] {
  const identity = {
    sessionId: props.sessionId,
    requestId: props.request.requestId,
  };

  return (answer) => submit({ ...identity, ...answer });
}

function currentRequest(
  mutation: AnswerMutation,
  requestId: string,
): AnswerMutation | undefined {
  if (mutation.variables?.requestId !== requestId) return undefined;

  return mutation;
}

function useSubmitAnswer(mutation: AnswerMutation): Submit {
  const answering = useRef<string | null>(null);
  const mutate = mutation.mutate;

  return useCallback((input) => sendAnswer(input, mutate, answering), [mutate]);
}

function sendAnswer(
  input: SessionAnswerElicitationInput,
  mutate: AnswerMutation['mutate'],
  answering: Answering,
): void {
  if (answering.current === input.requestId) return;
  answering.current = input.requestId;
  mutate(input, { onSettled: () => releaseAnswer(answering, input.requestId) });
}

function answerState(
  status: AnswerMutation | undefined,
): ElicitationFormProps['state'] {
  return status?.isPending ? { kind: 'submitting' } : { kind: 'open' };
}

function isResolved(status: AnswerMutation | undefined): boolean {
  if (!status) return false;

  if (status.isSuccess) return true;

  return isConflict(status.error);
}

function isConflict(error: ClientError | null): boolean {
  return error?.data?.code === 'CONFLICT';
}

function answerError(status: AnswerMutation | undefined): string | undefined {
  return status?.error?.message;
}
