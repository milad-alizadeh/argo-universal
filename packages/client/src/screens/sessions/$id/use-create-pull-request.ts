import type { ContentBlock } from '@repo/contracts';
import {
  type ErrorToast,
  useErrorToast,
} from '@repo/kit/primitives/overlays/toast';
import { useMutation } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';

const creationFailed: ErrorToast = {
  title: "Couldn't send the Create PR request",
  message: 'Check the Connection, then try again.',
};

const prompt = [
  {
    type: 'text',
    text: "Open a pull request for this Session's changes and attach it to this Session. If a pull request already exists for this branch, attach it instead.",
  },
] satisfies ContentBlock[];

export interface CreatePullRequestAction {
  onPress: () => void;
  disabled: boolean;
}

export function useCreatePullRequest(
  sessionId: string,
  onSuccess: () => void,
): CreatePullRequestAction {
  const trpc = useTRPC();

  const submit = useMutation(
    trpc.session.submit.mutationOptions({ onSuccess }),
  );

  useErrorToast(submit.isError ? creationFailed : undefined);

  return {
    disabled: submit.isPending,
    onPress: (): void => submit.mutate({ sessionId, prompt }),
  };
}
