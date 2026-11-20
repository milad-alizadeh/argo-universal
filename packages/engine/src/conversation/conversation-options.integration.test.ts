import { join } from 'node:path';
import { openDatabase } from '@repo/db';
import { serverSettings } from '@repo/db/schema';
import { describe, expect, it, vi } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { operationCaller, runOperation } from '#mocks/operations';
import { offer, openVoiceSession, startVoiceEngine } from '#mocks/conversation-engine';
import { FakeVoiceProvider } from './fake-provider';

const greeting = 'Greet the person as Sam.';

const setCallOptions = 'voice.setCallOptions';

describe('Voice call options', () => {
  it('start with the filler on, no opening, five idle minutes and full volume', async () => {
    const { host } = await startVoiceEngine();

    expect((await host.caller.voice.getSettings()).options).toEqual({
      filler: true,
      opening: '',
      idleSeconds: 300,
      volume: 100,
      microphoneGain: 100,
    });
  });

  it('change only what is given, and survive an Engine restart', async () => {
    const { host } = await startVoiceEngine();

    await host.caller.voice.setCallOptions({ filler: false, volume: 40 });
    await host.caller.voice.setCallOptions({ opening: greeting });
    await host.stop();

    const restarted = await startAcpEngine({
      steps: [],
      restartOver: host.home,
      voiceProvider: new FakeVoiceProvider(),
    });

    expect((await restarted.caller.voice.getSettings()).options).toMatchObject({
      filler: false,
      volume: 40,
      opening: greeting,
      idleSeconds: 300,
    });
  });

  it('give the next call the filler and the opening', async () => {
    const voice = await startVoiceEngine();
    const { host, provider } = voice;
    const { sessionId } = await openVoiceSession(voice);
    await host.caller.voice.setCallOptions({
      filler: false,
      opening: greeting,
    });

    await host.caller.voice.start({ sessionId, offer });

    expect(provider.call.request).toMatchObject({
      filler: false,
      opening: greeting,
    });
  });

  it('tell every Device the volume, so a running call follows it at once', async () => {
    const { host } = await startVoiceEngine();

    await host.caller.voice.setCallOptions({ volume: 25, microphoneGain: 150 });

    expect(await host.caller.voice.status()).toMatchObject({
      volume: 25,
      microphoneGain: 150,
    });
  });

  it('refuse a volume out of range', async () => {
    const { host } = await startVoiceEngine();

    await expect(
      host.caller.voice.setCallOptions({ volume: 101 }),
    ).rejects.toThrow(/100/);
  });

  it('can be read and changed by an Agent and the command line', async () => {
    const voice = await startVoiceEngine();
    const session = await openVoiceSession(voice);
    const cli = await operationCaller(voice.host);

    const listed = await session.caller.operations.list.query({
      filter: setCallOptions,
    });

    await runOperation(cli.operations, {
      id: setCallOptions,
      params: { idleSeconds: 60 },
    });

    expect(listed.map(({ id }) => id)).toContain(setCallOptions);
    expect(
      (await voice.host.caller.voice.getSettings()).options.idleSeconds,
    ).toBe(60);
  });

  it('offer no choice of what the voice reads out', async () => {
    const cli = await operationCaller((await startVoiceEngine()).host);

    await expect(
      runOperation(cli.operations, {
        id: setCallOptions,
        params: { readOut: 'answers' },
      }),
    ).rejects.toThrow(/readOut/);
  });
});

// Stores call options as an older or damaged Server might have left them, past what the App may set.
function storeOptions(home: string, options: { volume: number }): void {
  const database = openDatabase(join(home, 'argo.db'));

  database.update(serverSettings).set({ voiceCallOptions: options }).run();
  database.$client.close();
}

it('reports and counts stored call options it cannot read, then uses the defaults', async () => {
  const reported = vi.spyOn(console, 'error').mockImplementation(() => {});
  const { host } = await startVoiceEngine();

  await host.caller.voice.setCallOptions({ volume: 40 });
  await host.stop();
  storeOptions(host.home, { volume: 999 });

  const restarted = await startVoiceEngine(undefined, host.home);

  expect((await restarted.host.caller.voice.getSettings()).options.volume).toBe(
    100,
  );
  expect(reported).toHaveBeenCalledWith(
    expect.stringMatching(/^Stored Voice call options: .* #\d+$/),
    expect.anything(),
  );
  reported.mockRestore();
});
