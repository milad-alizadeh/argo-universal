import { expect, it } from 'vitest';
import { slashCommandSource } from './slash-command-suggestions';

it('offers name prefixes first, then descriptions, without duplicates', () => {
  const source = slashCommandSource([
    { name: 'inspect', description: 'Review changes' },
    { name: 'review', description: 'Review a file', hint: 'files' },
    { name: 'reset', description: 'Start again' },
  ]);

  expect(source.query('RE')).toEqual([
    {
      id: 'review',
      label: '/review',
      detail: 'Review a file',
      icon: 'code',
      insert: '/review ',
      hint: 'files',
    },
    {
      id: 'reset',
      label: '/reset',
      detail: 'Start again',
      icon: 'code',
      insert: '/reset ',
    },
    {
      id: 'inspect',
      label: '/inspect',
      detail: 'Review changes',
      icon: 'code',
      insert: '/inspect ',
    },
  ]);
});

it('limits results to eight and keeps no commands and no match empty', () => {
  const source = slashCommandSource(
    Array.from({ length: 10 }, (_, index) => ({
      name: `option-${index}`,
      description: 'Example',
    })),
  );

  expect(source.query('').map(({ id }) => id)).toEqual([
    'option-0',
    'option-1',
    'option-2',
    'option-3',
    'option-4',
    'option-5',
    'option-6',
    'option-7',
  ]);
  expect(source.query('missing')).toEqual([]);
  expect(slashCommandSource([]).query('')).toEqual([]);
});
