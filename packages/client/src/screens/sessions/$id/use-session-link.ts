import { useConnectionState } from '#features/connection';
import { useSessionConversation, type ConversationPage } from '#features/conversation';
import type { OpenSession } from './session-composer-props';

// What links the page to the Device it runs on: whether its Connection is open, and the Conversation as this Session sees it.
export function useSessionLink(
  page: ConversationPage,
): Pick<OpenSession, 'connected' | 'conversation' | 'partials'> {
  return {
    connected: useConnectionState() === 'open',
    ...useSessionConversation(page),
  };
}
