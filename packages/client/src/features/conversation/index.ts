export { useSessionVoice, type VoicePage } from './hooks/use-session-conversation';

export { useNewSessionVoice } from './hooks/use-new-session-conversation';

export { voicePlaceholder } from './utils/session-conversation';

export { useSessionMutes } from './hooks/use-session-mutes';

export { useVoicePreview } from './hooks/use-voice-preview';

export { DesktopVoiceProvider } from './stores/desktop-conversation-provider';

export { useVoiceDevices } from './hooks/use-conversation-devices';

export { useVoiceConnection } from './stores/conversation-connection-context';

export type { AudioDevice, AudioDevices } from './utils/audio-devices';

export type { VoiceDeviceChoice } from './stores/conversation-device-choice';

export {
  VoiceEdgeBand,
  type VoiceEdgeBandProps,
} from './components/conversation-band/conversation-band';

export {
  useDeviceMeters,
  type DeviceMetersState,
} from './hooks/use-device-meters';
