import { createContext, useContext } from 'react';
import { Platform } from 'react-native';
import type { ConversationConnection } from '../types/conversation-connection';

// What carries a Conversation's audio where the App runs; null where none can, so no voice button is offered.
const ConversationConnectionContext =
  createContext<ConversationConnection | null>(null);

export const useConversationConnection = (): ConversationConnection | null =>
  useContext(ConversationConnectionContext);

// Gives a subtree the connection that carries its Conversations.
export const ConversationConnectionProvider =
  ConversationConnectionContext.Provider;

/*
 * SPIKE (latency on a phone): the connection where a page carries the call, for the parts of Settings › Conversation
 * the spike leaves out on a phone: the device rows, the meters and voice previews.
 */
export function usePageConversationConnection(): ConversationConnection | null {
  const connection = useConversationConnection();

  return Platform.OS === 'web' ? connection : null;
}
