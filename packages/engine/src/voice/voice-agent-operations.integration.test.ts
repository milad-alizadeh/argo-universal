import { describe, expect, it } from 'vitest';
import { runOperation } from '#mocks/operations';
import {
  callOf,
  offer,
  openVoiceSession,
  startVoiceEngine,
} from '#mocks/voice-engine';

const appOnly = [
  'voice.status',
  'voice.start',
  'voice.end',
  'voice.getSettings',
  'voice.setSettings',
];

describe('the Voice call Operations an Agent sees', () => {
  it('lists only voice.hangUp to an Agent', async () => {
    const session = await openVoiceSession(await startVoiceEngine());

    const listed = await session.caller.operations.list.query({
      filter: 'voice',
    });

    expect(listed.map(({ id }) => id)).toEqual(['voice.hangUp']);
  });

  it.each(appOnly)('refuses %s run by an Agent', async (id) => {
    const session = await openVoiceSession(await startVoiceEngine());

    await expect(
      runOperation(session.caller.operations, {
        id,
        params: { sessionId: session.sessionId, offer },
        wait: true,
      }),
    ).rejects.toThrow('Only an App');
  });

  it('starts no call for an Agent that asks for one', async () => {
    const voice = await startVoiceEngine();
    const session = await openVoiceSession(voice);

    await runOperation(session.caller.operations, {
      id: 'voice.start',
      params: { sessionId: session.sessionId, offer },
      wait: true,
    }).catch(() => null);

    expect(await callOf(voice.host)).toBeNull();
  });
});
