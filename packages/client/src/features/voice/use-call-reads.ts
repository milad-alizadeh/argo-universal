import { useMutation, useQuery } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import { startCall } from './start-call';
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

const nothingToResume = (): void => {};

// Starting a call in a Session, then resuming the Feed the page holds of it (see `startCall`).
export function useStartCall(
  connection: VoiceConnection | null,
  resumeFeed: () => void = nothingToResume,
): (sessionId: string) => void {
  const start = useMutation(useTRPC().voice.start.mutationOptions());

  return (sessionId) =>
    void startCall(connection, {
      send: (offer) => start.mutateAsync({ sessionId, offer }),
      resumeFeed,
    });
}
