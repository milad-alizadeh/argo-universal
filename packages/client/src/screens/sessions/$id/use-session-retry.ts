import { useMutation } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import type { useSessionFeed } from '#features/feed';
import type { OpenAttempt } from '#features/sessions';

interface Retry {
  attempt: OpenAttempt;
  openAgain: () => void;
}

// Retry opens the Session again without a Turn.
export function useSessionRetry(
  sessionId: string,
  feed: ReturnType<typeof useSessionFeed>,
): Retry {
  const trpc = useTRPC();

  const retry = useMutation(
    trpc.session.open.mutationOptions({ onSuccess: () => feed.retryOpen() }),
  );

  return { attempt: retry, openAgain: () => retry.mutate({ sessionId }) };
}
