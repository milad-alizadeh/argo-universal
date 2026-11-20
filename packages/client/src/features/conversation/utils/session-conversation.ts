import type {
  Conversation,
  ConversationPartial,
  ConversationStatus,
} from '@repo/contracts';
import type {
  ComposerConversation,
  ComposerConversationMutes,
} from '#features/composer';
import type { ConversationBandProps } from '../components/conversation-band/conversation-band';
import type {
  ConversationMutes,
  VoiceSpectrum,
} from '../types/conversation-connection';
import { elapsedOf } from './voice-label';

// What the view asks of the App when the person presses something.
export interface SessionConversationActions {
  start: () => void;
  end: () => void;
  setMicrophoneMuted: (muted: boolean) => void;
  setSpeakerMuted: (muted: boolean) => void;
  // Takes the person to a Session.
  open: (sessionId: string) => void;
}

export interface SessionConversationInput {
  // The Server's standing for the one Conversation, as `conversation.status` and `conversation.watch` give it.
  status: ConversationStatus;
  // The Session the page shows.
  sessionId: string;
  // The time, for the call's timer.
  now: number;
  // What the connection holds muted; the connection is the only owner of it.
  mutes: ConversationMutes;
  // The App's own bands of speech, read by the band each frame.
  spectrum: () => VoiceSpectrum;
  // A Session's title as the Sessions list reads it, when it is known.
  titleOf: (sessionId: string) => string | undefined;
  actions: SessionConversationActions;
}

// Everything a Session page draws of the Conversation.
export interface SessionConversation {
  // The Composer's voice slot: the voice button, End with its mutes, or the pointer; absent with nothing to offer.
  composer: ComposerConversation | undefined;
  // The band along the Composer's top edge, drawn while a call here connects or runs; only in the Session it runs in.
  band: ConversationBandProps | undefined;
  // What is being said now, drawn at the tail of the Feed; only in the Session the call runs in.
  partials: ConversationPartial[];
}

const noPartials: ConversationPartial[] = [];

const fallbackTitle = 'another Session';

// Whether the Composer offers the voice button: Conversations are on and the Conversation provider can start one.
const conversationOffered = (status: ConversationStatus): boolean =>
  status.enabled && status.availability.usable;

// The call is here when the Session is the one it runs in.
const hereOf = (
  call: ConversationStatus['conversation'],
  sessionId: string,
): Conversation | undefined =>
  call?.sessionId === sessionId ? call : undefined;

function mutesOf(
  mutes: ConversationMutes,
  actions: SessionConversationActions,
): ComposerConversationMutes {
  return {
    ...mutes,
    onMicrophone: () => actions.setMicrophoneMuted(!mutes.microphone),
    onSpeaker: () => actions.setSpeakerMuted(!mutes.speaker),
  };
}

// The call runs in another Session: the slot names it and takes the person there.
const elsewhereOf = (
  call: Conversation,
  input: NewSessionConversationInput,
): ComposerConversation => ({
  kind: 'elsewhere',
  title: input.titleOf(call.sessionId) ?? fallbackTitle,
  onOpen: () => input.actions.open(call.sessionId),
});

// The call runs here: End, with the mutes once it is connected.
function hereSlotOf(
  call: Conversation,
  input: SessionConversationInput,
): ComposerConversation {
  const onEnd = input.actions.end;

  return call.status === 'connected'
    ? { kind: 'connected', onEnd, mutes: mutesOf(input.mutes, input.actions) }
    : { kind: 'connecting', onEnd };
}

// No call runs: the voice button while one can start, and nothing otherwise.
const idleSlotOf = (
  input: NewSessionConversationInput,
): ComposerConversation | undefined =>
  conversationOffered(input.status)
    ? { kind: 'start', onStart: input.actions.start }
    : undefined;

// The Composer's one voice slot, resolved here so the Composer only draws it.
function composerOf(
  input: SessionConversationInput,
): ComposerConversation | undefined {
  const { conversation: call } = input.status;

  if (!call) return idleSlotOf(input);

  return call.sessionId === input.sessionId
    ? hereSlotOf(call, input)
    : elsewhereOf(call, input);
}

// What New Session needs for its slot: there is no Session yet, so nothing runs here and nothing is muted.
export type NewSessionConversationInput = Pick<
  SessionConversationInput,
  'status' | 'titleOf'
> & {
  actions: Pick<SessionConversationActions, 'start' | 'open'>;
};

// New Session's voice slot: the voice button, or the pointer to a call that runs in a Session.
export function newSessionConversation(
  input: NewSessionConversationInput,
): ComposerConversation | undefined {
  const { conversation: call } = input.status;

  return call ? elsewhereOf(call, input) : idleSlotOf(input);
}

function bandOf(
  here: Conversation | undefined,
  input: SessionConversationInput,
): ConversationBandProps | undefined {
  return (
    here && {
      call: { ...here, microphoneMuted: input.mutes.microphone },
      elapsed: elapsedOf(here.startedAt, input.now),
      spectrum: input.spectrum,
    }
  );
}

/*
 * A Session's view of the Conversation: one answer, from the Server's status and the Session the page shows, to "is the
 * call here, elsewhere or none" and to everything drawn from it: the Composer's voice button, mutes and pointer, the
 * band along its edge, and the words being said. Mutes are read from the connection and never written by a page.
 */
export function sessionConversation(
  input: SessionConversationInput,
): SessionConversation {
  const here = hereOf(input.status.conversation, input.sessionId);

  return {
    composer: composerOf(input),
    band: bandOf(here, input),
    partials: here ? input.status.partials : noPartials,
  };
}

// What the Composer's field says while a call runs here: it invites typing as well as talking once connected.
const placeholders: Partial<Record<ComposerConversation['kind'], string>> = {
  connecting: 'Connecting…',
  connected: 'Type, or keep talking',
};

export const conversationPlaceholder = (
  voice: ComposerConversation | undefined,
): string | undefined => voice && placeholders[voice.kind];
