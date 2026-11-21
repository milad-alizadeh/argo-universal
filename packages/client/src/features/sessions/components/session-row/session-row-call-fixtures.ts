import { createElement, type ReactNode } from 'react';
import { MiniConversationBand } from '#features/conversation';
import { syntheticVoiceAudio } from '../../../../../mocks/conversation/synthetic-voice-audio';
import type { SessionRowCall } from './session-row-call';
import { idleSession } from './session-row-fixtures';

const { spectrum } = syntheticVoiceAudio();

type Spectrum = typeof spectrum;

export const talkingIndicator = (readSpectrum: Spectrum): ReactNode =>
  createElement(MiniConversationBand, {
    call: { state: 'talking', trouble: null, microphoneMuted: false },
    spectrum: readSpectrum,
  });

export const silentSpeech = (): ReturnType<Spectrum> => {
  const { input, output } = spectrum();

  return {
    input: new Float32Array(input.length),
    output: new Float32Array(output.length),
  };
};

const callStartedAt = '2026-11-18T10:00:00.000Z';

// A live Conversation attached to the idle Session, 2:43 in, at a fixed clock.
export const liveConversation = {
  sessionId: idleSession.session.sessionId,
  startedAt: callStartedAt,
  muted: false,
  indicator: talkingIndicator(spectrum),
  now: Date.parse(callStartedAt) + 163_000,
} satisfies SessionRowCall;

// The same call with this App's microphone muted.
export const mutedConversation = {
  ...liveConversation,
  muted: true,
  indicator: undefined,
} satisfies SessionRowCall;

// The same call still connecting: it has no start time yet.
export const connectingConversation = {
  ...liveConversation,
  startedAt: null,
  indicator: createElement(MiniConversationBand, {
    call: { state: 'none', trouble: null, microphoneMuted: false },
  }),
} satisfies SessionRowCall;
