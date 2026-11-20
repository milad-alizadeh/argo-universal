import type { VoiceCall, VoicePartial, VoiceStatus } from '@repo/contracts';
import type { ComposerVoice, ComposerVoiceMutes } from '#features/composer';
import type { VoiceEdgeBandProps } from '../components/conversation-band/conversation-band';
import type { VoiceMutes, VoiceSpectrum } from '../types/conversation-connection';
import { elapsedOf } from './voice-label';

// What the view asks of the App when the person presses something.
export interface SessionVoiceActions {
  start: () => void;
  end: () => void;
  setMicrophoneMuted: (muted: boolean) => void;
  setSpeakerMuted: (muted: boolean) => void;
  // Takes the person to a Session.
  open: (sessionId: string) => void;
}

export interface SessionVoiceInput {
  // The Server's standing for the one Voice call, as `voice.status` and `voice.watch` give it.
  status: VoiceStatus;
  // The Session the page shows.
  sessionId: string;
  // The time, for the call's timer.
  now: number;
  // What the connection holds muted; the connection is the only owner of it.
  mutes: VoiceMutes;
  // The App's own bands of speech, read by the band each frame.
  spectrum: () => VoiceSpectrum;
  // A Session's title as the Sessions list reads it, when it is known.
  titleOf: (sessionId: string) => string | undefined;
  actions: SessionVoiceActions;
}

// Everything a Session page draws of the Voice call.
export interface SessionVoice {
  // The Composer's voice slot: the voice button, End with its mutes, or the pointer; absent with nothing to offer.
  composer: ComposerVoice | undefined;
  // The band along the Composer's top edge, drawn while a call here connects or runs; only in the Session it runs in.
  band: VoiceEdgeBandProps | undefined;
  // What is being said now, drawn at the tail of the Feed; only in the Session the call runs in.
  partials: VoicePartial[];
}

const noPartials: VoicePartial[] = [];

const fallbackTitle = 'another Session';

// Whether the Composer offers the voice button: Voice calls are on and the Voice provider can start one.
const voiceOffered = (status: VoiceStatus): boolean =>
  status.enabled && status.availability.usable;

// The call is here when the Session is the one it runs in.
const hereOf = (
  call: VoiceStatus['call'],
  sessionId: string,
): VoiceCall | undefined => (call?.sessionId === sessionId ? call : undefined);

function mutesOf(
  mutes: VoiceMutes,
  actions: SessionVoiceActions,
): ComposerVoiceMutes {
  return {
    ...mutes,
    onMicrophone: () => actions.setMicrophoneMuted(!mutes.microphone),
    onSpeaker: () => actions.setSpeakerMuted(!mutes.speaker),
  };
}

// The call runs in another Session: the slot names it and takes the person there.
const elsewhereOf = (
  call: VoiceCall,
  input: NewSessionVoiceInput,
): ComposerVoice => ({
  kind: 'elsewhere',
  title: input.titleOf(call.sessionId) ?? fallbackTitle,
  onOpen: () => input.actions.open(call.sessionId),
});

// The call runs here: End, with the mutes once it is connected.
function hereSlotOf(call: VoiceCall, input: SessionVoiceInput): ComposerVoice {
  const onEnd = input.actions.end;

  return call.status === 'connected'
    ? { kind: 'connected', onEnd, mutes: mutesOf(input.mutes, input.actions) }
    : { kind: 'connecting', onEnd };
}

// No call runs: the voice button while one can start, and nothing otherwise.
const idleSlotOf = (input: NewSessionVoiceInput): ComposerVoice | undefined =>
  voiceOffered(input.status)
    ? { kind: 'start', onStart: input.actions.start }
    : undefined;

// The Composer's one voice slot, resolved here so the Composer only draws it.
function composerOf(input: SessionVoiceInput): ComposerVoice | undefined {
  const { call } = input.status;

  if (!call) return idleSlotOf(input);

  return call.sessionId === input.sessionId
    ? hereSlotOf(call, input)
    : elsewhereOf(call, input);
}

// What New Session needs for its slot: there is no Session yet, so nothing runs here and nothing is muted.
export type NewSessionVoiceInput = Pick<
  SessionVoiceInput,
  'status' | 'titleOf'
> & {
  actions: Pick<SessionVoiceActions, 'start' | 'open'>;
};

// New Session's voice slot: the voice button, or the pointer to a call that runs in a Session.
export function newSessionVoice(
  input: NewSessionVoiceInput,
): ComposerVoice | undefined {
  const { call } = input.status;

  return call ? elsewhereOf(call, input) : idleSlotOf(input);
}

function bandOf(
  here: VoiceCall | undefined,
  input: SessionVoiceInput,
): VoiceEdgeBandProps | undefined {
  return (
    here && {
      call: { ...here, microphoneMuted: input.mutes.microphone },
      elapsed: elapsedOf(here.startedAt, input.now),
      spectrum: input.spectrum,
    }
  );
}

/*
 * A Session's view of the Voice call: one answer, from the Server's status and the Session the page shows, to "is the
 * call here, elsewhere or none" and to everything drawn from it: the Composer's voice button, mutes and pointer, the
 * band along its edge, and the words being said. Mutes are read from the connection and never written by a page.
 */
export function sessionVoice(input: SessionVoiceInput): SessionVoice {
  const here = hereOf(input.status.call, input.sessionId);

  return {
    composer: composerOf(input),
    band: bandOf(here, input),
    partials: here ? input.status.partials : noPartials,
  };
}

// What the Composer's field says while a call runs here: it invites typing as well as talking once connected.
const placeholders: Partial<Record<ComposerVoice['kind'], string>> = {
  connecting: 'Connecting…',
  connected: 'Type, or keep talking',
};

export const voicePlaceholder = (
  voice: ComposerVoice | undefined,
): string | undefined => voice && placeholders[voice.kind];
