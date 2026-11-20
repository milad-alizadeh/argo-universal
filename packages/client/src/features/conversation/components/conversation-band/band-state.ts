import type { VoiceCall } from '@repo/contracts';
import { voiceLabel } from '../../utils/voice-label';
import type { BandState } from './band-motion';

// What the band needs of the call: its state, its trouble and whether the person's microphone is muted.
export type EdgeCall = Pick<VoiceCall, 'orb' | 'trouble'> & {
  microphoneMuted: boolean;
};

export interface BandLook {
  state: BandState;
  label: string;
  tone: 'neutral' | 'muted' | 'danger';
  // Whether the call's timer shows beside the label: not until the call connects.
  timer: boolean;
}

const orbStates = {
  none: 'connecting',
  listening: 'listening',
  talking: 'talking',
  thinking: 'thinking',
} as const satisfies Record<VoiceCall['orb'], BandState>;

const troubleStates = {
  reconnecting: 'reconnecting',
  'microphone-blocked': 'blocked',
} as const satisfies Record<NonNullable<VoiceCall['trouble']>, BandState>;

// Trouble first, then a muted microphone, then what the call is doing.
function stateOf(call: EdgeCall): BandState {
  if (call.trouble) return troubleStates[call.trouble];

  return call.microphoneMuted ? 'muted' : orbStates[call.orb];
}

const words: Partial<Record<BandState, string>> = {
  muted: 'Mic off',
  blocked: 'Mic blocked',
};

const tones: Record<BandState, BandLook['tone']> = {
  connecting: 'muted',
  listening: 'neutral',
  talking: 'neutral',
  thinking: 'neutral',
  reconnecting: 'neutral',
  muted: 'danger',
  blocked: 'danger',
};

const wordOf = (call: EdgeCall, state: BandState): string =>
  words[state] ?? voiceLabel({ ...call, startedAt: null }, 0).headline;

export function bandLookOf(call: EdgeCall): BandLook {
  const state = stateOf(call);

  return {
    state,
    label: wordOf(call, state),
    tone: tones[state],
    timer: state !== 'connecting',
  };
}
