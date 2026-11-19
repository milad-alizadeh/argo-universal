import type { VoiceSpectrum } from '../../voice-connection';
import type { EdgeLook } from './edge-band';

export interface EdgeWaveProps {
  look: EdgeLook;
  // The call's bands of speech, read each frame by the scrolling history.
  spectrum?: () => VoiceSpectrum;
}
