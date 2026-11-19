import type { VoiceStatus } from '@repo/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';

// What the status says until the Server has answered: no call, and nothing to offer.
const loadingStatus: VoiceStatus = {
  call: null,
  ended: null,
  partials: [],
  availability: { usable: false, reason: 'Loading' },
  enabled: false,
};

// The Voice call's standing: read once, then followed from the Server on every Device.
export function useVoiceStatus(): VoiceStatus {
  const trpc = useTRPC();
  const cache = useQueryClient();
  const read = useQuery(trpc.voice.status.queryOptions());
  const key = trpc.voice.status.queryKey();

  const subscription = useSubscription(
    trpc.voice.watch.subscriptionOptions(undefined, {
      onData: (status: VoiceStatus): void => {
        cache.setQueryData(key, status);
      },
    }),
  );

  useResubscribeOnReconnect(subscription);

  return read.data ?? loadingStatus;
}
