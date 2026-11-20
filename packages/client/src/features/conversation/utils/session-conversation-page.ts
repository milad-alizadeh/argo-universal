import type { ComposerConversation } from '#features/composer';
import type { ConversationBandProps } from '../components/conversation-band/conversation-band';
import type { ConversationConnection } from '../types/conversation-connection';
import type { SessionConversation } from './session-conversation';

// What a Session page takes of the Conversation, under the names its Composer props read.
export type SessionPageConversation = Pick<SessionConversation, 'partials'> & {
  // Absent where this App carries no audio, so the Composer offers no voice button.
  conversation: ComposerConversation | undefined;
};

// Puts the band along the voice slot's top edge while a call here connects or runs.
export type DrawEdge = (
  slot: ComposerConversation | undefined,
  band: ConversationBandProps | undefined,
) => ComposerConversation | undefined;

// An App with no audio connection offers no slot at all; one with it gets the slot, with the band on a call here.
export const sessionPageConversation = (
  connection: ConversationConnection | null,
  view: SessionConversation,
  drawEdge: DrawEdge,
): SessionPageConversation => ({
  partials: view.partials,
  conversation: connection ? drawEdge(view.composer, view.band) : undefined,
});
