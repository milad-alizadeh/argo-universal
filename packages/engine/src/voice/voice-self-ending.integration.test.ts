import { describe, expect, it } from 'vitest';
import { runOperation } from '#mocks/operations';
import {
  callOf,
  endedOf,
  offer,
  openVoiceSession,
  startVoiceEngine,
} from '#mocks/voice-engine';
import { promptText, startVoiceWork, type VoiceWork } from '#mocks/voice-work';

const hangUp = (
  session: Awaited<ReturnType<typeof openVoiceSession>>,
): ReturnType<typeof runOperation> =>
  runOperation(session.caller.operations, {
    id: 'voice.hangUp',
    params: {},
    wait: true,
  });

const pause = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const statusOf = (
  work: VoiceWork,
): ReturnType<VoiceWork['host']['caller']['voice']['status']> =>
  work.host.caller.voice.status();

const limitNotices = async (work: VoiceWork): Promise<unknown[]> =>
  (await work.feed()).filter(
    (row) =>
      row.sessionUpdate === 'notice' && row.title.includes('usage limit'),
  );

describe('an Agent hangs up the Voice call', () => {
  it('ends its own Session call, recorded as ended by the Agent', async () => {
    const voice = await startVoiceEngine();
    const { host, provider } = voice;
    const session = await openVoiceSession(voice);
    await host.caller.voice.start({ sessionId: session.sessionId, offer });

    expect(await hangUp(session)).toEqual({ ended: true });
    expect(await callOf(host)).toBeNull();
    expect(await endedOf(host)).toMatchObject({ reason: 'agent' });
    expect(provider.call.ended).toBe(true);
  });

  it('is refused when its Session has no call', async () => {
    const voice = await startVoiceEngine();
    const session = await openVoiceSession(voice);

    await expect(hangUp(session)).rejects.toThrow('no Voice call');
  });

  it('is refused for a Session that has no call while another Session has one', async () => {
    const voice = await startVoiceEngine();
    const { host, provider } = voice;
    const first = await openVoiceSession(voice);
    const second = await openVoiceSession(voice);
    await host.caller.voice.start({ sessionId: first.sessionId, offer });

    await expect(hangUp(second)).rejects.toThrow('no Voice call');
    expect(await callOf(host)).not.toBeNull();
    expect(provider.call.ended).toBe(false);
  });

  it('is told, in the voice instruction, to hang up only when the person means to end the call', async () => {
    const work = await startVoiceWork([{ prompt: 'Job', messages: [] }]);
    await work.start();
    work.provider.call.requestWork('r1', 'Job');
    await expect.poll(() => work.prompts.length).toBe(2);

    const instruction = promptText(work.prompts[1]);

    expect(instruction).toContain('voice.hangUp');
    expect(instruction).toMatch(/clearly says they are done/);
    expect(instruction).toMatch(/stop work, pause/);
  });
});

describe('an idle Voice call', () => {
  it('ends by itself after the idle period without speech', async () => {
    const work = await startVoiceWork([], { idleMs: 60 });
    await work.start();

    await expect
      .poll(() => statusOf(work))
      .toMatchObject({ call: null, ended: { reason: 'idle' } });
    expect(work.provider.call.ended).toBe(true);
  });

  it('stays while either side keeps speaking', async () => {
    const work = await startVoiceWork([], { idleMs: 400 });
    await work.start();

    for (let spoken = 0; spoken < 4; spoken += 1) {
      await pause(200);

      if (spoken % 2 === 0) work.provider.call.personSays('Still here');
      else
        work.provider.call.emit({
          type: 'voice.transcript',
          id: 'v',
          text: 'Me too',
          final: true,
        });
    }

    expect((await statusOf(work)).call).not.toBeNull();
    await expect
      .poll(() => statusOf(work))
      .toMatchObject({ ended: { reason: 'idle' } });
  });

  it('never ends while a Turn the call started is running, and counts from the Turn end', async () => {
    const gate = Promise.withResolvers<void>();

    const work = await startVoiceWork(
      [{ prompt: 'Long job', holdUntil: gate.promise }],
      { idleMs: 150 },
    );

    await work.start();

    work.provider.call.requestWork('r1', 'Long job');
    await expect.poll(() => work.prompts.length).toBe(2);

    await pause(600);
    expect((await statusOf(work)).call).not.toBeNull();

    gate.resolve();

    await expect
      .poll(() => statusOf(work))
      .toMatchObject({ call: null, ended: { reason: 'idle' } });
  });
});

describe('the provider reports its allowance', () => {
  it('shows a warning on the call status while the call runs', async () => {
    const work = await startVoiceWork([]);
    await work.start();
    expect((await statusOf(work)).call).not.toHaveProperty('limit');

    work.provider.call.emit({
      type: 'limit',
      remaining: 0.1,
      resetsAt: '2026-11-19T00:00:00.000Z',
    });

    await expect
      .poll(() => statusOf(work))
      .toMatchObject({
        call: {
          limit: { remaining: 0.1, resetsAt: '2026-11-19T00:00:00.000Z' },
        },
      });
  });

  it('ends with one Notice when the provider closes the call for a reached limit', async () => {
    const work = await startVoiceWork([]);
    await work.start();

    work.provider.call.close('limit');

    await expect
      .poll(() => statusOf(work))
      .toMatchObject({ call: null, ended: { reason: 'limit-reached' } });
    await expect.poll(() => limitNotices(work)).toHaveLength(1);
    await pause(100);
    expect(await limitNotices(work)).toHaveLength(1);
  });
});
