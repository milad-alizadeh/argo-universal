import { describe, expect, it } from 'vitest';
import { statusOf } from '#mocks/conversation-timing';
import {
  startConversationWork,
  type ConversationWork,
} from '#mocks/conversation-work';
import { relayWords } from './relay-words';

const longJob = 'Refactor everything';

const sentence = 'Stop using tabs in the config';

// The answer the voice was given to a request for work.
const replyTo = (
  work: ConversationWork,
  requestId: string,
): string | undefined =>
  work.provider.call.sent.find(
    (message) => message.kind === 'reply' && message.requestId === requestId,
  )?.text;

// Starts the call and a Turn from it that runs until it is cancelled.
async function runLongJob(): Promise<ConversationWork> {
  const work = await startConversationWork([
    { prompt: longJob, messages: ['[STATUS] Working'], untilCancelled: true },
  ]);

  await work.start();
  work.provider.call.requestWork('r1', longJob);
  await expect.poll(() => work.prompts.length).toBe(2);

  return work;
}

describe('a spoken "stop"', () => {
  it('cancels the running Turn without sending the Agent a Prompt', async () => {
    const work = await runLongJob();

    work.provider.call.requestWork('r2', 'Stop!');

    await expect.poll(work.turnEnds).toHaveLength(2);
    expect((await work.turnEnds()).at(-1)).toMatchObject({
      _meta: { argo: { turnEnd: { stopReason: 'cancelled' } } },
    });
    expect(work.prompts).toHaveLength(2);
  });

  it('keeps the call open', async () => {
    const work = await runLongJob();

    work.provider.call.requestWork('r2', 'stop');

    await expect.poll(() => replyTo(work, 'r2')).toBe(relayWords.stopping);
    await expect.poll(work.turnEnds).toHaveLength(2);
    expect(await statusOf(work)).toMatchObject({
      conversation: { sessionId: work.sessionId },
    });
  });

  it('tells the voice there is nothing to stop when no Turn runs', async () => {
    const work = await startConversationWork([]);

    await work.start();
    work.provider.call.requestWork('r1', 'Stop.');

    await expect.poll(() => replyTo(work, 'r1')).toBe(relayWords.nothingToStop);
    expect(work.prompts).toHaveLength(1);
  });

  it('sends a sentence that only mentions stopping as a Prompt', async () => {
    const work = await startConversationWork([
      { prompt: sentence, messages: ['[COMPLETE] Done'] },
    ]);

    await work.start();
    work.provider.call.requestWork('r1', sentence);

    await expect.poll(() => work.prompts.length).toBe(2);
  });
});
