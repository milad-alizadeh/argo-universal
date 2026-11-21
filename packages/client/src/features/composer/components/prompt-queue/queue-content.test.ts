import { withVoiceInstruction, type ContentBlock } from '@repo/contracts';
import { expect, it } from 'vitest';
import { editedPrompt, promptText } from './queue-content';

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
