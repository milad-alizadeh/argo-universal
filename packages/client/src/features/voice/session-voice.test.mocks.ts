import {
  defaultVoiceCallOptions,
  type VoiceCall,
  type VoiceStatus,
} from '@repo/contracts';
import type { ComposerVoice } from '#features/composer';
import type { SessionVoiceInput } from './session-voice';
import { silentSpectrum } from './voice-connection';

const startedAt = '2026-11-18T10:00:00.000Z';

const now = Date.parse(startedAt) + 252_000;

export const callIn = (
  sessionId: string,
  changes: Partial<VoiceCall> = {},
): VoiceCall => ({
  callId: 'call-1',
  sessionId,
  status: 'connected',
  orb: 'listening',
  trouble: null,
  startedAt,
  ...changes,
});

export const statusOf = (
  call: VoiceCall | null,
  changes: Partial<VoiceStatus> = {},
): VoiceStatus => ({
  call,
  ended: null,
  partials: [],
  availability: { usable: true },
  enabled: true,
  volume: defaultVoiceCallOptions.volume,
  microphoneGain: defaultVoiceCallOptions.microphoneGain,
  ...changes,
});

export type Asked = string[];

// What the Session's view asks of the App, recorded in order.
export function inputOf(
  status: VoiceStatus,
  sessionId: string,
  asked: Asked = [],
): SessionVoiceInput {
  return {
    status,
    sessionId,
    now,
    mutes: { microphone: false, speaker: false },
    levels: () => ({ input: 0, output: 0 }),
    spectrum: silentSpectrum,
    titleOf: (id) => (id === 's-call' ? 'Fix the build' : undefined),
    actions: {
      start: () => asked.push('start'),
      end: () => asked.push('end'),
      setMicrophoneMuted: (muted) => asked.push(`microphone:${muted}`),
      setSpeakerMuted: (muted) => asked.push(`speaker:${muted}`),
      open: (id) => asked.push(`open:${id}`),
    },
  };
}

function handlerOf(slot: ComposerVoice): () => void {
  if ('onStart' in slot) return slot.onStart;

  return 'onEnd' in slot ? slot.onEnd : slot.onOpen;
}

// Presses what the voice slot offers: the voice button, End or the pointer.
export const press = (slot: ComposerVoice | undefined): void =>
  slot && handlerOf(slot)();
