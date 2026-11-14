import {
  type ErrorToast,
  useErrorToast,
} from '@repo/kit/primitives/overlays/toast';
import { useMutation } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import { useFollowUpSuggestionsPreference } from '#features/settings';
import type { SessionCommands } from './use-session-commands';

const retryFailed: ErrorToast = {
  title: "Couldn't retry",
  message: 'Check the Connection, then try again.',
};

export function useRetryPrompt(
  sessionId: string,
  onSuccess: () => void,
): SessionCommands['retryPrompt'] {
  const trpc = useTRPC();
  const { enabled } = useFollowUpSuggestionsPreference();
  const retry = useMutation(trpc.session.submit.mutationOptions({ onSuccess }));

  useErrorToast(retry.isError ? retryFailed : undefined);

  return retrySender(retry, {
    sessionId,
    followUpSuggestions: enabled === true,
  });
}

function retrySender(
  retry: SessionCommands['promptSession'],
  target: Pick<
    Parameters<SessionCommands['promptSession']['mutate']>[0],
    'sessionId' | 'followUpSuggestions'
  >,
): SessionCommands['retryPrompt'] {
  return (prompt): void => {
    if (!retry.isPending) retry.mutate({ ...target, prompt });
  };
}
