import type { VoiceOrbState } from '@repo/contracts';
import type { VoiceSpectrum } from '../../types/voice-connection';

// What a visualiser draws: sound while someone speaks, a calm pattern while the Agent works, and one while connecting.
export type VisualiserPattern =
  | 'connecting'
  | 'listening'
  | 'talking'
  | 'thinking';

const patterns: Record<VoiceOrbState, VisualiserPattern> = {
  none: 'connecting',
  listening: 'listening',
  talking: 'talking',
  thinking: 'thinking',
};

// The orb's state as a pattern: a call with no sound to show yet is connecting, or reconnecting.
export const patternOf = (state: VoiceOrbState): VisualiserPattern =>
  patterns[state];

// The person's microphone while listening, the voice's output while it talks, and no sound otherwise.
export function heardOf(
  pattern: VisualiserPattern,
  spectrum: VoiceSpectrum,
): Float32Array | undefined {
  if (pattern === 'listening') return spectrum.input;

  return pattern === 'talking' ? spectrum.output : undefined;
}
