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

// The same Session, with the call running in another one: the voice button's slot points there.
export const callElsewhereSession: OpenSessionViewProps = {
  ...idleSession,
  composer: {
    ...idleSession.composer,
    voice: {
      usable: true,
      call: 'elsewhere',
      onStart: fn(),
      onEnd: fn(),
      elsewhere: { title: 'Fix flaky Feed sync test', onOpen: fn() },
    },
  },
};

// The call is still connecting: End shows at once, with its ring, and the field says so.
export const callConnectingSession: OpenSessionViewProps = {
  ...idleSession,
  composer: {
    ...idleSession.composer,
    placeholder: 'Connecting…',
    voice: { usable: true, call: 'connecting', onStart: fn(), onEnd: fn() },
  },
};

// No call, a usable Voice provider and an empty draft: the voice button is the primary button.
export const voiceReadySession: OpenSessionViewProps = {
  ...idleSession,
  composer: {
    ...idleSession.composer,
    voice: { usable: true, call: 'none', onStart: fn(), onEnd: fn() },
  },
};
