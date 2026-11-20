import { describe, expect, it } from 'vitest';
import { bandLookOf } from './band-state';

const call = {
  state: 'listening',
  trouble: null,
  microphoneMuted: false,
} as const;

describe('what the band shows of a call', () => {
  it('says each state in its own word, with the timer once the call is up', () => {
    expect(bandLookOf(call)).toMatchObject({
      state: 'listening',
      label: 'Listening',
      timer: true,
    });
    expect(bandLookOf({ ...call, state: 'talking' })).toMatchObject({
      state: 'talking',
      label: 'Talking',
    });
    expect(bandLookOf({ ...call, state: 'thinking' })).toMatchObject({
      state: 'thinking',
      label: 'Thinking',
    });
    expect(bandLookOf({ ...call, state: 'none' })).toMatchObject({
      state: 'connecting',
      label: 'Connecting…',
      timer: false,
    });
  });

  it('puts a muted microphone before what the call is doing, and trouble before both', () => {
    expect(
      bandLookOf({ ...call, state: 'talking', microphoneMuted: true }),
    ).toMatchObject({ state: 'muted', label: 'Mic off', tone: 'danger' });
    expect(
      bandLookOf({ ...call, microphoneMuted: true, trouble: 'reconnecting' }),
    ).toMatchObject({
      state: 'reconnecting',
      label: 'Reconnecting…',
      timer: true,
    });
    expect(
      bandLookOf({ ...call, trouble: 'microphone-blocked' }),
    ).toMatchObject({ state: 'blocked', label: 'Mic blocked', tone: 'danger' });
  });
});
