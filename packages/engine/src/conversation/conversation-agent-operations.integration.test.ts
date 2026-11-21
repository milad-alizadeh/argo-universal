import { describe, expect, it } from 'vitest';
import {
  callOf,
  offer,
  openConversationSession,
  startConversationEngine,
} from '#mocks/conversation-engine';
import { operationCaller, runOperation } from '#mocks/operations';

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
    const session = await openConversationSession(
      await startConversationEngine(),
    );

    const listed = await session.caller.operations.list.query({
      filter: 'voice',
    });

    // Ranked search keeps only strong matches, and hanging up now reads as a Conversation's, so it is asked for by its own words.
    const hangingUp = await session.caller.operations.list.query({
      filter: 'hang up',
    });

    expect(hangingUp.map(({ id }) => id)).toContain('conversation.hangUp');
    expect(listed.map(({ id }) => id).sort()).toEqual([
      'conversation.chooseDevices',
      'conversation.getSettings',
      'conversation.listDevices',
      'conversation.setInstructions',
      'conversation.setOptions',
      'voice.deleteCustomVoice',
      'voice.listVoices',
      'voice.saveCustomVoice',
      'voice.setVoice',
    ]);
  });

  it('lets an Agent read the voices and the Conversation settings', async () => {
    const session = await openConversationSession(
      await startConversationEngine(),
    );

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

  it('requires approval to change the voice and instructions and allows the App action', async () => {
    const { host } = await startConversationEngine();
    const cli = await operationCaller(host);
    const instructions = 'Call me Sam.';

    const voice = {
      label: 'Calm',
      baseVoice: 'fake',
      description: 'Slow, low.',
    };

    await expect(
      runOperation(cli.operations, {
        id: 'voice.saveCustomVoice',
        params: voice,
      }),
    ).rejects.toThrow('active Turn');
    await expect(
      runOperation(cli.operations, {
        id: 'conversation.setInstructions',
        params: { instructions },
      }),
    ).rejects.toThrow('active Turn');
    await host.caller.voice.saveCustomVoice(voice);
    await host.caller.conversation.setInstructions({ instructions });

    expect(await host.caller.conversation.getSettings()).toMatchObject({
      customVoices: [{ label: 'Calm' }],
      instructions: 'Call me Sam.',
    });
  });

  it.each(appOnly)('refuses %s run by an Agent', async (id) => {
    const session = await openConversationSession(
      await startConversationEngine(),
    );

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
