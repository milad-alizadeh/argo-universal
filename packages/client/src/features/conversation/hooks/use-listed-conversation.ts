import type { Conversation } from '@repo/contracts';
import { useMemo } from 'react';
import type { MiniConversationBandProps } from '../components/conversation-band/conversation-band';
import { useConversationConnection } from '../stores/conversation-connection-context';
import { useConversationStatus } from './use-conversation-status';
import { useSessionMutes } from './use-session-mutes';
import { useSpectrum } from './use-spectrum';

// The live Conversation as the Sessions list marks it: its Session, when it connected, and whether the mic is muted.
export interface ListedConversation {
  sessionId: string;
  startedAt: string | null;
  band: MiniConversationBandProps;
}

const listedOf = (
  conversation: Conversation | null,
  muted: boolean,
  spectrum: MiniConversationBandProps['spectrum'],
): ListedConversation | null =>
  conversation && {
    sessionId: conversation.sessionId,
    startedAt: conversation.startedAt,
    band: { call: { ...conversation, microphoneMuted: muted }, spectrum },
  };

// The one live Conversation, or none; the mic's mute is this App's, so another Device's Conversation reads unmuted.
export function useListedConversation(): ListedConversation | null {
  const { conversation } = useConversationStatus();
  const connection = useConversationConnection();
  const muted = useSessionMutes(connection).mutes.microphone;
  const spectrum = useSpectrum(connection);

  return useMemo(
    () => listedOf(conversation, muted, spectrum),
    [conversation, muted, spectrum],
  );
}
