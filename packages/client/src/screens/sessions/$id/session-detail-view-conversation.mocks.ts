import { createElement } from 'react';
import { fn } from 'storybook/test';
import type { ComposerVoice } from '#features/composer';
import { VoiceEdgeBand, voicePlaceholder } from '#features/conversation';
import { syntheticVoiceAudio } from '../../../../mocks/conversation/synthetic-voice-audio';
import type { OpenSessionViewProps } from './session-detail-view';
import { idleSession } from './session-detail-view.mocks';

// Sound with no microphone and no voice, so the band moves as it would on a call.
const { spectrum } = syntheticVoiceAudio();

// The call has run 4 minutes 12 seconds, as Paper's "Electron window" shows it.
const band = createElement(VoiceEdgeBand, {
  call: { orb: 'listening', trouble: null, microphoneMuted: false },
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
} satisfies ComposerVoice;

// A settled Session with a Voice call running in it: the Composer on the call, with the band along its top edge.
export const voiceCallSession: OpenSessionViewProps = {
  ...idleSession,
  composer: {
    ...idleSession.composer,
    placeholder: voicePlaceholder(connectedHere),
    voice: connectedHere,
  },
};
