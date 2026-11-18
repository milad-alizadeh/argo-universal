import type { VoiceStatus } from '@repo/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useEffect } from 'react';
import type { ComposerVoice, ComposerVoiceCall } from '#features/composer';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import type { VoiceConnection } from './voice-connection';
import { useVoiceConnection } from './voice-connection-context';

// Where the call is, as this Session's Composer sees it.
export function callHere(
  call: VoiceStatus['call'] | undefined,
  sessionId: string,
): ComposerVoiceCall {
  if (!call) return 'none';

  return call.sessionId === sessionId ? call.status : 'elsewhere';
}

// The Voice call's standing: read once, then followed from the Server on every Device.
function useVoiceStatus(): VoiceStatus | undefined {
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
function useReleaseWhenOver(
  status: VoiceStatus | undefined,
  connection: VoiceConnection | null,
): void {
  const over = status !== undefined && status.call === null;

  useEffect(() => {
    if (over) connection?.close();
  }, [over, connection]);
}

// Starting a call: the offer goes to the Server, and its answer completes the connection.
function useStartCall(
  sessionId: string,
  connection: VoiceConnection | null,
): ComposerVoice['onStart'] {
  const start = useMutation(
    useTRPC().voice.start.mutationOptions({
      onSuccess: ({ answer }) => connection?.accept(answer),
      onError: () => connection?.close(),
    }),
  );

  return () =>
    void connection
      ?.createOffer()
      .then((offer) => start.mutate({ sessionId, offer }));
}

function useEndCall(sessionId: string): ComposerVoice['onEnd'] {
  const end = useMutation(useTRPC().voice.end.mutationOptions());

  return () => end.mutate({ sessionId });
}

// The Composer's voice state for one Session, or nothing where the App carries no audio.
export function useVoiceCall(sessionId: string): ComposerVoice | undefined {
  const connection = useVoiceConnection();
  const status = useVoiceStatus();
  const onStart = useStartCall(sessionId, connection);
  const onEnd = useEndCall(sessionId);
  useReleaseWhenOver(status, connection);

  if (!connection || !status) return undefined;

  return {
    usable: status.availability.usable,
    call: callHere(status.call, sessionId),
    onStart,
    onEnd,
  };
}
