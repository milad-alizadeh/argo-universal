import { QueuedPromptId } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { pause, statusOf } from '#mocks/conversation-timing';
import {
  startConversationWork,
  type ConversationWork,
} from '#mocks/conversation-work';
import { relayWords } from './relay-words';

// Idle periods are seconds, not milliseconds, so a loaded Mac cannot make a timer race a step.
const idleMs = 2000;

const slow = 30_000;

const waitForEnd = { timeout: 10_000 };

const typedJob = 'Typed job';

const ownJob = 'Own job';

// Types a Prompt to the Session, as the person does, and waits until the Agent has it.
async function typeJob(work: ConversationWork): Promise<void> {
  await work.host.caller.session.prompt({
    sessionId: work.sessionId,
    prompt: [{ type: 'text', text: typedJob }],
  });
  await expect.poll(() => work.prompts.length).toBe(2);
}

// The Session's queue, as an App subscribed to its Feed first reads it.
async function queuedPrompts(
  work: ConversationWork,
): Promise<{ id: string; revision: number }[]> {
  const events = await work.subscription(0);

  for (const event of events)
    if (event.type === 'snapshot') return event.snapshot.promptQueue.items;

  return [];
}

// Deletes the first queued Prompt, as the person does from the App.
async function deleteQueued(work: ConversationWork): Promise<void> {
  const [queued] = await queuedPrompts(work);

  if (!queued) throw new Error('Nothing is queued');

  const id = QueuedPromptId.parse(queued.id);

  await work.host.caller.session.queue({
    sessionId: work.sessionId,
    command: { action: 'delete', id, revision: queued.revision },
  });
}

const idled = async (work: ConversationWork): Promise<void> => {
  await expect
    .poll(() => statusOf(work), waitForEnd)
    .toMatchObject({ call: null, ended: { reason: 'idle' } });
};

describe('an idle call and a queued Prompt that never runs', () => {
  it(
    'idles once the person deletes the Prompt from the queue',
    async () => {
      const typedGate = Promise.withResolvers<void>();

      const work = await startConversationWork(
        [{ prompt: typedJob, holdUntil: typedGate.promise }],
        { idleMs },
      );

      await work.start();
      await typeJob(work);
      work.provider.call.requestWork('r1', ownJob);
      await expect.poll(() => queuedPrompts(work)).toHaveLength(1);
      await deleteQueued(work);
      typedGate.resolve();
      await idled(work);
      expect(work.prompts).toHaveLength(2);
    },
    slow,
  );
});

describe('an idle call and a Turn that does not finish cleanly', () => {
  it(
    'idles after its Turn fails',
    async () => {
      const work = await startConversationWork(
        [{ prompt: 'Break it', fails: 'The Agent crashed' }],
        { idleMs },
      );

      await work.start();
      work.provider.call.requestWork('r1', 'Break it');
      await expect
        .poll(() => JSON.stringify(work.provider.call.sent))
        .toContain('The Agent crashed');
      await idled(work);
    },
    slow,
  );
});

describe('an idle call and a Prompt the Agent refused to be steered with', () => {
  it(
    'stays up while that Prompt waits and then runs, and idles after its Turn ends',
    async () => {
      const typedGate = Promise.withResolvers<void>();
      const ownGate = Promise.withResolvers<void>();

      const work = await startConversationWork(
        [
          { prompt: typedJob, holdUntil: typedGate.promise },
          { prompt: ownJob, holdUntil: ownGate.promise },
        ],
        { idleMs, steering: 'refused' },
      );

      await work.start();
      await typeJob(work);
      work.provider.call.requestWork('r1', ownJob);
      await expect
        .poll(() => JSON.stringify(work.provider.call.sent))
        .toContain(
          relayWords.notSteered(
            'The Agent did not accept steering; your Prompt was kept',
          ),
        );

      typedGate.resolve();
      await expect.poll(() => work.prompts.length).toBe(3);
      await pause(idleMs * 1.5);
      expect((await statusOf(work)).conversation).not.toBeNull();

      ownGate.resolve();
      await idled(work);
    },
    slow,
  );
});
