import { describe, expect, it } from 'vitest';
import { operationCaller, runOperation } from '#mocks/operations';
import {
  callOf,
  offer,
  openConversationSession,
  startConversationEngine,
} from '#mocks/conversation-engine';

const appOnly = [
  'session.submit',
  'session.queue',
  'conversation.status',
  'conversation.end',
  'conversation.setSettings',
  'voice.preview',
];

describe('the App-only Operations an Agent is refused', () => {
  it('lists hanging up and what the next call speaks with to an Agent', async () => {
    const session = await openConversationSession(await startConversationEngine());

    const listed = await session.caller.operations.list.query({
      filter: 'voice',
    });

    expect(listed.map(({ id }) => id).sort()).toEqual([
      'conversation.chooseDevices',
      'voice.deleteCustomVoice',
      'conversation.getSettings',
      'conversation.hangUp',
      'conversation.listDevices',
      'voice.listVoices',
      'voice.saveCustomVoice',
      'conversation.setOptions',
      'conversation.setInstructions',
      'voice.setVoice',
    ]);
  });

  it('lets an Agent read the voices and the Conversation settings', async () => {
    const session = await openConversationSession(await startConversationEngine());

    const voices = await runOperation(session.caller.operations, {
      id: 'voice.listVoices',
      params: {},
      wait: true,
    });

    const settings = await runOperation(session.caller.operations, {
      id: 'conversation.getSettings',
      params: {},
      wait: true,
    });

    expect(voices).toEqual({
      voices: [{ kind: 'builtIn', id: 'fake', label: 'Fake voice' }],
    });
    expect(settings).toMatchObject({ voice: 'fake', instructions: '' });
  });

  it('lets the command line change the voice and the instructions', async () => {
    const { host } = await startConversationEngine();
    const cli = await operationCaller(host);

    await runOperation(cli.operations, {
      id: 'voice.saveCustomVoice',
      params: { label: 'Calm', baseVoice: 'fake', description: 'Slow, low.' },
    });
    await runOperation(cli.operations, {
      id: 'conversation.setInstructions',
      params: { instructions: 'Call me Sam.' },
    });

    expect(await host.caller.conversation.getSettings()).toMatchObject({
      customVoices: [{ label: 'Calm' }],
      instructions: 'Call me Sam.',
    });
  });

  it.each(appOnly)('refuses %s run by an Agent', async (id) => {
    const session = await openConversationSession(await startConversationEngine());

    await expect(
      runOperation(session.caller.operations, {
        id,
        params: { sessionId: session.sessionId, offer },
        wait: true,
      }),
    ).rejects.toThrow('Only an App');
  });

  it('starts no call for an Agent that asks for one', async () => {
    const voice = await startConversationEngine();
    const session = await openConversationSession(voice);

    await expect(
      runOperation(session.caller.operations, {
        id: 'conversation.start',
        params: { sessionId: session.sessionId, offer },
        wait: true,
      }),
    ).rejects.toThrow('Only an App');
    expect(await callOf(voice.host)).toBeNull();
  });
});
