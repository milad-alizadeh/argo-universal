import { describe, expect, it } from 'vitest';
import { operationCaller, runOperation } from '#mocks/operations';
import {
  callOf,
  offer,
  openVoiceSession,
  startVoiceEngine,
} from '#mocks/voice-engine';

const appOnly = [
  'session.submit',
  'session.queue',
  'voice.status',
  'voice.end',
  'voice.setSettings',
  'voice.preview',
];

describe('the App-only Operations an Agent is refused', () => {
  it('lists hanging up and what the next call speaks with to an Agent', async () => {
    const session = await openVoiceSession(await startVoiceEngine());

    const listed = await session.caller.operations.list.query({
      filter: 'voice',
    });

    expect(listed.map(({ id }) => id).sort()).toEqual([
      'voice.deleteCustomVoice',
      'voice.getSettings',
      'voice.hangUp',
      'voice.listVoices',
      'voice.saveCustomVoice',
      'voice.setCallOptions',
      'voice.setInstructions',
      'voice.setVoice',
    ]);
  });

  it('lets an Agent read the voices and the Voice settings', async () => {
    const session = await openVoiceSession(await startVoiceEngine());

    const voices = await runOperation(session.caller.operations, {
      id: 'voice.listVoices',
      params: {},
      wait: true,
    });

    const settings = await runOperation(session.caller.operations, {
      id: 'voice.getSettings',
      params: {},
      wait: true,
    });

    expect(voices).toEqual({
      voices: [{ kind: 'builtIn', id: 'fake', label: 'Fake voice' }],
    });
    expect(settings).toMatchObject({ voice: 'fake', instructions: '' });
  });

  it('lets the command line change the voice and the instructions', async () => {
    const { host } = await startVoiceEngine();
    const cli = await operationCaller(host);

    await runOperation(cli.operations, {
      id: 'voice.saveCustomVoice',
      params: { label: 'Calm', baseVoice: 'fake', description: 'Slow, low.' },
    });
    await runOperation(cli.operations, {
      id: 'voice.setInstructions',
      params: { instructions: 'Call me Sam.' },
    });

    expect(await host.caller.voice.getSettings()).toMatchObject({
      customVoices: [{ label: 'Calm' }],
      instructions: 'Call me Sam.',
    });
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

    await expect(
      runOperation(session.caller.operations, {
        id: 'voice.start',
        params: { sessionId: session.sessionId, offer },
        wait: true,
      }),
    ).rejects.toThrow('Only an App');
    expect(await callOf(voice.host)).toBeNull();
  });
});
