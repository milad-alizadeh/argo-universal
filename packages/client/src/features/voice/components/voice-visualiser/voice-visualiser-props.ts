import type { VoiceSpectrum } from '../../voice-connection';
import type { VoiceOrbProps } from '../voice-orb/voice-orb-props';

// What every visualiser draws from: the call's state, its levels for the orb, and its bands for the matrix and wave.
export type VoiceVisualiserProps = VoiceOrbProps & {
  // How loud each band of speech is right now; read each frame, so a visualiser moves without rendering again.
  spectrum?: () => VoiceSpectrum;
};
