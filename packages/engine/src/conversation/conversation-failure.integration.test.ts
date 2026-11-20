import { describe, expect, it } from 'vitest';
import { offer } from '#mocks/conversation-engine';
import { startConversationWork } from '#mocks/conversation-work';
import { FakeConversationProvider } from './fake-provider';

const noQuota = 'No quota left';

const failedTitle = 'Conversation failed';

type Work = Awaited<ReturnType<typeof startConversationWork>>;

const notices = async (work: Work): Promise<unknown[]> =>
  (await work.feed()).filter(
    (row) =>
      row.sessionUpdate === 'notice' &&
      JSON.stringify(row).includes(failedTitle),
  );

// Lets the Engine take every report already sent: several round trips through the call and the Feed.
async function settled(work: Work): Promise<void> {
  for (let trip = 0; trip < 5; trip += 1) {
    await work.host.caller.conversation.status();
    await work.feed();
  }
}

describe('a Conversation that ends by failure', () => {
  it('adds exactly one Notice saying why when the provider errors', async () => {
    const work = await startConversationWork([]);
    await work.start();
    work.provider.call.emit({ type: 'status', status: 'error' });
    await expect
      .poll(() => work.host.caller.conversation.status())
      .toMatchObject({ ended: { reason: 'failed' } });
    // Failure reports after the call ended add nothing; the machine-level test covers the reports that race while it runs.
    work.provider.call.emit({ type: 'status', status: 'error' });
    work.provider.call.close('error');
    await expect.poll(() => notices(work)).toHaveLength(1);
    await settled(work);

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
    const provider = new FakeConversationProvider({
      connect: 'manual',
      failStart: noQuota,
    });

    const work = await startConversationWork([], { provider });
    await expect(
      work.host.caller.conversation.start({
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
    const work = await startConversationWork([]);
    await work.start();
    await work.host.caller.conversation.end({ sessionId: work.sessionId });
    await work.host.caller.session.close({ sessionId: work.sessionId });

    expect(await notices(work)).toHaveLength(0);
  });

  it('adds one saying the provider ended it when the provider closes the call normally', async () => {
    const work = await startConversationWork([]);
    await work.start();
    work.provider.call.close('ended');
    await expect
      .poll(() => work.host.caller.conversation.status())
      .toMatchObject({ ended: { reason: 'provider-closed' } });
    await settled(work);

    expect(await notices(work)).toHaveLength(0);
    expect(
      (await work.feed()).filter(
        (row) =>
          row.sessionUpdate === 'notice' &&
          JSON.stringify(row).includes('Conversation'),
      ),
    ).toEqual([expect.objectContaining({ title: 'Conversation ended' })]);
  });
});
