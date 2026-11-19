import type { VoiceOrbState } from '@repo/contracts';
import type { ViewStyle } from 'react-native';
import type { VoiceLevels } from '../../voice-connection';
import type { OrbColors } from './orb-colors';

export interface VoiceOrbProps {
  state: VoiceOrbState;
  // How loud the microphone and the voice are right now; read each frame, so the orb moves without rendering again.
  levels?: () => VoiceLevels;
  // ElevenLabs' `colors`: the two colours the shader ramps between. Left out, the orb draws the theme's own pair.
  colors?: OrbColors;
}

// The orb's drawn size in points; Paper draws it 128 across inside a 136 well.
export const voiceOrbSize = 128;

// The orb's disc, filled with a colour that shows until the drawing covers it, and where nothing draws over it.
export const orbDisc = (fill: string): ViewStyle => ({
  width: voiceOrbSize,
  height: voiceOrbSize,
  backgroundColor: fill,
});

const orbNames: Record<VoiceOrbState, string> = {
  listening: 'Voice listening',
  talking: 'Voice talking',
  thinking: 'Voice thinking',
  none: 'Voice not connected',
};

// What assistive tech calls the orb.
export const orbName = (state: VoiceOrbState): string => orbNames[state];
