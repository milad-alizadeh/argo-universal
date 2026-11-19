import { describe, expect, it } from 'vitest';
import { voicePlaceholder } from './session-voice';

describe('the Composer field during a call', () => {
  it.each([
    ['connecting', 'Connecting…'],
    ['connected', 'Type, or keep talking'],
    ['none', undefined],
    ['elsewhere', undefined],
  ] as const)('is %s -> %s', (call, expected) => {
    expect(voicePlaceholder(call)).toBe(expected);
  });
});
