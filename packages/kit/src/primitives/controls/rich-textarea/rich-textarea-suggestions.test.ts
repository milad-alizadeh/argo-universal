import { describe, expect, it } from 'vitest';
import {
  insertSuggestion,
  insertWordAtCaret,
  matchSuggestionTrigger,
  suggestionsAtCaret,
  type ComposerSuggestion,
  type SuggestionSource,
} from './rich-textarea-suggestions';

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
