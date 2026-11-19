import type { VoiceCall, VoicePartial, VoiceStatus } from '@repo/contracts';
import type { ComposerVoice, ComposerVoiceCall } from '#features/composer';
import { voiceLabel } from './components/voice-stage/voice-label';
import type { VoiceStageViewProps } from './components/voice-stage/voice-stage-view';
import type { VoiceLevels, VoiceMutes } from './voice-connection';

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
  // The App's own levels, read by the orb each frame.
  levels: () => VoiceLevels;
  // A Session's title as the Sessions list reads it, when it is known.
  titleOf: (sessionId: string) => string | undefined;
  actions: SessionVoiceActions;
}

// Everything a Session page draws of the Voice call.
export interface SessionVoice {
  // The Composer's voice button, mutes and pointer.
  composer: ComposerVoice;
  // The orb pinned above the Feed; only in the Session the call runs in.
  stage: VoiceStageViewProps | undefined;
  // What is being said now, drawn at the tail of the Feed; only in the Session the call runs in.
  partials: VoicePartial[];
}

const noPartials: VoicePartial[] = [];

const fallbackTitle = 'another Session';

// Where the call is, as this Session sees it: none, starting or running here, or running in another Session.
function placementOf(
  call: VoiceStatus['call'],
  sessionId: string,
): ComposerVoiceCall {
  if (!call) return 'none';

  return call.sessionId === sessionId ? call.status : 'elsewhere';
}

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
): NonNullable<ComposerVoice['mutes']> {
  return {
    ...mutes,
    onMicrophone: () => actions.setMicrophoneMuted(!mutes.microphone),
    onSpeaker: () => actions.setSpeakerMuted(!mutes.speaker),
  };
}

function elsewhereOf(
  call: VoiceCall,
  input: SessionVoiceInput,
): NonNullable<ComposerVoice['elsewhere']> {
  return {
    title: input.titleOf(call.sessionId) ?? fallbackTitle,
    onOpen: () => input.actions.open(call.sessionId),
  };
}

// The pointer belongs to the call in another Session.
const pointerOf = (
  placement: ComposerVoiceCall,
  input: SessionVoiceInput,
): ComposerVoice['elsewhere'] =>
  placement === 'elsewhere' && input.status.call
    ? elsewhereOf(input.status.call, input)
    : undefined;

// The Composer's voice: the mute buttons belong to the connected call here, the pointer to the call in another Session.
function composerOf(input: SessionVoiceInput): ComposerVoice {
  const { status, sessionId, actions } = input;
  const call = placementOf(status.call, sessionId);

  return {
    usable: voiceOffered(status),
    call,
    onStart: actions.start,
    onEnd: actions.end,
    mutes: call === 'connected' ? mutesOf(input.mutes, actions) : undefined,
    elsewhere: pointerOf(call, input),
  };
}

function stageOf(
  here: VoiceCall | undefined,
  input: SessionVoiceInput,
): VoiceStageViewProps | undefined {
  return (
    here && {
      state: here.orb,
      levels: input.levels,
      label: voiceLabel(here, input.now),
    }
  );
}

/*
 * A Session's view of the Voice call: one answer, from the Server's status and the Session the page shows, to "is the
 * call here, elsewhere or none" and to everything drawn from it: the Composer's voice button, mutes and pointer, the
 * orb pinned above the Feed, and the words being said. Mutes are read from the connection and never written by a page.
 */
export function sessionVoice(input: SessionVoiceInput): SessionVoice {
  const here = hereOf(input.status.call, input.sessionId);

  return {
    composer: composerOf(input),
    stage: stageOf(here, input),
    partials: here ? input.status.partials : noPartials,
  };
}

// What the Composer's field says while a call runs here: it invites typing as well as talking once connected.
const placeholders: Partial<Record<ComposerVoiceCall, string>> = {
  connecting: 'Connecting…',
  connected: 'Type, or keep talking',
};

export const voicePlaceholder = (call: ComposerVoiceCall): string | undefined =>
  placeholders[call];
