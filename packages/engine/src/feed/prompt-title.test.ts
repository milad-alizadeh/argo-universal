import type { ContentBlock } from '@repo/contracts';
import { expect, it } from 'vitest';
import { titleFromPrompt } from './prompt-title';

const prompt = (text: string): ContentBlock[] => [
  { type: 'text' as const, text },
];

it('keeps a short first line whole', () => {
  expect(titleFromPrompt(prompt('Check the live list'))).toBe(
    'Check the live list',
  );
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
