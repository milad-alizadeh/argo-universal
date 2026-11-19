import { describe, expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { finishSubscription } from '#mocks/list-observation';
import {
  callOf,
  offer,
  openVoiceSession,
  startVoiceEngine,
} from '#mocks/voice-engine';
import { FakeVoiceProvider } from './fake-provider';

const twoVoices = [
  { id: 'first', label: 'First' },
  { id: 'second', label: 'Second' },
];

const signInReason = 'Codex needs to be installed and signed in';

const withTwoVoices = (): ReturnType<typeof startVoiceEngine> =>
  startVoiceEngine(
    new FakeVoiceProvider({ connect: 'manual', voices: twoVoices }),
  );

describe('Voice settings', () => {
  it('start on, with the provider and its first voice chosen', async () => {
    const { host } = await withTwoVoices();

    expect(await host.caller.voice.getSettings()).toEqual({
      enabled: true,
      provider: 'fake',
      voice: 'first',
      providers: [
        {
          id: 'fake',
          label: 'Fake voice provider',
          experimental: true,
          availability: { usable: true },
        },
      ],
      voices: twoVoices,
      customVoices: [],
      instructions: '',
      options: expect.any(Object),
    });
    expect((await host.caller.voice.status()).enabled).toBe(true);
  });

  it('keeps what the person chose', async () => {
    const { host } = await withTwoVoices();

    await host.caller.voice.setSettings({ enabled: false, voice: 'second' });

    expect(await host.caller.voice.getSettings()).toMatchObject({
      enabled: false,
      voice: 'second',
    });
    expect((await host.caller.voice.status()).enabled).toBe(false);
  });

  it('survives an Engine restart', async () => {
    const { host } = await withTwoVoices();
    await host.caller.voice.setSettings({ enabled: false, voice: 'second' });
    await host.stop();

    const restarted = await startAcpEngine({
      steps: [],
      restartOver: host.home,
      voiceProvider: new FakeVoiceProvider({ voices: twoVoices }),
    });

    expect(await restarted.caller.voice.getSettings()).toMatchObject({
      enabled: false,
      voice: 'second',
    });
  });

  it('tells every Device watching the call when Voice calls go off', async () => {
    const { host } = await withTwoVoices();
    const stream = await host.caller.voice.watch();
    const watching = stream[Symbol.asyncIterator]();
    const first = await watching.next();
    expect(first.value).toMatchObject({ enabled: true });

    await host.caller.voice.setSettings({ enabled: false });

    expect((await watching.next()).value).toMatchObject({ enabled: false });
    await finishSubscription(watching);
  });

  it('refuses a voice or provider the Server does not list', async () => {
    const { host } = await withTwoVoices();

    await expect(
      host.caller.voice.setSettings({ voice: 'nobody' }),
    ).rejects.toThrow('nobody');
    await expect(
      host.caller.voice.setSettings({ provider: 'nobody' }),
    ).rejects.toThrow('nobody');
  });

  it('gives the chosen voice to the next call', async () => {
    const voice = await withTwoVoices();
    const { host, provider } = voice;
    const { sessionId } = await openVoiceSession(voice);

    await host.caller.voice.setSettings({ voice: 'second' });
    await host.caller.voice.start({ sessionId, offer });

    expect(provider.call.request.voice).toBe('second');
  });

  it('starts the next call in the first voice once the chosen one is no longer listed', async () => {
    const { host } = await withTwoVoices();
    await host.caller.voice.setSettings({ voice: 'second' });
    await host.stop();
    const provider = new FakeVoiceProvider({ voices: twoVoices.slice(0, 1) });

    const restarted = await startVoiceEngine(provider, host.home);
    const { sessionId } = await openVoiceSession(restarted);
    await restarted.host.caller.voice.start({ sessionId, offer });

    expect(provider.call.request.voice).toBe('first');
  });

  it('starts no call while Voice calls are off', async () => {
    const voice = await withTwoVoices();
    const { host } = voice;
    const { sessionId } = await openVoiceSession(voice);

    await host.caller.voice.setSettings({ enabled: false });

    await expect(host.caller.voice.start({ sessionId, offer })).rejects.toThrow(
      'Voice calls are off',
    );
    expect(await callOf(host)).toBeNull();
  });

  it('says why an unusable provider cannot be used', async () => {
    const { host } = await startVoiceEngine(
      new FakeVoiceProvider({ usable: false, reason: signInReason }),
    );

    expect((await host.caller.voice.getSettings()).providers).toMatchObject([
      { availability: { usable: false, reason: signInReason } },
    ]);
  });

  it('lists nothing when the Server has no provider', async () => {
    const host = await startAcpEngine({ steps: [] });

    expect(await host.caller.voice.getSettings()).toEqual({
      enabled: true,
      provider: null,
      voice: null,
      providers: [],
      voices: [],
      customVoices: [],
      instructions: '',
      options: expect.any(Object),
    });
  });
});
