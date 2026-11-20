import { describe, expect, it } from 'vitest';
import type { ComposerVoice } from '#features/composer';
import { voicePlaceholder } from './session-conversation';

const noop = (): void => {};

const mutes = {
  microphone: false,
  speaker: false,
  onMicrophone: noop,
  onSpeaker: noop,
};

describe('the Composer field during a call', () => {
  it.each<[string, ComposerVoice | undefined, string | undefined]>([
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
    expect(voicePlaceholder(voice)).toBe(expected);
  });
});
