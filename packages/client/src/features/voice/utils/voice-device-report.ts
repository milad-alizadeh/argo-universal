import type {
  VoiceDeviceChange,
  VoiceDeviceReport,
  VoiceDeviceRequest,
} from '@repo/contracts';
import type { VoiceDeviceChoice } from '../stores/voice-device-choice';
import type { AudioDevices } from './audio-devices';

// What this App tells the Server of its microphones and speakers, so an Agent or the CLI can list and choose them.
export const deviceReportOf = (
  { microphones, speakers }: AudioDevices,
  choice: VoiceDeviceChoice,
): VoiceDeviceReport => ({ microphones, speakers, ...choice });

// Each choice the Server asks for is this Device's own, as if made in Settings › Voice.
export const onDeviceRequest =
  (choose: (change: VoiceDeviceChange) => void) =>
  (request: VoiceDeviceRequest): void => {
    if (request.type === 'choose') choose(request.change);
  };
