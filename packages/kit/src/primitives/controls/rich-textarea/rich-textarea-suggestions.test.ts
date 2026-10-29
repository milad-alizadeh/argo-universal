import { describe, expect, it } from 'vitest';
import {
  findCommand,
  insertSuggestion,
  matchSuggestionTrigger,
  slashQueryAtCaret,
  startSuggestionQuery,
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

interface Deferred {
  source: SuggestionSource;
  settle: (results: ComposerSuggestion[]) => void;
  fail: () => void;
}

// A source that answers with a promise the test settles by hand.
function slowSource(id: string): Deferred {
  let settle: Deferred['settle'] = () => undefined;
  let fail: Deferred['fail'] = () => undefined;
  const answer = new Promise<ComposerSuggestion[]>((resolve, reject) => {
    settle = resolve;
    fail = () => reject(new Error('down'));
  });

  return {
    source: { id, title: id, query: () => answer },
    settle,
    fail,
  };
}

const ticket = (id: string): ComposerSuggestion => ({
  id,
  label: id,
  insert: `${id} `,
});

const flush = (): Promise<void> => new Promise((done) => setTimeout(done, 0));

describe('startSuggestionQuery', () => {
  it('keeps source order, the first eight of each, and drops empty sources', () => {
    const { groups } = startSuggestionQuery([none, many, commands], '');

    expect(groups().map(({ source }) => source.id)).toEqual([
      'many',
      'commands',
    ]);
    expect(idsOf(groups()).slice(7, 9)).toEqual(['option-7', 'review']);
  });

  it('answers nothing when no source matches', () => {
    expect(startSuggestionQuery([none, commands], 'zzz').groups()).toEqual([]);
  });

  it('shows a synchronous source at once and a late one when it arrives', async () => {
    const slow = slowSource('Tickets');
    const run = startSuggestionQuery([commands, slow.source], '');
    const seen: string[][] = [];
    run.subscribe(() => seen.push(idsOf(run.groups())));

    expect(idsOf(run.groups())).toEqual(['review', 'rename', 'plan']);
    expect(run.pending()).toBe(true);
    slow.settle([ticket('T-1')]);
    await flush();

    expect(seen).toEqual([['review', 'rename', 'plan', 'T-1']]);
    expect(run.pending()).toBe(false);
  });

  it('keeps source order when a source ahead of another arrives last', async () => {
    const first = slowSource('First');
    const second = slowSource('Second');
    const run = startSuggestionQuery([first.source, second.source], '');
    second.settle([ticket('B')]);
    await flush();
    first.settle([ticket('A')]);
    await flush();

    expect(idsOf(run.groups())).toEqual(['A', 'B']);
  });

  it('limits a late answer to eight too', async () => {
    const slow = slowSource('Tickets');
    const run = startSuggestionQuery([slow.source], '');
    slow.settle(Array.from({ length: 10 }, (_, index) => ticket(`T-${index}`)));
    await flush();

    expect(idsOf(run.groups())).toHaveLength(8);
  });

  it('treats a failed promise as no results and keeps the rest', async () => {
    const slow = slowSource('Tickets');
    const run = startSuggestionQuery([commands, slow.source], '');
    slow.fail();
    await flush();

    expect(idsOf(run.groups())).toEqual(['review', 'rename', 'plan']);
    expect(run.pending()).toBe(false);
  });

  it('tells nobody once the listener has left', async () => {
    const slow = slowSource('Tickets');
    const run = startSuggestionQuery([slow.source], '');
    const heard: number[] = [];
    run.subscribe(() => heard.push(1))();
    slow.settle([ticket('T-1')]);
    await flush();

    expect(heard).toEqual([]);
  });
});
