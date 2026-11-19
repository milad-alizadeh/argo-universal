import type { VoiceSpectrum } from '../../types/voice-connection';
import { voiceOrbSize, type VoiceOrbProps } from '../voice-orb/voice-orb-props';

// What every visualiser draws from: the call's state, its levels for the orb, and its bands for the matrix and wave.
export type VoiceVisualiserProps = VoiceOrbProps & {
  // How loud each band of speech is right now; read each frame, so a visualiser moves without rendering again.
  spectrum?: () => VoiceSpectrum;
};

/*
 * The matrix and the wave stand as tall as the orb but run wide, as ElevenLabs draws them: 312 points across fill a
 * 320-point well, which still fits a phone's Feed.
 */
export const wideDrawing = { width: 312, height: voiceOrbSize } as const;
