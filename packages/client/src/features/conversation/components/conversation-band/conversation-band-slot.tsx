import type { ComposerConversation } from '#features/composer';
import {
  ConversationBand,
  type ConversationBandProps,
} from './conversation-band';

const callHere: ReadonlySet<ComposerConversation['kind']> = new Set([
  'connecting',
  'connected',
]);

type CallSlot = Extract<
  ComposerConversation,
  { kind: 'connecting' | 'connected' }
>;

const runsHere = (
  conversation: ComposerConversation | undefined,
): conversation is CallSlot =>
  conversation !== undefined && callHere.has(conversation.kind);

// The Composer's Conversation slot with the band along its top edge, while a call here connects or runs.
export function withEdge(
  conversation: ComposerConversation | undefined,
  band: ConversationBandProps | undefined,
): ComposerConversation | undefined {
  if (!band || !runsHere(conversation)) return conversation;

  return { ...conversation, edge: <ConversationBand {...band} /> };
}
