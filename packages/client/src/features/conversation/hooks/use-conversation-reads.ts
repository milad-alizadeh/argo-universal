import type { ConversationStartInput } from '@repo/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import { placedConversation } from '../stores/placed-conversation';
import type { ConversationConnection } from '../types/conversation-connection';
import { startConversation } from '../utils/start-conversation';

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

type Start = (input: ConversationStartInput) => Promise<{ answer: string }>;

interface Placing {
  start: Start;
  end: (sessionId: string) => void;
  // Reads the Server's status again, so it carries the call before the placed one gives way.
  refresh: () => Promise<void>;
  resumeFeed: () => void;
}

const unwanted = (): Error =>
  new Error('The Conversation was ended before it began');

/*
 * Sends the offer while the call is still wanted. A call ended before the offer is never sent; one ended before the
 * answer came is ended on the Server too, and either way the connection lets go of the microphone.
 */
function sendWhileWanted(
  sessionId: string,
  { start, end }: Pick<Placing, 'start' | 'end'>,
): (offer: string) => Promise<{ answer: string }> {
  return async (offer) => {
    if (!placedConversation.holds(sessionId)) throw unwanted();
    const started = await start({ sessionId, offer });

    if (placedConversation.holds(sessionId)) return started;
    end(sessionId);
    throw unwanted();
  };
}

// The placed call gives way once the status has been read again: to the Server's call, or to nothing if it failed.
async function placeCall(
  sessionId: string,
  connection: ConversationConnection | null,
  placing: Placing,
): Promise<void> {
  await startConversation(connection, {
    send: sendWhileWanted(sessionId, placing),
    resumeFeed: placing.resumeFeed,
  });
  await placing.refresh();
  placedConversation.release(sessionId);
}

function usePlacing(resumeFeed: () => void): Placing {
  const trpc = useTRPC();
  const cache = useQueryClient();
  const start = useMutation(trpc.conversation.start.mutationOptions());
  const end = useMutation(trpc.conversation.end.mutationOptions());
  const queryKey = trpc.conversation.status.queryKey();

  return {
    start: start.mutateAsync,
    end: (sessionId) => end.mutate({ sessionId }),
    refresh: () => cache.invalidateQueries({ queryKey }),
    resumeFeed,
  };
}

/*
 * Starting a call in a Session: the call is placed at once, so its band and End show on the frame the person
 * pressed, and the microphone, the offer and the Server's start follow; then the page's Feed resumes (see `startConversation`).
 */
export function useStartCall(
  connection: ConversationConnection | null,
  resumeFeed: () => void = nothingToResume,
): (sessionId: string) => void {
  const placing = usePlacing(resumeFeed);

  return (sessionId) => {
    placedConversation.place(sessionId);
    void placeCall(sessionId, connection, placing);
  };
}
