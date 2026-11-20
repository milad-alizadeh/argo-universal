import type { ComposerVoice } from '#features/composer';
import { VoiceEdgeBand, type VoiceEdgeBandProps } from './conversation-band';

const callHere: ReadonlySet<ComposerVoice['kind']> = new Set([
  'connecting',
  'connected',
]);

type CallSlot = Extract<ComposerVoice, { kind: 'connecting' | 'connected' }>;

const runsHere = (voice: ComposerVoice | undefined): voice is CallSlot =>
  voice !== undefined && callHere.has(voice.kind);

// The Composer's voice slot with the band along its top edge, while a call here connects or runs.
export function withEdge(
  voice: ComposerVoice | undefined,
  band: VoiceEdgeBandProps | undefined,
): ComposerVoice | undefined {
  if (!band || !runsHere(voice)) return voice;

  return { ...voice, edge: <VoiceEdgeBand {...band} /> };
}
