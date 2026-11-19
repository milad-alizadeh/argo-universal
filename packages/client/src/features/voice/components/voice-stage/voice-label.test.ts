import { describe, expect, it } from 'vitest';
import { elapsedOf, voiceLabel, type CallLook } from './voice-label';

const startedAt = '2026-11-18T10:00:00.000Z';

const at = (seconds: number): number => Date.parse(startedAt) + seconds * 1000;

const call: CallLook = {
  orb: 'listening',
  trouble: null,
  startedAt,
};

describe('the call timer', () => {
  it('reads minutes and seconds', () => {
    expect(elapsedOf(startedAt, at(252))).toBe('4:12');
    expect(elapsedOf(startedAt, at(5))).toBe('0:05');
  });

  it('reads hours once a call runs that long', () => {
    expect(elapsedOf(startedAt, at(3600 + 61))).toBe('1:01:01');
  });

  it('reads zero before the call has connected, and never goes negative', () => {
    expect(elapsedOf(null, at(10))).toBe('0:00');
    expect(elapsedOf(startedAt, at(-4))).toBe('0:00');
  });
});

describe('the label under the orb', () => {
  it('names the orb state and the elapsed time', () => {
    expect(voiceLabel(call, at(252))).toEqual({
      headline: 'Listening',
      detail: 'Voice · 4:12',
    });
    expect(voiceLabel({ ...call, orb: 'talking' }, at(0)).headline).toBe(
      'Talking',
    );
    expect(voiceLabel({ ...call, orb: 'thinking' }, at(0)).headline).toBe(
      'Thinking',
    );
  });

  it('says connecting until the call has connected', () => {
    const connecting = {
      ...call,
      orb: 'none',
    } as const;

    expect(voiceLabel(connecting, at(0)).headline).toBe('Connecting…');
  });

  it('says the trouble in place of the state, with no dialog', () => {
    const reconnecting = {
      ...call,
      orb: 'none',
      trouble: 'reconnecting',
    } as const;

    const blocked = { ...call, trouble: 'microphone-blocked' } as const;

    expect(voiceLabel(reconnecting, at(30)).headline).toBe('Reconnecting…');
    expect(voiceLabel(blocked, at(30)).headline).toBe('Microphone blocked');
  });

  it('adds what is left of the provider allowance once it reports low', () => {
    const low = voiceLabel({ ...call, limit: { remaining: 0.1 } }, at(252));

    expect(low.detail).toBe('Voice · 4:12 · 10% left');
  });

  it('says the trouble over connecting, when the call is still connecting', () => {
    const blocked = {
      ...call,
      orb: 'none',
      trouble: 'microphone-blocked',
    } as const;

    expect(voiceLabel(blocked, at(5)).headline).toBe('Microphone blocked');
  });

  it('adds the allowance beside trouble, in the line under it', () => {
    const both = {
      ...call,
      trouble: 'reconnecting',
      limit: { remaining: 0.25 },
    } as const;

    expect(voiceLabel(both, at(252))).toEqual({
      headline: 'Reconnecting…',
      detail: 'Voice · 4:12 · 25% left',
    });
  });
});
