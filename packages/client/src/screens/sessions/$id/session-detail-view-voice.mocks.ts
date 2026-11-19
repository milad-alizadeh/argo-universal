import { fn } from 'storybook/test';
import { voiceLabel, voicePlaceholder } from '#features/voice';
import type { OpenSessionViewProps } from './session-detail-view';
import { idleSession } from './session-detail-view.mocks';

// The call has run 4 minutes 12 seconds, as Paper's "Electron window" shows it.
const startedAt = '2026-11-18T10:00:00.000Z';

const listeningStage = {
  state: 'listening',
  label: voiceLabel(
    { orb: 'listening', trouble: null, startedAt },
    Date.parse(startedAt) + 252_000,
  ),
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
    placeholder: voicePlaceholder('connected'),
    voice: {
      usable: true,
      call: 'connected',
      onStart: fn(),
      onEnd: fn(),
      mutes,
    },
  },
};
