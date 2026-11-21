import {
  QueuedPrompt,
  QueuedPromptId,
  withVoiceInstruction,
  type ContentBlock,
} from '@repo/contracts';
import { expect, it } from 'vitest';
import { editedPrompt, promptText, queueLabel } from './queue-content';

const fromConversation: ContentBlock[] = [
  { type: 'text', text: withVoiceInstruction('Pull the logs') },
  { type: 'text', text: 'Also check the tests' },
];

it('reads a Conversation Prompt without the instruction for its Agent', () => {
  expect(promptText(fromConversation)).toBe(
    'Pull the logs\nAlso check the tests',
  );
});

it('keeps the instruction for the Agent when the person edits a Conversation Prompt', () => {
  expect(editedPrompt(fromConversation, 'Pull the logs only')).toEqual([
    { type: 'text', text: withVoiceInstruction('Pull the logs only') },
  ]);
});

it('edits the person’s own Prompt as typed', () => {
  expect(
    editedPrompt([{ type: 'text', text: 'Fix it' }], 'Fix it now'),
  ).toEqual([{ type: 'text', text: 'Fix it now' }]);
});

const source = 'Spec review';

const record = (excerpt?: string): string =>
  JSON.stringify({ sourceSessionId: 'source', turnId: 'turn', excerpt });

function delegatedResult(...lines: string[]): QueuedPrompt {
  return {
    id: QueuedPromptId.parse('delegated-result:work'),
    revision: 0,
    prompt: [{ type: 'text', text: ['Argo delivered…', ...lines].join('\n') }],
    sender: {
      type: 'session',
      sessionId: 'source',
      title: source,
      delegatedResult: lines.map((_, index) => `work-${index}`),
    },
  };
}

it('labels a delegated result with its source Session and what it said', () => {
  expect(
    queueLabel(delegatedResult(record('No findings.\nAll  clear.'))),
  ).toEqual({ text: 'No findings. All clear.', from: source });
});

it('counts the other results a delegated result carries', () => {
  expect(
    queueLabel(delegatedResult(record('First'), record('Second'))),
  ).toEqual({ text: 'First (+1 more)', from: source });
});

it('pairs a batch excerpt with the Session that produced it, not the batch sender', () => {
  const legacy = delegatedResult(
    record(),
    record('Output from the second source'),
  );

  const row = {
    ...legacy,
    sender: {
      ...legacy.sender,
      title: 'Delegated results',
      resultPreview: { title: 'Standards review', excerpt: 'No findings.' },
    },
  };

  expect(queueLabel(QueuedPrompt.parse(row))).toEqual({
    from: 'Standards review',
    text: 'No findings. (+1 more)',
  });
});

it('labels a delegated result that said nothing with its source Session alone', () => {
  expect(queueLabel(delegatedResult(record()))).toEqual({
    text: source,
  });
});

it('labels any other Queued Prompt with its text', () => {
  expect(
    queueLabel({
      id: QueuedPromptId.parse('own'),
      revision: 0,
      prompt: [{ type: 'text', text: 'Fix it' }],
    }),
  ).toEqual({ text: 'Fix it' });
});
