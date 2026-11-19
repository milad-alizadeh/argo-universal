import type { ComposerMockProps } from '../../../../../mocks/composer-mock';
import { readyComposer, startedSessionComposer } from './composer-fixtures';

type ComposerFixture = Omit<
  ComposerMockProps,
  | 'onDraftChange'
  | 'onAttachImages'
  | 'onAttachCamera'
  | 'onAttachFiles'
  | 'onCreateGoal'
  | 'onSend'
  | 'onStop'
>;

const noop = (): void => {};

const callMutes = {
  microphone: false,
  speaker: false,
  onMicrophone: noop,
  onSpeaker: noop,
};

// No call, a usable Voice provider and an empty draft: the voice button, Send's circle with the five bars.
export const voiceReadyComposer = {
  ...startedSessionComposer,
  voice: { kind: 'start', onStart: noop },
} satisfies ComposerFixture;

// The call is connecting: End shows at once with its ring turning inside the circle, and the field says so.
export const voiceConnectingComposer = {
  ...startedSessionComposer,
  placeholder: 'Connecting…',
  voice: { kind: 'connecting', onEnd: noop },
} satisfies ComposerFixture;

// A connected call: the mic and speaker buttons beside End, and the field invites typing as well as talking.
export const voiceCallComposer = {
  ...startedSessionComposer,
  placeholder: 'Type, or keep talking',
  voice: { kind: 'connected', onEnd: noop, mutes: callMutes },
} satisfies ComposerFixture;

const mutedCall = (microphone: boolean, speaker: boolean): ComposerFixture => ({
  ...voiceCallComposer,
  voice: {
    kind: 'connected',
    onEnd: noop,
    mutes: { ...callMutes, microphone, speaker },
  },
});

// The microphone is muted: its button reads red, with the slashed glyph.
export const voiceMicMutedComposer = mutedCall(true, false);

// The Agent's Turn runs on the call: Stop joins the controls between the mutes and End, and stops the Turn without ending the call.
export const voiceCallTurnRunningComposer = {
  ...voiceCallComposer,
  running: true,
} satisfies ComposerFixture;

// The same with the microphone muted: Stop and End keep their look.
export const voiceMicMutedTurnRunningComposer = {
  ...mutedCall(true, false),
  running: true,
} satisfies ComposerFixture;

// The speaker is muted: its button reads red, with the slashed glyph.
export const voiceSpeakerMutedComposer = mutedCall(false, true);

// Both muted: both buttons read red; End keeps its look.
export const voiceBothMutedComposer = mutedCall(true, true);

// Text in the draft on a call: the primary button is Send, and End waits until the draft is empty again.
export const voiceCallDraftComposer = {
  ...voiceCallComposer,
  draft: readyComposer.draft,
} satisfies ComposerFixture;

// The call runs in another Session: the voice button's place holds a round button with a live dot that takes the person there.
export const callElsewhereComposer = {
  ...startedSessionComposer,
  voice: { kind: 'elsewhere', title: 'Fix flaky Feed sync test', onOpen: noop },
} satisfies ComposerFixture;
