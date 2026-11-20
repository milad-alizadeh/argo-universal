import { describe, expect, it } from 'vitest';
import { pause, statusOf } from '#mocks/conversation-timing';
import { startConversationWork } from '#mocks/conversation-work';
import { relayWords } from './relay-words';

// Idle periods are seconds, not milliseconds, so a loaded Mac cannot make a timer race a step.
const idleMs = 2000;

const slow = 30_000;

const waitForEnd = { timeout: 10_000 };

describe('an idle Conversation', () => {
  it(
    'ends by itself after the idle period without speech, and not before',
    async () => {
      const work = await startConversationWork([], { idleMs });
      await work.start();
      const startedAt = Date.now();

      await pause(idleMs / 4);
      expect((await statusOf(work)).conversation).not.toBeNull();

      await expect
        .poll(() => statusOf(work), waitForEnd)
        .toMatchObject({ conversation: null, ended: { reason: 'idle' } });
      expect(Date.now() - startedAt).toBeGreaterThanOrEqual(idleMs);
      expect(work.provider.call.ended).toBe(true);
    },
    slow,
  );

  it(
    'stays while either side keeps speaking, past the idle period',
    async () => {
      const work = await startConversationWork([], { idleMs });
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

      expect((await statusOf(work)).conversation).not.toBeNull();
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

      const work = await startConversationWork(
        [{ prompt: 'Long job', holdUntil: gate.promise }],
        { idleMs },
      );

      await work.start();

      work.provider.call.requestWork('r1', 'Long job');
      await expect.poll(() => work.prompts.length).toBe(2);

      await pause(idleMs * 1.5);
      expect((await statusOf(work)).conversation).not.toBeNull();

      gate.resolve();
      const resolvedAt = Date.now();

      await pause(idleMs / 2);
      expect((await statusOf(work)).conversation).not.toBeNull();

      await expect
        .poll(() => statusOf(work), waitForEnd)
        .toMatchObject({ conversation: null, ended: { reason: 'idle' } });
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

      const work = await startConversationWork(
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
      expect((await statusOf(work)).conversation).not.toBeNull();

      ownGate.resolve();
      await expect
        .poll(() => statusOf(work), waitForEnd)
        .toMatchObject({ conversation: null, ended: { reason: 'idle' } });
    },
    slow,
  );
});

describe('an idle call and a steered Prompt', () => {
  it(
    'stays up while its Prompt is steered into a typed Turn, then idles after that Turn ends',
    async () => {
      const typedGate = Promise.withResolvers<void>();

      const work = await startConversationWork(
        [{ prompt: 'Typed job', holdUntil: typedGate.promise }],
        { idleMs, steering: true },
      );

      await work.start();
      await work.host.caller.session.prompt({
        sessionId: work.sessionId,
        prompt: [{ type: 'text', text: 'Typed job' }],
      });
      await expect.poll(() => work.prompts.length).toBe(2);

      work.provider.call.requestWork('r1', 'Steer this');
      expect(JSON.stringify(await work.steered)).toContain('Steer this');
      await expect.poll(async () => (await work.promptRows()).length).toBe(1);

      await pause(idleMs * 1.5);
      expect((await statusOf(work)).conversation).not.toBeNull();

      typedGate.resolve();
      const resolvedAt = Date.now();

      await expect
        .poll(() => statusOf(work), waitForEnd)
        .toMatchObject({ conversation: null, ended: { reason: 'idle' } });
      expect(Date.now() - resolvedAt).toBeGreaterThanOrEqual(idleMs);
    },
    slow,
  );
});
