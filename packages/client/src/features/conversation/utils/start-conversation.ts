import type { ConversationConnection } from '../types/conversation-connection';
import { offerTo } from './offer-to';

interface CallStart {
  // Asks the Server to start the call with the offer; resolves with the Conversation provider's answer.
  send: (offer: string) => Promise<{ answer: string }>;
  // Opens the page's live Feed again when the Server had closed it.
  resumeFeed: () => void;
}

/*
 * Starting a call: the offer goes to the Server, and its answer completes the connection. The Server opens a closed
 * Session to start the call, and the call then writes and starts Turns the page never asked for, so the page's Feed is
 * resumed after the start as after any command, whether it started or failed with a Notice.
 */
export const startCall = (
  connection: ConversationConnection | null,
  { send, resumeFeed }: CallStart,
): Promise<void> | undefined =>
  offerTo(connection, (offer) =>
    send(offer)
      .then(
        ({ answer }) => connection?.accept(answer),
        () => connection?.close(),
      )
      .finally(resumeFeed),
  );
