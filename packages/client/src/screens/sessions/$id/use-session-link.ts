import { useConnectionState } from '#features/connection';
import {
  useSessionConversation,
  type ConversationPage,
  type SessionPageConversation,
} from '#features/conversation';
import type { OpenSession } from './session-composer-props';

/*
 * What links the page to the Device it runs on: whether its Connection is open, and the Conversation as this Session sees it.
 * Typed by the hook's own result, so a renamed or missing field fails here rather than leaving the Composer without its slot.
 */
export function useSessionLink(
  page: ConversationPage,
): Pick<OpenSession, 'connected'> & SessionPageConversation {
  return {
    connected: useConnectionState() === 'open',
    ...useSessionConversation(page),
  };
}
