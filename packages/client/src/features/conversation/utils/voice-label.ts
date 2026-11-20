import type { Conversation, ConversationState } from '@repo/contracts';

// What the label needs of a call.
export type CallLook = Pick<Conversation, 'state' | 'trouble' | 'startedAt'> &
  Partial<Pick<Conversation, 'limit'>>;

export interface VoiceLabel {
  // The big line under the band.
  headline: string;
  // The small line: that this is a Conversation, how long it has run, and any allowance warning.
  detail: string;
}

const millisecondsPerSecond = 1000;

const secondsPerMinute = 60;

const secondsPerHour = 3600;

const two = (value: number): string => String(value).padStart(2, '0');

// How long the call has run, as the timer reads it: `4:12`, or `1:01:01` past an hour. Zero until the call connects.
export function elapsedOf(startedAt: string | null, now: number): string {
  const started = startedAt === null ? now : Date.parse(startedAt);

  const seconds = Math.max(
    0,
    Math.floor((now - started) / millisecondsPerSecond),
  );

  const hours = Math.floor(seconds / secondsPerHour);
  const minutes = Math.floor((seconds % secondsPerHour) / secondsPerMinute);
  const rest = two(seconds % secondsPerMinute);

  return hours > 0 ? `${hours}:${two(minutes)}:${rest}` : `${minutes}:${rest}`;
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
    detail: `Conversation · ${elapsedOf(call.startedAt, now)}${allowanceOf(call)}`,
  };
}
