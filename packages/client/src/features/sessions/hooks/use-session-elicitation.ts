import type { PendingElicitation } from '@repo/contracts';
import { useMutation } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import type {
  ElicitationAnswer,
  ElicitationFormProps,
} from '#features/requests';
import { type SessionRequest, useRequestAnswer } from './use-request-answer';

type SessionElicitation = SessionRequest<PendingElicitation> & {
  resumeAfterCommand: () => void;
};

// The Agent's open Elicitation, answered through the Server.
export function useSessionElicitation(
  props: SessionElicitation,
): ElicitationFormProps | undefined {
  const trpc = useTRPC();

  const mutation = useMutation(
    trpc.session.answerElicitation.mutationOptions({
      onSettled: props.resumeAfterCommand,
    }),
  );

  return useRequestAnswer<PendingElicitation, ElicitationAnswer>(
    props,
    mutation,
  );
}
