import { QueuedPrompt, type SentPromptSender } from '@repo/contracts';
import { expect, it } from 'vitest';
import { changePromptQueue } from './prompt-queue';
import type { QueueContext } from './queue-command-types';

const conversation: SentPromptSender = { type: 'conversation' };

const plugin: SentPromptSender = {
  type: 'plugin',
  pluginId: 'prompter',
  title: 'Prompter',
};

const waiting = (sender?: SentPromptSender): QueuedPrompt =>
  QueuedPrompt.parse({
    id: 'q1',
    prompt: [{ type: 'text', text: 'Pull the logs' }],
    revision: 0,
    ...(sender && { sender }),
  });

const queueOf = (
  row: QueuedPrompt,
  context: Partial<QueueContext> = {},
): QueueContext => ({
  promptQueue: { items: [row], pauseReason: null },
  queueHolds: {},
  dispatchingQueueId: null,
  ...context,
});

// Where an appended request landed: the row's id, and how many rows the queue then has.
type Landing = { landed: string; rows: number };

// Appends a request from `sender` and answers where it landed.
function append(context: QueueContext, sender: SentPromptSender): Landing {
  let landed = '';

  const change = changePromptQueue(
    context,
    {
      action: 'append',
      prompt: [{ type: 'text', text: 'Also check the tests' }],
      sender,
      queuedId: 'q2',
      landed: (id) => (landed = id),
    },
    () => 'unused',
  );

  return { landed, rows: change.promptQueue.items.length };
}

it('joins a Conversation request to the Conversation Prompt still waiting', () => {
  expect(append(queueOf(waiting(conversation)), conversation)).toEqual({
    landed: 'q1',
    rows: 1,
  });
});

it.each([
  [
    'held for editing',
    queueOf(waiting(conversation), { queueHolds: { q1: 't' } }),
  ],
  ['starting', queueOf(waiting(conversation), { dispatchingQueueId: 'q1' })],
  ['the person’s own', queueOf(waiting())],
  ['a Plugin’s', queueOf(waiting(plugin))],
])(
  'queues a Conversation request on its own when the waiting Prompt is %s',
  (_name, context) => {
    expect(append(context, conversation)).toEqual({ landed: 'q2', rows: 2 });
  },
);

it('never joins a Plugin’s request to the Conversation’s Prompt', () => {
  expect(append(queueOf(waiting(conversation)), plugin)).toEqual({
    landed: 'q2',
    rows: 2,
  });
});
