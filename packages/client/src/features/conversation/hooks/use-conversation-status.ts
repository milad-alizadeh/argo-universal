import { defaultConversationOptions, type ConversationStatus } from '@repo/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import { usePlacedCall, withPlacedCall } from '../stores/placed-conversation';

// What the status says until the Server has answered: no call, and nothing to offer.
const loadingStatus: ConversationStatus = {
  conversation: null,
  ended: null,
  partials: [],
  availability: { usable: false, reason: 'Loading' },
  enabled: false,
  volume: defaultConversationOptions.volume,
  microphoneGain: defaultConversationOptions.microphoneGain,
};

// The Conversation's standing: read once, then followed from the Server on every Device, with a call this App is placing.
export function useConversationStatus(): ConversationStatus {
  const trpc = useTRPC();
  const cache = useQueryClient();
  const read = useQuery(trpc.conversation.status.queryOptions());
  const key = trpc.conversation.status.queryKey();

  const subscription = useSubscription(
    trpc.conversation.watch.subscriptionOptions(undefined, {
      onData: (status: ConversationStatus): void => {
        cache.setQueryData(key, status);
      },
    }),
  );

  useResubscribeOnReconnect(subscription);

  return withPlacedCall(read.data ?? loadingStatus, usePlacedCall());
}
