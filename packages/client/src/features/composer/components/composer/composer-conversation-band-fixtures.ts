import { createElement, type ReactNode } from 'react';
import { ConversationEdgeBand, type ConversationEdgeBandProps } from '#features/conversation';
import type { ComposerMockProps } from '../../../../../mocks/composer-mock';
import { syntheticVoiceAudio } from '../../../../../mocks/conversation/synthetic-voice-audio';
import type { ComposerConversationMutes } from './composer-types';
import {
  conversationComposer,
  conversationConnectingComposer,
} from './composer-conversation-fixtures';

type ComposerFixture = Pick<
  ComposerMockProps,
  'draft' | 'placeholder' | 'voice'
>;

const noop = (): void => {};

// Sound with no microphone and no voice, so the band moves as it would on a call.
const { spectrum } = syntheticVoiceAudio();

const connected = {
  state: 'listening',
  trouble: null,
  microphoneMuted: false,
} as const;

const band = (call: ConversationEdgeBandProps['call'], elapsed = '2:43'): ReactNode =>
  createElement(ConversationEdgeBand, { call, elapsed, spectrum });

const mutes = (microphone: boolean): ComposerConversationMutes => ({
  microphone,
  speaker: false,
  onMicrophone: noop,
  onSpeaker: noop,
});

const onCall = (
  call: ConversationEdgeBandProps['call'],
  elapsed?: string,
): ComposerFixture => ({
  ...conversationComposer,
  voice: {
    kind: 'connected',
    onEnd: noop,
    mutes: mutes(call.microphoneMuted),
    edge: band(call, elapsed),
  },
});

// Connecting: dim dots with one soft pulse crossing them, and no timer until the call connects.
export const bandConnectingComposer = {
  ...conversationConnectingComposer,
  voice: {
    kind: 'connecting',
    onEnd: noop,
    edge: band({ ...connected, state: 'none' }),
  },
} satisfies ComposerFixture;

// Listening: the person's voice lights the bars from the left, in orange.
export const bandListeningComposer = onCall(connected);

// Talking: the Agent's voice lights the bars from the right, in blue.
export const bandTalkingComposer = onCall(
  { ...connected, state: 'talking' },
  '2:51',
);

// Muted: the bars go dim and red, with the mic button.
export const bandMutedComposer = onCall(
  { ...connected, microphoneMuted: true },
  '3:10',
);

// Reconnecting: warning-coloured dots with a pulse crossing, and the timer keeps counting.
export const bandReconnectingComposer = onCall(
  { ...connected, state: 'none', trouble: 'reconnecting' },
  '3:14',
);
