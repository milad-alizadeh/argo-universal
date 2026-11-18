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
import { relayWords } from './relay-words';

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

const notices = async (work: VoiceWork): Promise<unknown[]> =>
  (await work.feed()).filter((row) => row.sessionUpdate === 'notice');

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
    expect(instruction).toMatch(/clearly/i);
    expect(instruction).toMatch(/stop work|pause/i);
  });
});

// Idle periods are seconds, not milliseconds, so a loaded Mac cannot make a timer race a step.
const idleMs = 2000;

const slow = 30_000;

const waitForEnd = { timeout: 10_000 };

describe('an idle Voice call', () => {
  it(
    'ends by itself after the idle period without speech, and not before',
    async () => {
      const work = await startVoiceWork([], { idleMs });
      await work.start();
      const startedAt = Date.now();

      await pause(idleMs / 4);
      expect((await statusOf(work)).call).not.toBeNull();

      await expect
        .poll(() => statusOf(work), waitForEnd)
        .toMatchObject({ call: null, ended: { reason: 'idle' } });
      expect(Date.now() - startedAt).toBeGreaterThanOrEqual(idleMs);
      expect(work.provider.call.ended).toBe(true);
    },
    slow,
  );

  it(
    'stays while either side keeps speaking, past the idle period',
    async () => {
      const work = await startVoiceWork([], { idleMs });
      await work.start();

      for (let spoken = 0; spoken < 10; spoken += 1) {
        await pause(idleMs / 5);

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
        .poll(() => statusOf(work), waitForEnd)
        .toMatchObject({ ended: { reason: 'idle' } });
    },
    slow,
  );

  it(
    'never ends while a Turn the call started is running, and counts the idle period from the Turn end',
    async () => {
      const gate = Promise.withResolvers<void>();

      const work = await startVoiceWork(
        [{ prompt: 'Long job', holdUntil: gate.promise }],
        { idleMs },
      );

      await work.start();

      work.provider.call.requestWork('r1', 'Long job');
      await expect.poll(() => work.prompts.length).toBe(2);

      await pause(idleMs * 1.5);
      expect((await statusOf(work)).call).not.toBeNull();

      gate.resolve();
      const resolvedAt = Date.now();

      await pause(idleMs / 2);
      expect((await statusOf(work)).call).not.toBeNull();

      await expect
        .poll(() => statusOf(work), waitForEnd)
        .toMatchObject({ call: null, ended: { reason: 'idle' } });
      expect(Date.now() - resolvedAt).toBeGreaterThanOrEqual(idleMs);
    },
    slow,
  );
});

describe('an idle call and a Turn the person typed', () => {
  it(
    'stays up while its own Prompt waits behind a typed Turn, and while that Prompt then runs',
    async () => {
      const typedGate = Promise.withResolvers<void>();
      const ownGate = Promise.withResolvers<void>();

      const work = await startVoiceWork(
        [
          { prompt: 'Typed job', holdUntil: typedGate.promise },
          { prompt: 'Own job', holdUntil: ownGate.promise },
        ],
        { idleMs },
      );

      await work.start();
      await work.host.caller.session.prompt({
        sessionId: work.sessionId,
        prompt: [{ type: 'text', text: 'Typed job' }],
      });
      await expect.poll(() => work.prompts.length).toBe(2);

      work.provider.call.requestWork('r1', 'Own job');
      await expect
        .poll(() => JSON.stringify(work.provider.call.sent))
        .toContain(relayWords.queued);

      typedGate.resolve();
      await expect.poll(() => work.prompts.length).toBe(3);
      await pause(idleMs * 1.5);
      expect((await statusOf(work)).call).not.toBeNull();

      ownGate.resolve();
      await expect
        .poll(() => statusOf(work), waitForEnd)
        .toMatchObject({ call: null, ended: { reason: 'idle' } });
    },
    slow,
  );
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
    const before = (await notices(work)).length;

    work.provider.call.close('limit');

    await expect
      .poll(() => statusOf(work))
      .toMatchObject({ call: null, ended: { reason: 'limit-reached' } });
    await expect
      .poll(async () => (await notices(work)).length)
      .toBe(before + 1);
    await pause(300);
    expect(await notices(work)).toHaveLength(before + 1);
    expect(await notices(work)).toContainEqual(
      expect.objectContaining({
        title: expect.stringContaining('usage limit'),
      }),
    );
  });
});
