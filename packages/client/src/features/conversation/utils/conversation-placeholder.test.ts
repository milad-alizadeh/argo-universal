import { describe, expect, it } from 'vitest';
import type { ComposerConversation } from '#features/composer';
import { conversationPlaceholder } from './session-conversation';

const noop = (): void => {};

const mutes = {
  microphone: false,
  speaker: false,
  onMicrophone: noop,
  onSpeaker: noop,
};

describe('the Composer field during a call', () => {
  it.each<[string, ComposerConversation | undefined, string | undefined]>([
    ['connecting', { kind: 'connecting', onEnd: noop }, 'Connecting…'],
    [
      'connected',
      { kind: 'connected', onEnd: noop, mutes },
      'Type, or keep talking',
    ],
    ['start', { kind: 'start', onStart: noop }, undefined],
    ['absent', undefined, undefined],
    ['elsewhere', { kind: 'elsewhere', title: 'T', onOpen: noop }, undefined],
  ])('is %s -> %s', (_name, voice, expected) => {
    expect(conversationPlaceholder(voice)).toBe(expected);
  });
});
