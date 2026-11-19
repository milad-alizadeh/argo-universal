import { useMutation, useQuery } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import { offerTo } from './offer-to';
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

// Starting a call in a Session: the offer goes to the Server, and its answer completes the connection.
export function useStartCall(
  connection: VoiceConnection | null,
): (sessionId: string) => void {
  const start = useMutation(
    useTRPC().voice.start.mutationOptions({
      onSuccess: ({ answer }) => connection?.accept(answer),
      onError: () => connection?.close(),
    }),
  );

  return (sessionId) =>
    void offerTo(connection, (offer) => start.mutate({ sessionId, offer }));
}
