import type { SessionUpdate } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { offer } from '#mocks/conversation-engine';
import { pause } from '#mocks/conversation-timing';
import {
  startConversationWork,
  type ConversationWork,
} from '#mocks/conversation-work';
import { FakeConversationProvider } from './fake-provider';

// The Notices a call's endings left in its Session's Feed.
const endNotices = (rows: SessionUpdate[]): SessionUpdate[] =>
  rows.filter(
    (row) =>
      row.sessionUpdate === 'notice' &&
      JSON.stringify(row).includes('Conversation'),
  );

const noticesOf = async (work: ConversationWork): Promise<SessionUpdate[]> =>
  endNotices(await work.feed());

async function endedWith(
  work: ConversationWork,
  reason: string,
): Promise<void> {
  await expect
    .poll(() => work.host.caller.conversation.status())
    .toMatchObject({ conversation: null, ended: { reason } });
}

// Exactly one Notice arrives, and no second one follows it.
async function oneNotice(work: ConversationWork): Promise<SessionUpdate[]> {
  await expect.poll(() => noticesOf(work)).toHaveLength(1);
  await pause(200);

  return noticesOf(work);
}

const providerClosed = 'provider-closed';

const plainEnd = 'Conversation ended';

describe('a Conversation nobody chose to end', () => {
  it('leaves one Notice when the provider closes it without a reason', async () => {
    const work = await startConversationWork([]);
    await work.start();
    work.provider.call.close('ended');
    await endedWith(work, providerClosed);

    expect(await oneNotice(work)).toEqual([
      expect.objectContaining({
        severity: 'warning',
        title: plainEnd,
        description:
          'The Conversation provider ended the Conversation without saying why.',
      }),
    ]);
  });

  it('says the provider’s own reason when it gives one', async () => {
    const work = await startConversationWork([]);
    await work.start();
    work.provider.call.close('ended', 'The service closed the call: expired.');
    await endedWith(work, providerClosed);

    expect(await oneNotice(work)).toEqual([
      expect.objectContaining({
        title: plainEnd,
        description: 'The service closed the call: expired.',
      }),
    ]);
  });

  it('says the connection was lost when the provider loses it', async () => {
    const work = await startConversationWork([]);
    await work.start();
    work.provider.call.close('lost');
    await endedWith(work, providerClosed);

    expect(await oneNotice(work)).toEqual([
      expect.objectContaining({
        title: 'Conversation ended: connection lost',
        description:
          'Argo lost its connection to the Conversation provider and could not get it back.',
      }),
    ]);
  });

  it('says the App disconnected when the App that carried it goes away', async () => {
    const work = await startConversationWork([]);
    const connection = new AbortController();
    const app = work.host.createCaller({ signal: connection.signal });
    await app.conversation.start({ sessionId: work.sessionId, offer });
    work.provider.call.connect();
    connection.abort();
    await endedWith(work, 'app-disconnected');

    expect(await oneNotice(work)).toEqual([
      expect.objectContaining({
        title: 'Conversation ended: the App disconnected',
        description:
          'The App carrying the Conversation closed, reloaded or lost its connection to the Server, so the Conversation ended with it.',
      }),
    ]);
  });

  it('says the call went quiet when it ends by itself', async () => {
    const work = await startConversationWork([], { idleMs: 1000 });
    await work.start();
    await expect
      .poll(() => work.host.caller.conversation.status(), { timeout: 10_000 })
      .toMatchObject({ conversation: null, ended: { reason: 'idle' } });

    expect(await oneNotice(work)).toEqual([
      expect.objectContaining({
        title: 'Conversation ended: no one spoke',
        description:
          'The Conversation heard no speech for 1 second and ended by itself, so the microphone was not left open.',
      }),
    ]);
  });

  it('says the Server stopped, in the Feed a restarted Server reads', async () => {
    const work = await startConversationWork([]);
    await work.start();
    await work.host.stop();

    const restarted = await startAcpEngine({
      steps: [],
      restartOver: work.host.home,
      conversationProvider: new FakeConversationProvider(),
    });

    const page = await restarted.caller.feed.page({
      sessionId: work.sessionId,
      direction: 'tail',
    });

    expect(endNotices(page.rows)).toEqual([
      expect.objectContaining({
        title: 'Conversation ended: the Server stopped',
        description:
          'The Argo Server stopped, so the Conversation ended with it.',
      }),
    ]);
  });
});
