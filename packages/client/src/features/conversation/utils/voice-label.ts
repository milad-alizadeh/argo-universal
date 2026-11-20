import type { Conversation, ConversationState } from '@repo/contracts';
import { formatCallTime } from '@repo/kit/format-elapsed';

// What the label needs of a call.
export type CallLook = Pick<Conversation, 'state' | 'trouble' | 'startedAt'> &
  Partial<Pick<Conversation, 'limit'>>;

export interface VoiceLabel {
  // The big line under the band.
  headline: string;
  // The small line: that this is a Conversation, how long it has run, and any allowance warning.
  detail: string;
}

const stateLabels: Record<ConversationState, string> = {
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
  call.trouble ? troubleLabels[call.trouble] : stateLabels[call.state];

const allowanceOf = (call: CallLook): string =>
  call.limit ? ` · ${Math.round(call.limit.remaining * percent)}% left` : '';

// The band's two lines: trouble shows in the headline in place of the state, with no dialog.
export function voiceLabel(call: CallLook, now: number): VoiceLabel {
  return {
    headline: headlineOf(call),
    detail: `Conversation · ${formatCallTime(call.startedAt, now)}${allowanceOf(call)}`,
  };
}
