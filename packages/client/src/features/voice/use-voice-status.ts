import type { VoiceStatus } from '@repo/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useEffect } from 'react';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import type { VoiceConnection } from './voice-connection';

// The Voice call's standing: read once, then followed from the Server on every Device.
export function useVoiceStatus(): VoiceStatus | undefined {
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

  return read.data;
}

// The call's audio follows the call: once the Server has none, the microphone is released.
export function useReleaseWhenOver(
  status: VoiceStatus | undefined,
  connection: VoiceConnection | null,
): void {
  const over = status !== undefined && status.call === null;

  useEffect(() => {
    if (over) connection?.close();
  }, [over, connection]);
}
