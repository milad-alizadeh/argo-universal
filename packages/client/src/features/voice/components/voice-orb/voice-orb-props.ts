import type { VoiceOrbState } from '@repo/contracts';
import type { VoiceLevels } from '../../voice-connection';

export interface VoiceOrbProps {
  state: VoiceOrbState;
  // How loud the microphone and the voice are right now; read each frame, so the orb moves without rendering again.
  levels?: () => VoiceLevels;
}

// The orb's drawn size in points; Paper draws it 128 across inside a 136 well.
export const voiceOrbSize = 128;

const orbNames: Record<VoiceOrbState, string> = {
  listening: 'Voice listening',
  talking: 'Voice talking',
  thinking: 'Voice thinking',
  none: 'Voice not connected',
};

// What assistive tech calls the orb.
export const orbName = (state: VoiceOrbState): string => orbNames[state];
