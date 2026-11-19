import { createElement, type ReactNode } from 'react';
import { VoiceEdgeBand, type VoiceEdgeBandProps } from '#features/voice';
import type { ComposerMockProps } from '../../../../../mocks/composer-mock';
import { syntheticVoiceAudio } from '../../../../../mocks/voice/synthetic-voice-audio';
import type { ComposerVoiceMutes } from './composer-types';
import {
  voiceCallComposer,
  voiceConnectingComposer,
} from './composer-voice-fixtures';

type ComposerFixture = Pick<
  ComposerMockProps,
  'draft' | 'placeholder' | 'voice'
>;

const noop = (): void => {};

// Sound with no microphone and no voice, so the band scrolls as it would on a call.
const { spectrum } = syntheticVoiceAudio();

const connected = {
  orb: 'listening',
  trouble: null,
  microphoneMuted: false,
} as const;

const band = (call: VoiceEdgeBandProps['call'], elapsed = '2:43'): ReactNode =>
  createElement(VoiceEdgeBand, { call, elapsed, spectrum });

const mutes = (microphone: boolean): ComposerVoiceMutes => ({
  microphone,
  speaker: false,
  onMicrophone: noop,
  onSpeaker: noop,
});

const onCall = (
  call: VoiceEdgeBandProps['call'],
  elapsed?: string,
): ComposerFixture => ({
  ...voiceCallComposer,
  voice: {
    kind: 'connected',
    onEnd: noop,
    mutes: mutes(call.microphoneMuted),
    edge: band(call, elapsed),
  },
});

// Connecting: a dim line with one soft highlight sweeping across, and no timer until the call connects.
export const bandConnectingComposer = {
  ...voiceConnectingComposer,
  voice: {
    kind: 'connecting',
    onEnd: noop,
    edge: band({ ...connected, orb: 'none' }),
  },
} satisfies ComposerFixture;

// Listening: the person's microphone level, newest on the right, scrolling left.
export const bandListeningComposer = onCall(connected);

// Talking: the voice's output, in info blue.
export const bandTalkingComposer = onCall(
  { ...connected, orb: 'talking' },
  '2:51',
);

// Thinking: low bars breathing in a slow wave.
export const bandThinkingComposer = onCall(
  { ...connected, orb: 'thinking' },
  '3:02',
);

// Muted: the line goes flat and red, with the mic button.
export const bandMutedComposer = onCall(
  { ...connected, microphoneMuted: true },
  '3:10',
);

// Reconnecting: a warning sweep, and the timer keeps counting.
export const bandReconnectingComposer = onCall(
  { ...connected, orb: 'none', trouble: 'reconnecting' },
  '3:14',
);

// Typing during a call: the text box under the band edits as it does today, and the band keeps moving.
export const bandTypingComposer = {
  ...onCall(connected, '3:20'),
  draft: {
    text: 'Also run the Inspector stories before the PR',
    attachments: [],
  },
} satisfies ComposerFixture;
