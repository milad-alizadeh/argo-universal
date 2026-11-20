export { useSessionVoice, type VoicePage } from './hooks/use-session-voice';

export { useNewSessionVoice } from './hooks/use-new-session-voice';

export { voicePlaceholder } from './utils/session-voice';

export { useSessionMutes } from './hooks/use-session-mutes';

export { useVoicePreview } from './hooks/use-voice-preview';

export { DesktopVoiceProvider } from './stores/desktop-voice-provider';

export { useVoiceDevices } from './hooks/use-voice-devices';

export { useVoiceConnection } from './stores/voice-connection-context';

export type { AudioDevice, AudioDevices } from './utils/audio-devices';

export type { VoiceDeviceChoice } from './stores/voice-device-choice';

export {
  VoiceEdgeBand,
  type VoiceEdgeBandProps,
} from './components/voice-edge-band/voice-edge-band';

export {
  useDeviceMeters,
  type DeviceMetersState,
} from './hooks/use-device-meters';
