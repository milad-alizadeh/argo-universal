import type { VoiceStatus } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { voiceOffered } from './voice-offer';

const status = (
  enabled: boolean,
  availability: VoiceStatus['availability'],
): VoiceStatus => ({
  call: null,
  ended: null,
  partials: [],
  availability,
  enabled,
});

// What the Composer's `voice.usable` is set from; an unusable one draws no voice button (composer-conditions).
describe('the voice button is offered', () => {
  it('while Voice calls are on and the provider is usable', () => {
    expect(voiceOffered(status(true, { usable: true }))).toBe(true);
  });

  it('never with the switch off, even for a usable provider', () => {
    expect(voiceOffered(status(false, { usable: true }))).toBe(false);
  });

  it('not for a provider that cannot be used', () => {
    expect(voiceOffered(status(true, { usable: false, reason: 'No' }))).toBe(
      false,
    );
  });
});
