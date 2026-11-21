import type { ContentBlock } from '@repo/contracts';
import { withVoiceInstruction } from '@repo/contracts';
import { expect, it } from 'vitest';
import { titleFromPrompt } from './prompt-title';

const prompt = (text: string): ContentBlock[] => [
  { type: 'text' as const, text },
];

const request = 'Check the live list';

it('keeps a short first line whole', () => {
  expect(titleFromPrompt(prompt(request))).toBe(request);
});

it('titles a Conversation from the spoken request', () => {
  expect(titleFromPrompt(prompt(withVoiceInstruction(request)))).toBe(request);
});

it('leaves the title available for a later Prompt when there is no spoken request', () => {
  expect(titleFromPrompt(prompt(withVoiceInstruction('  ')))).toBe('');
});

it('cuts a long first line at a word boundary with an ellipsis', () => {
  const title = titleFromPrompt(
    prompt(
      'how do I set permission on pi acp currently there are no options like claude or codex',
    ),
  );

  expect(title).toBe('how do I set permission on pi acp…');
  expect(title.length).toBeLessThanOrEqual(41);
});
