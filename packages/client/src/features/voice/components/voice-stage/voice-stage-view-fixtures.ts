import type { VoiceStageViewProps } from './voice-stage-view';

// The call has run 4 minutes 12 seconds, as Paper's "Electron window" shows it.
const elapsed = 'Voice · 4:12';

// The call connected and the person is being heard: the Paper frame's own state.
export const listeningStage = {
  state: 'listening',
  label: { headline: 'Listening', detail: elapsed },
} satisfies VoiceStageViewProps;

// The voice is speaking.
export const talkingStage = {
  state: 'talking',
  label: { headline: 'Talking', detail: elapsed },
} satisfies VoiceStageViewProps;

// The Agent's Turn is running.
export const thinkingStage = {
  state: 'thinking',
  label: { headline: 'Thinking', detail: elapsed },
} satisfies VoiceStageViewProps;

// The call has not connected: the orb has no sound to show yet.
export const connectingStage = {
  state: 'none',
  label: { headline: 'Connecting…', detail: 'Voice · 0:00' },
} satisfies VoiceStageViewProps;

// The connection dropped and is coming back: trouble is words in the label, never a dialog.
export const reconnectingStage = {
  state: 'none',
  label: { headline: 'Reconnecting…', detail: elapsed },
} satisfies VoiceStageViewProps;

// The microphone cannot be used.
export const microphoneBlockedStage = {
  state: 'listening',
  label: { headline: 'Microphone blocked', detail: elapsed },
} satisfies VoiceStageViewProps;

// The provider reports its allowance running low.
export const allowanceLowStage = {
  state: 'listening',
  label: { headline: 'Listening', detail: `${elapsed} · 10% left` },
} satisfies VoiceStageViewProps;
