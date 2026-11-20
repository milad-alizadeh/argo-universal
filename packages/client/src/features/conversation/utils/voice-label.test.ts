import { describe, expect, it } from 'vitest';
import { voiceLabel, type CallLook } from './voice-label';

const startedAt = '2026-11-18T10:00:00.000Z';

const at = (seconds: number): number => Date.parse(startedAt) + seconds * 1000;

const call: CallLook = {
  state: 'listening',
  trouble: null,
  startedAt,
};

describe('the label under the band', () => {
  it('names the band state and the elapsed time', () => {
    expect(voiceLabel(call, at(252))).toEqual({
      headline: 'Listening',
      detail: 'Conversation · 4:12',
    });
    expect(voiceLabel({ ...call, state: 'talking' }, at(0)).headline).toBe(
      'Talking',
    );
    expect(voiceLabel({ ...call, state: 'thinking' }, at(0)).headline).toBe(
      'Thinking',
    );
  });

  it('says connecting until the call has connected', () => {
    const connecting = {
      ...call,
      state: 'none',
    } as const;

    expect(voiceLabel(connecting, at(0)).headline).toBe('Connecting…');
  });

  it('says the trouble in place of the state, with no dialog', () => {
    const reconnecting = {
      ...call,
      state: 'none',
      trouble: 'reconnecting',
    } as const;

    const blocked = { ...call, trouble: 'microphone-blocked' } as const;

    expect(voiceLabel(reconnecting, at(30)).headline).toBe('Reconnecting…');
    expect(voiceLabel(blocked, at(30)).headline).toBe('Microphone blocked');
  });

  it('adds what is left of the provider allowance once it reports low', () => {
    const low = voiceLabel({ ...call, limit: { remaining: 0.1 } }, at(252));

    expect(low.detail).toBe('Conversation · 4:12 · 10% left');
  });

  it('says the trouble over connecting, when the call is still connecting', () => {
    const blocked = {
      ...call,
      state: 'none',
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
      detail: 'Conversation · 4:12 · 25% left',
    });
  });
});
