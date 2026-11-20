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

const runsHere = (voice: ComposerConversation | undefined): voice is CallSlot =>
  voice !== undefined && callHere.has(voice.kind);

// The Composer's voice slot with the band along its top edge, while a call here connects or runs.
export function withEdge(
  voice: ComposerConversation | undefined,
  band: ConversationBandProps | undefined,
): ComposerConversation | undefined {
  if (!band || !runsHere(voice)) return voice;

  return { ...voice, edge: <ConversationBand {...band} /> };
}
