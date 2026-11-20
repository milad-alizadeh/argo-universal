import { createElement } from 'react';
import { fn } from 'storybook/test';
import type { ComposerConversation } from '#features/composer';
import { ConversationEdgeBand, conversationPlaceholder } from '#features/conversation';
import { syntheticVoiceAudio } from '../../../../mocks/conversation/synthetic-voice-audio';
import type { OpenSessionViewProps } from './session-detail-view';
import { idleSession } from './session-detail-view.mocks';

// Sound with no microphone and no voice, so the band moves as it would on a call.
const { spectrum } = syntheticVoiceAudio();

// The call has run 4 minutes 12 seconds, as Paper's "Electron window" shows it.
const band = createElement(ConversationEdgeBand, {
  call: { state: 'listening', trouble: null, microphoneMuted: false },
  elapsed: '4:12',
  spectrum,
});

const mutes = {
  microphone: false,
  speaker: false,
  onMicrophone: fn(),
  onSpeaker: fn(),
};

const connectedHere = {
  kind: 'connected',
  onEnd: fn(),
  mutes,
  edge: band,
} satisfies ComposerConversation;

// A settled Session with a Conversation running in it: the Composer on the call, with the band along its top edge.
export const conversationSession: OpenSessionViewProps = {
  ...idleSession,
  composer: {
    ...idleSession.composer,
    placeholder: conversationPlaceholder(connectedHere),
    conversation: connectedHere,
  },
};
