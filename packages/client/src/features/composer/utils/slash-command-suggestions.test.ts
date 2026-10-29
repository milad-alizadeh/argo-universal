import { expect, it } from 'vitest';
import { slashCommandSource } from './slash-command-suggestions';

const commands = [
  { name: 'inspect', description: 'Review changes' },
  { name: 'review', description: 'Review a file', hint: 'files' },
  { name: 'reset', description: 'Start again' },
];

it('offers name prefixes first, then descriptions, without duplicates', () => {
  const source = slashCommandSource(commands);

  expect(source.query('RE')).toEqual([
    {
      id: 'review',
      label: '/review',
      detail: 'Review a file',
      insert: '/review ',
      command: 'review',
    },
    {
      id: 'reset',
      label: '/reset',
      detail: 'Start again',
      insert: '/reset ',
      command: 'reset',
    },
    {
      id: 'inspect',
      label: '/inspect',
      detail: 'Review changes',
      insert: '/inspect ',
      command: 'inspect',
    },
  ]);
});

it('states each Agent command with its hint, so a typed name is known at once', () => {
  expect(slashCommandSource(commands).commands).toEqual([
    { name: 'inspect' },
    { name: 'review', hint: 'files' },
    { name: 'reset' },
  ]);
});

it('keeps no commands and no match empty', () => {
  expect(slashCommandSource(commands).query('missing')).toEqual([]);
  expect(slashCommandSource([]).query('')).toEqual([]);
  expect(slashCommandSource([]).commands).toEqual([]);
});
