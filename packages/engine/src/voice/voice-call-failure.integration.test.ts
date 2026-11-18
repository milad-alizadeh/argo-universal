import { describe, expect, it } from 'vitest';
import { offer } from '#mocks/voice-engine';
import { startVoiceWork } from '#mocks/voice-work';
import { FakeVoiceProvider } from './fake-provider';

const noQuota = 'No quota left';

const failedTitle = 'Voice call failed';

type Work = Awaited<ReturnType<typeof startVoiceWork>>;

const notices = async (work: Work): Promise<unknown[]> =>
  (await work.feed()).filter(
    (row) =>
      row.sessionUpdate === 'notice' &&
      JSON.stringify(row).includes(failedTitle),
  );

describe('a Voice call that ends by failure', () => {
  it('adds exactly one Notice saying why when the provider errors', async () => {
    const work = await startVoiceWork([]);
    await work.start();
    work.provider.call.emit({ type: 'status', status: 'error' });
    await expect
      .poll(() => work.host.caller.voice.status())
      .toMatchObject({ ended: { reason: 'failed' } });
    // A late second report cannot add a second Notice.
    work.provider.call.emit({ type: 'status', status: 'error' });

    const found = await notices(work);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      sessionUpdate: 'notice',
      severity: 'warning',
      title: failedTitle,
      description: expect.stringContaining('connection'),
    });
  });

  it('says why a call that could not start failed', async () => {
    const provider = new FakeVoiceProvider({
      connect: 'manual',
      failStart: noQuota,
    });

    const work = await startVoiceWork([], { provider });
    await expect(
      work.host.caller.voice.start({
        sessionId: work.sessionId,
        offer,
      }),
    ).rejects.toThrow(noQuota);

    await expect.poll(() => notices(work)).toHaveLength(1);
    expect((await notices(work))[0]).toMatchObject({
      description: expect.stringContaining(noQuota),
    });
  });

  it('adds none when the person or the Session ends the call', async () => {
    const work = await startVoiceWork([]);
    await work.start();
    await work.host.caller.voice.end({ sessionId: work.sessionId });
    await work.host.caller.session.close({ sessionId: work.sessionId });

    expect(await notices(work)).toHaveLength(0);
  });

  it('adds none when the provider closes the call normally', async () => {
    const work = await startVoiceWork([]);
    await work.start();
    work.provider.call.close('ended');
    await expect
      .poll(() => work.host.caller.voice.status())
      .toMatchObject({ ended: { reason: 'provider-closed' } });

    expect(await notices(work)).toHaveLength(0);
  });
});
