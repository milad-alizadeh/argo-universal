import {
  defaultConversationOptions,
  type Conversation,
  type ConversationStatus,
} from '@repo/contracts';
import type { ComposerConversation } from '#features/composer';
import { silentSpectrum } from '../types/conversation-connection';
import type { SessionConversationInput } from './session-conversation';

const startedAt = '2026-11-18T10:00:00.000Z';

const now = Date.parse(startedAt) + 252_000;

export const callIn = (
  sessionId: string,
  changes: Partial<Conversation> = {},
): Conversation => ({
  conversationId: 'call-1',
  sessionId,
  status: 'connected',
  state: 'listening',
  trouble: null,
  startedAt,
  ...changes,
});

export const statusOf = (
  call: Conversation | null,
  changes: Partial<ConversationStatus> = {},
): ConversationStatus => ({
  conversation: call,
  ended: null,
  partials: [],
  availability: { usable: true },
  enabled: true,
  volume: defaultConversationOptions.volume,
  microphoneGain: defaultConversationOptions.microphoneGain,
  ...changes,
});

export type Asked = string[];

// What the Session's view asks of the App, recorded in order.
export function inputOf(
  status: ConversationStatus,
  sessionId: string,
  asked: Asked = [],
): SessionConversationInput {
  return {
    status,
    sessionId,
    now,
    mutes: { microphone: false, speaker: false },
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

function handlerOf(slot: ComposerConversation): () => void {
  if ('onStart' in slot) return slot.onStart;

  return 'onEnd' in slot ? slot.onEnd : slot.onOpen;
}

// Presses what the voice slot offers: the voice button, End or the pointer.
export const press = (slot: ComposerConversation | undefined): void =>
  slot && handlerOf(slot)();
