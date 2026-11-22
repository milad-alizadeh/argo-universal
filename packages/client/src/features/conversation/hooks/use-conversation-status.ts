import {
  defaultConversationOptions,
  type ConversationStatus,
  type ConversationUpdate,
} from '@repo/contracts';
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useMemo } from 'react';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import {
  usePlacedConversation,
  withPlacedConversation,
} from '../stores/placed-conversation';

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

// Follow live data independently so a status query cannot delay or overwrite a stream update.
function useConversationUpdate(): ConversationUpdate | undefined {
  const trpc = useTRPC();
  const cache = useQueryClient();

  const options = trpc.conversation.updates.subscriptionOptions(undefined, {
    onData: (update) => {
      cache.setQueryData(options.queryKey, update);
    },
  });

  const subscription = useSubscription(options);

  // Older Servers only have the original status stream.
  const legacy = useSubscription(
    trpc.conversation.watch.subscriptionOptions(undefined, {
      enabled: subscription.error?.data?.code === 'NOT_FOUND',
      onData: (status) => {
        cache.setQueryData(trpc.conversation.status.queryKey(), status);
      },
    }),
  );

  const update = useQuery<ConversationUpdate>({
    queryKey: options.queryKey,
    queryFn: skipToken,
  });

  useResubscribeOnReconnect(subscription);
  useResubscribeOnReconnect(legacy);

  return update.data;
}

// The Conversation's standing: read once, then followed from the Server on every Device, with a call this App is placing.
export function useConversationStatus(): ConversationStatus {
  const trpc = useTRPC();
  const read = useQuery(trpc.conversation.status.queryOptions());
  const placed = usePlacedConversation();
  const update = useConversationUpdate();

  return useMemo(
    () =>
      withPlacedConversation(
        { ...loadingStatus, ...read.data, ...update },
        placed,
      ),
    [read.data, update, placed],
  );
}
