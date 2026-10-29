import type { FeedSubscribeInput, FeedSyncPoint } from '@repo/contracts';

type SubscriptionInput = {
  sessionId: string | undefined;
  syncPoint: FeedSyncPoint | null;
};

export function subscriptionInput(
  input: SubscriptionInput,
): FeedSubscribeInput {
  return { sessionId: input.sessionId ?? '', after: input.syncPoint };
}

export function subscriptionEnabled(input: SubscriptionInput): boolean {
  return input.sessionId !== undefined && input.syncPoint !== null;
}
