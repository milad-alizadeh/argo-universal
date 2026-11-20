import { join } from 'node:path';
import { openDatabase } from '@repo/db';
import { serverSettings } from '@repo/db/schema';
import { describe, expect, it, vi } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import {
  offer,
  openConversationSession,
  startConversationEngine,
} from '#mocks/conversation-engine';
import { operationCaller, runOperation } from '#mocks/operations';
import { FakeConversationProvider } from './fake-provider';

const greeting = 'Greet the person as Sam.';

const setConversationOptions = 'conversation.setOptions';

describe('Conversation options', () => {
  it('start with the filler on, no opening, five idle minutes and full volume', async () => {
    const { host } = await startConversationEngine();

    expect((await host.caller.conversation.getSettings()).options).toEqual({
      filler: true,
      opening: '',
      idleSeconds: 300,
      volume: 100,
      microphoneGain: 100,
    });
  });

  it('change only what is given, and survive an Engine restart', async () => {
    const { host } = await startConversationEngine();

    await host.caller.conversation.setOptions({ filler: false, volume: 40 });
    await host.caller.conversation.setOptions({ opening: greeting });
    await host.stop();

    const restarted = await startAcpEngine({
      steps: [],
      restartOver: host.home,
      conversationProvider: new FakeConversationProvider(),
    });

    expect(
      (await restarted.caller.conversation.getSettings()).options,
    ).toMatchObject({
      filler: false,
      volume: 40,
      opening: greeting,
      idleSeconds: 300,
    });
  });

  it('give the next call the filler and the opening', async () => {
    const voice = await startConversationEngine();
    const { host, provider } = voice;
    const { sessionId } = await openConversationSession(voice);
    await host.caller.conversation.setOptions({
      filler: false,
      opening: greeting,
    });

    await host.caller.conversation.start({ sessionId, offer });

    expect(provider.call.request).toMatchObject({
      filler: false,
      opening: greeting,
    });
  });

  it('tell every Device the volume, so a running call follows it at once', async () => {
    const { host } = await startConversationEngine();

    await host.caller.conversation.setOptions({
      volume: 25,
      microphoneGain: 150,
    });

    expect(await host.caller.conversation.status()).toMatchObject({
      volume: 25,
      microphoneGain: 150,
    });
  });

  it('refuse a volume out of range', async () => {
    const { host } = await startConversationEngine();

    await expect(
      host.caller.conversation.setOptions({ volume: 101 }),
    ).rejects.toThrow(/100/);
  });

  it('can be read and changed by an Agent and the command line', async () => {
    const voice = await startConversationEngine();
    const session = await openConversationSession(voice);
    const cli = await operationCaller(voice.host);

    const listed = await session.caller.operations.list.query({
      filter: setConversationOptions,
    });

    await runOperation(cli.operations, {
      id: setConversationOptions,
      params: { idleSeconds: 60 },
    });

    expect(listed.map(({ id }) => id)).toContain(setConversationOptions);
    expect(
      (await voice.host.caller.conversation.getSettings()).options.idleSeconds,
    ).toBe(60);
  });

  it('offer no choice of what the voice reads out', async () => {
    const cli = await operationCaller((await startConversationEngine()).host);

    await expect(
      runOperation(cli.operations, {
        id: setConversationOptions,
        params: { readOut: 'answers' },
      }),
    ).rejects.toThrow(/readOut/);
  });
});

// Stores call options as an older or damaged Server might have left them, past what the App may set.
function storeOptions(home: string, options: { volume: number }): void {
  const database = openDatabase(join(home, 'argo.db'));

  database.update(serverSettings).set({ conversationOptions: options }).run();
  database.$client.close();
}

it('reports and counts stored call options it cannot read, then uses the defaults', async () => {
  const reported = vi.spyOn(console, 'error').mockImplementation(() => {});
  const { host } = await startConversationEngine();

  await host.caller.conversation.setOptions({ volume: 40 });
  await host.stop();
  storeOptions(host.home, { volume: 999 });

  const restarted = await startConversationEngine(undefined, host.home);

  expect(
    (await restarted.host.caller.conversation.getSettings()).options.volume,
  ).toBe(100);
  expect(reported).toHaveBeenCalledWith(
    expect.stringMatching(/^Stored Conversation options: .* #\d+$/),
    expect.anything(),
  );
  reported.mockRestore();
});
