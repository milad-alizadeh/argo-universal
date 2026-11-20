import { createContext, useContext } from 'react';
import type { ConversationConnection } from '../types/conversation-connection';

// What carries a Conversation's audio where the App runs; null where none can, so no voice button is offered.
const ConversationConnectionContext = createContext<ConversationConnection | null>(null);

export const useConversationConnection = (): ConversationConnection | null =>
  useContext(ConversationConnectionContext);

// Gives a subtree the connection that carries its Conversations.
export const ConversationConnectionProvider = ConversationConnectionContext.Provider;
