import type { VoiceCall, VoiceOrbState } from '@repo/contracts';
import { formatCallTime } from '@repo/kit/format-elapsed';

// What the label needs of a call.
export type CallLook = Pick<VoiceCall, 'orb' | 'trouble' | 'startedAt'> &
  Partial<Pick<VoiceCall, 'limit'>>;

export interface VoiceLabel {
  // The big line under the orb.
  headline: string;
  // The small line: that this is a Voice call, how long it has run, and any allowance warning.
  detail: string;
}

const stateLabels: Record<VoiceOrbState, string> = {
  listening: 'Listening',
  talking: 'Talking',
  thinking: 'Thinking',
  none: 'Connecting…',
};

const troubleLabels = {
  reconnecting: 'Reconnecting…',
  'microphone-blocked': 'Microphone blocked',
} as const;

const percent = 100;

const headlineOf = (call: CallLook): string =>
  call.trouble ? troubleLabels[call.trouble] : stateLabels[call.orb];

const allowanceOf = (call: CallLook): string =>
  call.limit ? ` · ${Math.round(call.limit.remaining * percent)}% left` : '';

// The orb's two lines: trouble shows in the headline in place of the state, with no dialog.
export function voiceLabel(call: CallLook, now: number): VoiceLabel {
  return {
    headline: headlineOf(call),
    detail: `Voice · ${formatCallTime(call.startedAt, now)}${allowanceOf(call)}`,
  };
}
