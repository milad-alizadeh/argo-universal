import type { VoiceStartInput } from '@repo/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import { offerTo } from './offer-to';
import { placedCall } from './placed-call';
import type { VoiceConnection } from './voice-connection';

// A Session's title as the Sessions list reads it; none until it loads, or without a Session.
export function useSessionTitle(
  sessionId: string | undefined,
): string | undefined {
  const trpc = useTRPC();
  const input = { sessionId, archived: false };

  const listed = useQuery({
    ...trpc.session.list.queryOptions(input),
    enabled: sessionId !== undefined,
  });

  return listed.data?.sessions[0]?.title;
}

type Send = (input: VoiceStartInput) => void;

interface Answering {
  connection: VoiceConnection | null;
  // Reads the Server's status again, so it carries the call before the placed one gives way.
  refresh: () => Promise<void>;
  end: (sessionId: string) => void;
}

function endUnwanted(
  connection: VoiceConnection | null,
  end: Answering['end'],
  sessionId: string,
): void {
  connection?.close();
  end(sessionId);
}

// The Server's answer completes the connection; a call ended before it came is ended on the Server too.
async function answered(
  { connection, refresh, end }: Answering,
  answer: string,
  sessionId: string,
): Promise<void> {
  if (!placedCall.holds(sessionId))
    return endUnwanted(connection, end, sessionId);

  await connection?.accept(answer);
  await refresh();
  placedCall.release(sessionId);
}

function useAnswering(connection: VoiceConnection | null): Answering {
  const trpc = useTRPC();
  const cache = useQueryClient();
  const end = useMutation(trpc.voice.end.mutationOptions());
  const queryKey = trpc.voice.status.queryKey();

  return {
    connection,
    refresh: () => cache.invalidateQueries({ queryKey }),
    end: (sessionId) => end.mutate({ sessionId }),
  };
}

// Sends the offer to the Server; a start that fails lets the placed call go.
function useSend(connection: VoiceConnection | null): Send {
  const answering = useAnswering(connection);

  const start = useMutation(
    useTRPC().voice.start.mutationOptions({
      onSuccess: ({ answer }, { sessionId }) =>
        answered(answering, answer, sessionId),
      onError: (_, { sessionId }) => {
        connection?.close();
        placedCall.release(sessionId);
      },
    }),
  );

  return start.mutate;
}

// Sends the offer on while the call is still wanted; a refused microphone or an End first lets the placed call go.
async function offerFor(
  sessionId: string,
  connection: VoiceConnection | null,
  send: Send,
): Promise<void> {
  let sent = false;

  await offerTo(connection, (offer) => {
    if (!placedCall.holds(sessionId)) return connection?.close();
    sent = true;
    send({ sessionId, offer });
  });

  if (!sent) placedCall.release(sessionId);
}

/*
 * Starting a call in a Session: the call is placed at once, so its stage and End show on the frame the person
 * pressed, and the microphone, the offer and the Server's start follow.
 */
export function useStartCall(
  connection: VoiceConnection | null,
): (sessionId: string) => void {
  const send = useSend(connection);

  return (sessionId) => {
    placedCall.place(sessionId);
    void offerFor(sessionId, connection, send);
  };
}
