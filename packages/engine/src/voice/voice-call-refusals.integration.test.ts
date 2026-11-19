import { describe, expect, it } from 'vitest';
import {
  callOf,
  offer,
  openVoiceSession,
  startVoiceEngine,
} from '#mocks/voice-engine';

// Two starts asked at once both pass every check before either reaches the machine; the one that loses is refused as a second call is.
describe('Voice call refusals', () => {
  it('refuses the losing start of two asked at once as a second call', async () => {
    const voice = await startVoiceEngine();
    const { host, provider } = voice;
    const first = await openVoiceSession(voice);
    const second = await openVoiceSession(voice);

    const starts = await Promise.allSettled([
      host.caller.voice.start({ sessionId: first.sessionId, offer }),
      host.caller.voice.start({ sessionId: second.sessionId, offer }),
    ]);

    expect(starts.map(({ status }) => status)).toEqual([
      'fulfilled',
      'rejected',
    ]);
    expect(starts[1]).toMatchObject({
      reason: { code: 'CONFLICT', message: 'A Voice call is already running' },
    });
    expect(provider.calls).toHaveLength(1);
    expect(await callOf(host)).toMatchObject({ sessionId: first.sessionId });
  });
});
