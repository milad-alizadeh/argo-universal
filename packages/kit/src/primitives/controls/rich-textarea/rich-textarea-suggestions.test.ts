import { expect, it } from 'vitest';
import {
  findCommand,
  matchSuggestionTrigger,
  type SuggestionSource,
} from './rich-textarea-suggestions';

const sources: SuggestionSource[] = [
  {
    id: 'agent',
    title: 'Agent',
    query: (query) =>
      [
        {
          id: 'review',
          label: '/review',
          insert: '/review ',
          hint: 'a branch',
        },
        { id: 'revert', label: '/revert', insert: '/revert ' },
        { id: 'ticket', label: 'Ticket 7', insert: 'Ticket 7 ' },
      ].filter(({ id }) => id.startsWith(query)),
  },
];

it('finds a command by its exact name, with its hint', () => {
  expect(findCommand(sources, 'review')?.hint).toBe('a branch');
});

it.each(['rev', 'ticket', 'nothing'])('finds no command named %j', (name) => {
  expect(findCommand(sources, name)).toBeUndefined();
});

it.each([
  ['/', { leadOffset: 0, matchingString: '', replaceableString: '/' }],
  [
    'Look /rev',
    { leadOffset: 5, matchingString: 'rev', replaceableString: '/rev' },
  ],
  [
    'Next\n/rev',
    { leadOffset: 5, matchingString: 'rev', replaceableString: '/rev' },
  ],
  ['src/app', null],
  ['https://example.com', null],
  ['/ ', null],
  ['/rev args', null],
])(
  'finds a suggestion only at a Slash word boundary in %j',
  (text, expected) => {
    expect(matchSuggestionTrigger(text)).toEqual(expected);
  },
);
