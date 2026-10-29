import { describe, expect, it } from 'vitest';
import {
  findCommand,
  insertSuggestion,
  matchSuggestionTrigger,
  querySuggestions,
  suggestionsAtCaret,
  type ComposerSuggestion,
  type SuggestionGroup,
  type SuggestionSource,
} from './rich-textarea-suggestions';

const sources: SuggestionSource[] = [
  {
    id: 'agent',
    title: 'Agent',
    query: () => [],
    commands: [{ name: 'review', hint: 'a branch' }, { name: 'revert' }],
  },
  {
    id: 'plugin',
    title: 'Plugin',
    query: () => [{ id: 'plan', label: 'Plan', insert: '/plan ' }],
  },
];

it('finds a command by its exact name, with its hint', () => {
  expect(findCommand(sources, 'review')?.hint).toBe('a branch');
});

it.each(['rev', 'plan', 'nothing'])('finds no command named %j', (name) => {
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

const review: ComposerSuggestion = {
  id: 'review',
  label: '/review',
  insert: '/review ',
};

const commands: SuggestionSource = {
  id: 'commands',
  title: 'Commands',
  query: (query) =>
    [
      review,
      { id: 'rename', label: '/rename', insert: '/rename ' },
      { id: 'plan', label: '/plan', insert: '/plan ' },
    ].filter(({ label }) => label.slice(1).startsWith(query)),
};

function offered(text: string, caret: number): string[] | null {
  const groups = suggestionsAtCaret(text, caret, [commands]);

  return (
    groups && groups.flatMap((group) => group.suggestions.map(({ id }) => id))
  );
}

describe('suggestionsAtCaret', () => {
  it('offers every command for a bare slash', () => {
    expect(offered('/', 1)).toEqual(['review', 'rename', 'plan']);
  });

  it('narrows as you type', () => {
    expect(offered('Do /re', 6)).toEqual(['review', 'rename']);
  });

  it.each([
    ['src/app', 7],
    ['a/b', 3],
    ['/ later', 7],
    ['/ ', 2],
    ['/zzz', 4],
    ['/re later', 9],
  ])('offers nothing for %j with the caret at %i', (text, caret) => {
    expect(offered(text, caret)).toBeNull();
  });

  it('follows the caret, not the end of the text', () => {
    expect(offered('/re later', 3)).toEqual(['review', 'rename']);
  });
});

describe('insertSuggestion', () => {
  it('replaces the slash word and puts the caret after the inserted text', () => {
    expect(insertSuggestion('Do /re later', 6, review)).toEqual({
      text: 'Do /review  later',
      caret: 11,
    });
  });
});

const many: SuggestionSource = {
  id: 'many',
  title: 'Many',
  query: () =>
    Array.from({ length: 10 }, (_, index) => ({
      id: `option-${index}`,
      label: `Option ${index}`,
      insert: `option-${index} `,
    })),
};

const none: SuggestionSource = { id: 'none', title: 'None', query: () => [] };

const idsOf = (groups: SuggestionGroup[]): string[] =>
  groups.flatMap(({ suggestions }) => suggestions.map(({ id }) => id));

describe('querySuggestions', () => {
  it('keeps source order, the first eight of each, and drops empty sources', () => {
    const groups = querySuggestions([none, many, commands], '');

    expect(groups.map(({ source }) => source.id)).toEqual(['many', 'commands']);
    expect(idsOf(groups).slice(7, 9)).toEqual(['option-7', 'review']);
  });

  it('answers nothing when no source matches', () => {
    expect(querySuggestions([none, commands], 'zzz')).toEqual([]);
  });
});
