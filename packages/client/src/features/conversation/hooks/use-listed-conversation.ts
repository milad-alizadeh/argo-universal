import type { Conversation } from '@repo/contracts';
import { useMemo } from 'react';
import { useConversationConnection } from '../stores/conversation-connection-context';
import { useConversationStatus } from './use-conversation-status';
import { useSessionMutes } from './use-session-mutes';

// The live Conversation as the Sessions list marks it: its Session, when it connected, and whether the mic is muted.
export interface ListedConversation {
  sessionId: string;
  startedAt: string | null;
  muted: boolean;
}

const listedOf = (
  conversation: Conversation | null,
  muted: boolean,
): ListedConversation | null =>
  conversation && {
    sessionId: conversation.sessionId,
    startedAt: conversation.startedAt,
    muted,
  };

// The one live Conversation, or none; the mic's mute is this App's, so another Device's Conversation reads unmuted.
export function useListedConversation(): ListedConversation | null {
  const { conversation } = useConversationStatus();
  const muted = useSessionMutes(useConversationConnection()).mutes.microphone;

  return useMemo(() => listedOf(conversation, muted), [conversation, muted]);
}
