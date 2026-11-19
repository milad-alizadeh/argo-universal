import type { SessionUpdate } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { offer } from '#mocks/voice-engine';
import { pause } from '#mocks/voice-timing';
import { startVoiceWork, type VoiceWork } from '#mocks/voice-work';
import { FakeVoiceProvider } from './fake-provider';

// The Notices a call's endings left in its Session's Feed.
const endNotices = (rows: SessionUpdate[]): SessionUpdate[] =>
  rows.filter(
    (row) =>
      row.sessionUpdate === 'notice' &&
      JSON.stringify(row).includes('Voice call'),
  );

const noticesOf = async (work: VoiceWork): Promise<SessionUpdate[]> =>
  endNotices(await work.feed());

async function endedWith(work: VoiceWork, reason: string): Promise<void> {
  await expect
    .poll(() => work.host.caller.voice.status())
    .toMatchObject({ call: null, ended: { reason } });
}

// Exactly one Notice arrives, and no second one follows it.
async function oneNotice(work: VoiceWork): Promise<SessionUpdate[]> {
  await expect.poll(() => noticesOf(work)).toHaveLength(1);
  await pause(200);

  return noticesOf(work);
}

const providerClosed = 'provider-closed';

const plainEnd = 'Voice call ended';

describe('a Voice call nobody chose to end', () => {
  it('leaves one Notice when the provider closes it without a reason', async () => {
    const work = await startVoiceWork([]);
    await work.start();
    work.provider.call.close('ended');
    await endedWith(work, providerClosed);

    expect(await oneNotice(work)).toEqual([
      expect.objectContaining({
        severity: 'warning',
        title: plainEnd,
        description: 'The Voice provider ended the call without saying why.',
      }),
    ]);
  });

  it('says the provider’s own reason when it gives one', async () => {
    const work = await startVoiceWork([]);
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
    const work = await startVoiceWork([]);
    await work.start();
    work.provider.call.close('lost');
    await endedWith(work, providerClosed);

    expect(await oneNotice(work)).toEqual([
      expect.objectContaining({
        title: 'Voice call ended: connection lost',
        description:
          'Argo lost its connection to the Voice provider and could not get it back.',
      }),
    ]);
  });

  it('says the App disconnected when the App that carried it goes away', async () => {
    const work = await startVoiceWork([]);
    const connection = new AbortController();
    const app = work.host.createCaller({ signal: connection.signal });
    await app.voice.start({ sessionId: work.sessionId, offer });
    work.provider.call.connect();
    connection.abort();
    await endedWith(work, 'app-disconnected');

    expect(await oneNotice(work)).toEqual([
      expect.objectContaining({
        title: 'Voice call ended: the App disconnected',
        description:
          'The App carrying the call closed, reloaded or lost its connection to the Server, so the call ended with it.',
      }),
    ]);
  });

  it('says the call went quiet when it ends by itself', async () => {
    const work = await startVoiceWork([], { idleMs: 1000 });
    await work.start();
    await expect
      .poll(() => work.host.caller.voice.status(), { timeout: 10_000 })
      .toMatchObject({ call: null, ended: { reason: 'idle' } });

    expect(await oneNotice(work)).toEqual([
      expect.objectContaining({
        title: 'Voice call ended: no one spoke',
        description:
          'The call heard no speech for 1 second and ended by itself, so the microphone was not left open.',
      }),
    ]);
  });

  it('says the Server stopped, in the Feed a restarted Server reads', async () => {
    const work = await startVoiceWork([]);
    await work.start();
    await work.host.stop();

    const restarted = await startAcpEngine({
      steps: [],
      restartOver: work.host.home,
      voiceProvider: new FakeVoiceProvider(),
    });

    const page = await restarted.caller.feed.page({
      sessionId: work.sessionId,
      direction: 'tail',
    });

    expect(endNotices(page.rows)).toEqual([
      expect.objectContaining({
        title: 'Voice call ended: the Server stopped',
        description: 'The Argo Server stopped, so the call ended with it.',
      }),
    ]);
  });
});
