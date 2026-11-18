import { fn } from 'storybook/test';
import type { OpenSessionViewProps } from './session-detail-view';
import { idleSession } from './session-detail-view.mocks';

// The call has run 4 minutes 12 seconds, as Paper's "Electron window" shows it.
const listeningStage = {
  state: 'listening',
  label: { headline: 'Listening', detail: 'Voice · 4:12' },
} satisfies NonNullable<OpenSessionViewProps['stage']>;

const mutes = {
  microphone: false,
  speaker: false,
  onMicrophone: fn(),
  onSpeaker: fn(),
};

// A settled Session with a Voice call running in it: the orb pinned above the Feed, and the Composer on the call.
export const voiceCallSession: OpenSessionViewProps = {
  ...idleSession,
  stage: listeningStage,
  composer: {
    ...idleSession.composer,
    placeholder: 'Type, or keep talking',
    voice: {
      usable: true,
      call: 'connected',
      onStart: fn(),
      onEnd: fn(),
      mutes,
    },
  },
};
