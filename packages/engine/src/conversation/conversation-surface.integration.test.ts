import type { Conversation } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { startConversationWork } from '#mocks/conversation-work';

const microphoneBlocked = 'microphone-blocked';

const job = 'Run the tests';

type Work = Awaited<ReturnType<typeof startConversationWork>>;

const callOf = async (work: Work): Promise<Conversation | null> =>
  (await work.host.caller.conversation.status()).conversation;

describe('the Conversation as the App draws it', () => {
  it('is connecting, with no orb and no timer, until the provider connects', async () => {
    const work = await startConversationWork([]);
    await work.host.caller.conversation.start({
      sessionId: work.sessionId,
      offer: 'offer-sdp',
    });

    expect(await callOf(work)).toMatchObject({
      status: 'connecting',
      state: 'none',
      trouble: null,
      startedAt: null,
    });
  });

  it('listens once connected, and starts its timer then', async () => {
    const work = await startConversationWork([]);
    await work.start();

    const call = (await work.host.caller.conversation.status()).conversation;
    expect(call).toMatchObject({
      state: 'listening',
      trouble: null,
    });
    expect(Date.parse(call?.startedAt ?? '')).not.toBeNaN();
  });

  it('talks while the voice speaks, and listens again after', async () => {
    const work = await startConversationWork([]);
    await work.start();

    work.provider.call.emit({ type: 'speaking', speaking: true });
    await expect.poll(() => callOf(work)).toMatchObject({ state: 'talking' });
    work.provider.call.emit({ type: 'speaking', speaking: false });
    await expect.poll(() => callOf(work)).toMatchObject({ state: 'listening' });
  });

  it('thinks while the Agent Turn runs, and listens when it ends', async () => {
    const release = Promise.withResolvers<void>();

    const work = await startConversationWork([
      {
        prompt: job,
        messages: ['[COMPLETE] Done'],
        holdUntil: release.promise,
      },
    ]);

    await work.start();
    work.provider.call.requestWork('r1', job);
    await expect.poll(() => callOf(work)).toMatchObject({ state: 'thinking' });
    release.resolve();
    await expect.poll(() => callOf(work)).toMatchObject({ state: 'listening' });
  });

  it('talks over thinking when the voice speaks during a Turn', async () => {
    const release = Promise.withResolvers<void>();

    const work = await startConversationWork([
      { prompt: job, messages: [], holdUntil: release.promise },
    ]);

    await work.start();
    work.provider.call.requestWork('r1', job);
    await expect.poll(() => callOf(work)).toMatchObject({ state: 'thinking' });
    work.provider.call.emit({ type: 'speaking', speaking: true });
    await expect.poll(() => callOf(work)).toMatchObject({ state: 'talking' });
    release.resolve();
  });

  it('says reconnecting while the connection is down, with no orb, and recovers', async () => {
    const work = await startConversationWork([]);
    await work.start();

    work.provider.call.emit({ type: 'status', status: 'disconnected' });
    await expect
      .poll(() => callOf(work))
      .toMatchObject({
        status: 'connected',
        state: 'none',
        trouble: 'reconnecting',
      });
    work.provider.call.connect();
    await expect
      .poll(() => callOf(work))
      .toMatchObject({
        state: 'listening',
        trouble: null,
      });
  });

  it('says the microphone is blocked while the provider reports it', async () => {
    const work = await startConversationWork([]);
    await work.start();

    work.provider.call.emit({ type: 'trouble', trouble: microphoneBlocked });
    await expect
      .poll(() => callOf(work))
      .toMatchObject({
        trouble: microphoneBlocked,
      });
    work.provider.call.emit({ type: 'trouble', trouble: null });
    await expect.poll(() => callOf(work)).toMatchObject({ trouble: null });
  });

  it('still shows the voice talking while the microphone is blocked', async () => {
    const work = await startConversationWork([]);
    await work.start();

    work.provider.call.emit({ type: 'trouble', trouble: microphoneBlocked });
    work.provider.call.emit({ type: 'speaking', speaking: true });
    await expect
      .poll(() => callOf(work))
      .toMatchObject({
        state: 'talking',
        trouble: microphoneBlocked,
      });
  });

  it('carries the provider allowance alongside trouble', async () => {
    const work = await startConversationWork([]);
    await work.start();

    work.provider.call.emit({ type: 'trouble', trouble: microphoneBlocked });
    work.provider.call.emit({ type: 'limit', remaining: 0.1 });
    await expect
      .poll(() => callOf(work))
      .toMatchObject({
        trouble: microphoneBlocked,
        limit: { remaining: 0.1 },
      });
  });

  it('shows the allowance warning when a usage report says how much is left', async () => {
    const work = await startConversationWork([]);
    await work.start();

    work.provider.call.emit({
      type: 'usage',
      inputTokens: 900,
      outputTokens: 100,
      limit: { remaining: 0.05 },
    });
    await expect
      .poll(() => callOf(work))
      .toMatchObject({ limit: { remaining: 0.05 } });
  });

  it('shows no allowance warning for a usage report that only counts tokens', async () => {
    const work = await startConversationWork([]);
    await work.start();

    work.provider.call.emit({ type: 'usage', inputTokens: 9, outputTokens: 1 });
    work.provider.call.emit({ type: 'speaking', speaking: true });
    await expect.poll(() => callOf(work)).toMatchObject({ state: 'talking' });

    expect(await callOf(work)).not.toHaveProperty('limit');
  });
});
