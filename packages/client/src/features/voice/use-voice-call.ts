import type { VoicePartial, VoiceStatus } from '@repo/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useEffect } from 'react';
import type { ComposerVoice } from '#features/composer';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import { offerTo } from './offer-to';
import { useCallPointer } from './use-call-pointer';
import { useVoiceMutes } from './use-voice-mutes';
import type { VoiceConnection } from './voice-connection';
import { useVoiceConnection } from './voice-connection-context';
import { composerVoice } from './voice-offer';

const noPartials: VoicePartial[] = [];

// What is being said on this Session's call, followed from the status `useVoiceCall` keeps current.
export function useVoicePartials(sessionId: string): VoicePartial[] {
  const status = useQuery(useTRPC().voice.status.queryOptions()).data;

  return status ? partialsHere(status, sessionId) : noPartials;
}

const partialsHere = (
  status: VoiceStatus,
  sessionId: string,
): VoicePartial[] =>
  status.call?.sessionId === sessionId ? status.partials : noPartials;

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
    void offerTo(connection, (offer) => start.mutate({ sessionId, offer }));
}

function useEndCall(sessionId: string): ComposerVoice['onEnd'] {
  const end = useMutation(useTRPC().voice.end.mutationOptions());

  return () => end.mutate({ sessionId });
}

// The call's id and the Session it runs in, when there is a call.
type CallIds = { callId: string | undefined; session: string | undefined };

const idsOf = (call: VoiceStatus['call'] | undefined): CallIds => ({
  callId: call?.callId,
  session: call?.sessionId,
});

type Handlers = Parameters<typeof composerVoice>[2];

// What the Composer's voice buttons do: start, end, mute, and point at a call in another Session.
function useHandlers(
  sessionId: string,
  connection: VoiceConnection | null,
  status: VoiceStatus | undefined,
): Handlers {
  const ids = idsOf(status?.call);

  return {
    onStart: useStartCall(sessionId, connection),
    onEnd: useEndCall(sessionId),
    mutes: useVoiceMutes(connection, ids.callId),
    elsewhere: useCallPointer(ids.session, sessionId),
  };
}

// The Composer's voice state for one Session, or nothing where the App carries no audio.
export function useVoiceCall(sessionId: string): ComposerVoice | undefined {
  const connection = useVoiceConnection();
  const status = useVoiceStatus();
  const handlers = useHandlers(sessionId, connection, status);
  useReleaseWhenOver(status, connection);

  return connection && status
    ? composerVoice(status, sessionId, handlers)
    : undefined;
}
