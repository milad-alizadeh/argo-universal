import { describe, expect, it } from 'vitest';
import {
  findCommand,
  insertSuggestion,
  insertWordAtCaret,
  matchSuggestionTrigger,
  slashQueryAtCaret,
  type ComposerSuggestion,
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

describe('slashQueryAtCaret', () => {
  it('is the text after a bare slash', () => {
    expect(slashQueryAtCaret('/', 1)).toBe('');
  });

  it('is what is typed after the slash', () => {
    expect(slashQueryAtCaret('Do /re', 6)).toBe('re');
  });

  it.each([
    ['src/app', 7],
    ['a/b', 3],
    ['/ later', 7],
    ['/ ', 2],
    ['/re later', 9],
  ])('is null for %j with the caret at %i', (text, caret) => {
    expect(slashQueryAtCaret(text, caret)).toBeNull();
  });

  it('follows the caret, not the end of the text', () => {
    expect(slashQueryAtCaret('/re later', 3)).toBe('re');
  });
});

describe('insertWordAtCaret', () => {
  it.each([
    ['', { start: 0, end: 0 }, { text: '/', caret: 1 }],
    ['Run', { start: 3, end: 3 }, { text: 'Run /', caret: 5 }],
    ['Run ', { start: 4, end: 4 }, { text: 'Run /', caret: 5 }],
    ['Run\n', { start: 4, end: 4 }, { text: 'Run\n/', caret: 5 }],
    ['Run later', { start: 3, end: 3 }, { text: 'Run / later', caret: 5 }],
    ['Run later', { start: 0, end: 0 }, { text: '/Run later', caret: 1 }],
    ['Run later', { start: 4, end: 9 }, { text: 'Run /', caret: 5 }],
    ['Run later', { start: 3, end: 9 }, { text: 'Run /', caret: 5 }],
    ['Run later', { start: 0, end: 9 }, { text: '/', caret: 1 }],
  ])('puts a word where %j is selected as %#', (text, selection, expected) => {
    expect(insertWordAtCaret(text, selection, '/')).toEqual(expected);
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
