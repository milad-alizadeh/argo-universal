export { useSessionVoice, type VoicePage } from './hooks/use-session-voice';

export { useNewSessionVoice } from './hooks/use-new-session-voice';

export { voicePlaceholder } from './utils/session-voice';

export { voiceLabel } from './components/voice-stage/voice-label';

export { useSessionMutes } from './hooks/use-session-mutes';

export { useVoicePreview } from './hooks/use-voice-preview';

export { DesktopVoiceProvider } from './stores/desktop-voice-provider';

export { useVoiceDevices } from './hooks/use-voice-devices';

export { useVoiceVisualiser } from './stores/voice-visualiser-choice';

export type { VoiceVisualiserKind } from './components/voice-visualiser/voice-visualiser-kind';

export { useVoiceConnection } from './stores/voice-connection-context';

export type { AudioDevice, AudioDevices } from './utils/audio-devices';

export type { VoiceDeviceChoice } from './stores/voice-device-choice';

export {
  VoiceStageReveal,
  voiceStageRoomId,
} from './components/voice-stage/voice-stage-reveal';

export { type VoiceStageViewProps } from './components/voice-stage/voice-stage-view';

export {
  VoiceEdgeBand,
  type VoiceEdgeBandProps,
} from './components/voice-edge-band/voice-edge-band';
