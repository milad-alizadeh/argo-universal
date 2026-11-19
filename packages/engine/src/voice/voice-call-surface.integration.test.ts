import type { VoiceCall } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { startVoiceWork } from '#mocks/voice-work';

const job = 'Run the tests';

type Work = Awaited<ReturnType<typeof startVoiceWork>>;

const callOf = async (work: Work): Promise<VoiceCall | null> =>
  (await work.host.caller.voice.status()).call;

describe('the Voice call as the App draws it', () => {
  it('is connecting, with no orb and no timer, until the provider connects', async () => {
    const work = await startVoiceWork([]);
    await work.host.caller.voice.start({
      sessionId: work.sessionId,
      offer: 'offer-sdp',
    });

    expect(await callOf(work)).toMatchObject({
      status: 'connecting',
      connection: 'connecting',
      orb: 'none',
      trouble: null,
      startedAt: null,
    });
  });

  it('listens once connected, and starts its timer then', async () => {
    const work = await startVoiceWork([]);
    await work.start();

    const call = (await work.host.caller.voice.status()).call;
    expect(call).toMatchObject({
      connection: 'connected',
      orb: 'listening',
      trouble: null,
    });
    expect(Date.parse(call?.startedAt ?? '')).not.toBeNaN();
  });

  it('talks while the voice speaks, and listens again after', async () => {
    const work = await startVoiceWork([]);
    await work.start();

    work.provider.call.emit({ type: 'speaking', speaking: true });
    await expect.poll(() => callOf(work)).toMatchObject({ orb: 'talking' });
    work.provider.call.emit({ type: 'speaking', speaking: false });
    await expect.poll(() => callOf(work)).toMatchObject({ orb: 'listening' });
  });

  it('thinks while the Agent Turn runs, and listens when it ends', async () => {
    const release = Promise.withResolvers<void>();

    const work = await startVoiceWork([
      {
        prompt: job,
        messages: ['[COMPLETE] Done'],
        holdUntil: release.promise,
      },
    ]);

    await work.start();
    work.provider.call.requestWork('r1', job);
    await expect.poll(() => callOf(work)).toMatchObject({ orb: 'thinking' });
    release.resolve();
    await expect.poll(() => callOf(work)).toMatchObject({ orb: 'listening' });
  });

  it('talks over thinking when the voice speaks during a Turn', async () => {
    const release = Promise.withResolvers<void>();

    const work = await startVoiceWork([
      { prompt: job, messages: [], holdUntil: release.promise },
    ]);

    await work.start();
    work.provider.call.requestWork('r1', job);
    await expect.poll(() => callOf(work)).toMatchObject({ orb: 'thinking' });
    work.provider.call.emit({ type: 'speaking', speaking: true });
    await expect.poll(() => callOf(work)).toMatchObject({ orb: 'talking' });
    release.resolve();
  });

  it('says reconnecting while the connection is down, with no orb, and recovers', async () => {
    const work = await startVoiceWork([]);
    await work.start();

    work.provider.call.emit({ type: 'status', status: 'disconnected' });
    await expect
      .poll(() => callOf(work))
      .toMatchObject({
        status: 'connected',
        connection: 'disconnected',
        orb: 'none',
        trouble: 'reconnecting',
      });
    work.provider.call.connect();
    await expect
      .poll(() => callOf(work))
      .toMatchObject({
        connection: 'connected',
        orb: 'listening',
        trouble: null,
      });
  });

  it('says the microphone is blocked while the provider reports it', async () => {
    const work = await startVoiceWork([]);
    await work.start();

    work.provider.call.emit({ type: 'trouble', trouble: 'microphone-blocked' });
    await expect
      .poll(() => callOf(work))
      .toMatchObject({
        trouble: 'microphone-blocked',
      });
    work.provider.call.emit({ type: 'trouble', trouble: null });
    await expect.poll(() => callOf(work)).toMatchObject({ trouble: null });
  });

  it('still shows the voice talking while the microphone is blocked', async () => {
    const work = await startVoiceWork([]);
    await work.start();

    work.provider.call.emit({ type: 'trouble', trouble: 'microphone-blocked' });
    work.provider.call.emit({ type: 'speaking', speaking: true });
    await expect
      .poll(() => callOf(work))
      .toMatchObject({
        orb: 'talking',
        trouble: 'microphone-blocked',
      });
  });

  it('carries the provider allowance alongside trouble', async () => {
    const work = await startVoiceWork([]);
    await work.start();

    work.provider.call.emit({ type: 'trouble', trouble: 'microphone-blocked' });
    work.provider.call.emit({ type: 'limit', remaining: 0.1 });
    await expect
      .poll(() => callOf(work))
      .toMatchObject({
        trouble: 'microphone-blocked',
        limit: { remaining: 0.1 },
      });
  });
});
