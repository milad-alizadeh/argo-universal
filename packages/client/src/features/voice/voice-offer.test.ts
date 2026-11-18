import type { VoiceStatus } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { composerVoice } from './voice-offer';

const noop = (): void => {};

const handlers = { onStart: noop, onEnd: noop };

const status = (
  enabled: boolean,
  availability: VoiceStatus['availability'],
  call: VoiceStatus['call'] = null,
): VoiceStatus => ({
  call,
  ended: null,
  partials: [],
  availability,
  enabled,
});

// `usable` is what the Composer draws the voice button from: an unusable one draws none (composer-conditions).
describe('the Composer voice state', () => {
  it('offers the voice button while Voice calls are on and the provider is usable', () => {
    expect(
      composerVoice(status(true, { usable: true }), 's1', handlers).usable,
    ).toBe(true);
  });

  it('never offers it with the switch off, even for a usable provider', () => {
    expect(
      composerVoice(status(false, { usable: true }), 's1', handlers).usable,
    ).toBe(false);
  });

  it('does not offer it for a provider that cannot be used', () => {
    const unusable = status(true, { usable: false, reason: 'No' });

    expect(composerVoice(unusable, 's1', handlers).usable).toBe(false);
  });

  it('places the call here or elsewhere by Session', () => {
    const call = {
      callId: 'c1',
      sessionId: 's1',
      status: 'connected',
      connection: 'connected',
      orb: 'listening',
      trouble: null,
      startedAt: '2026-11-18T10:00:00.000Z',
    } as const;

    const running = status(true, { usable: true }, call);

    expect(composerVoice(running, 's1', handlers).call).toBe('connected');
    expect(composerVoice(running, 's2', handlers).call).toBe('elsewhere');
  });

  it('hands the mute buttons to a connected call only', () => {
    const mutes = {
      microphone: false,
      speaker: true,
      onMicrophone: noop,
      onSpeaker: noop,
    };

    const call = {
      callId: 'c1',
      sessionId: 's1',
      status: 'connecting',
      connection: 'connecting',
      orb: 'none',
      trouble: null,
      startedAt: null,
    } as const;

    const connecting = status(true, { usable: true }, call);

    const connected = status(
      true,
      { usable: true },
      { ...call, status: 'connected' },
    );

    expect(
      composerVoice(connecting, 's1', { ...handlers, mutes }).mutes,
    ).toBeUndefined();
    expect(composerVoice(connected, 's1', { ...handlers, mutes }).mutes).toBe(
      mutes,
    );
    expect(
      composerVoice(connected, 's2', { ...handlers, mutes }).mutes,
    ).toBeUndefined();
  });

  it('points at the Session the call runs in, from another Session only', () => {
    const elsewhere = { title: 'Fix the build', onOpen: noop };

    const call = {
      callId: 'c1',
      sessionId: 's1',
      status: 'connected',
      connection: 'connected',
      orb: 'listening',
      trouble: null,
      startedAt: '2026-11-18T10:00:00.000Z',
    } as const;

    const running = status(true, { usable: true }, call);

    expect(
      composerVoice(running, 's2', { ...handlers, elsewhere }).elsewhere,
    ).toBe(elsewhere);
    expect(
      composerVoice(running, 's1', { ...handlers, elsewhere }).elsewhere,
    ).toBeUndefined();
  });
});
