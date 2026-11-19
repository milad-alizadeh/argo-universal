import { voiceLabel, type CallLook } from './voice-label';
import type { VoiceStageViewProps } from './voice-stage-view';

// The call has run 4 minutes 12 seconds, as Paper's "Electron window" shows it.
const startedAt = '2026-11-18T10:00:00.000Z';

const now = Date.parse(startedAt) + 252_000;

// A call that connected and has the person's voice coming in: the Paper frame's own state.
const connected = {
  connection: 'connected',
  orb: 'listening',
  trouble: null,
  startedAt,
} satisfies CallLook;

// What the stage draws for a call in this state: its orb, and the label the one place that words it gives.
const stageOf = (call: CallLook): VoiceStageViewProps => ({
  state: call.orb,
  label: voiceLabel(call, now),
});

export const listeningStage = stageOf(connected);

// The voice is speaking.
export const talkingStage = stageOf({ ...connected, orb: 'talking' });

// The Agent's Turn is running.
export const thinkingStage = stageOf({ ...connected, orb: 'thinking' });

// The call has not connected: the orb has no sound to show yet.
export const connectingStage = stageOf({
  connection: 'connecting',
  orb: 'none',
  trouble: null,
  startedAt: null,
});

// The connection dropped and is coming back: trouble is words in the label, never a dialog.
export const reconnectingStage = stageOf({
  ...connected,
  connection: 'disconnected',
  orb: 'none',
  trouble: 'reconnecting',
});

// The microphone cannot be used.
export const microphoneBlockedStage = stageOf({
  ...connected,
  trouble: 'microphone-blocked',
});

// The provider reports its allowance running low.
export const allowanceLowStage = stageOf({
  ...connected,
  limit: { remaining: 0.1 },
});
