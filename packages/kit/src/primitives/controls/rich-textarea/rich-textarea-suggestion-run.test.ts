import { describe, expect, it } from 'vitest';
import { SuggestionRun } from './rich-textarea-suggestion-run';
import type {
  ComposerSuggestion,
  SuggestionGroup,
  SuggestionSource,
} from './rich-textarea-suggestions';

const ticket = (id: string): ComposerSuggestion => ({
  id,
  label: id,
  insert: `${id} `,
});

const fixed = (id: string, count: number): SuggestionSource => ({
  id,
  title: id,
  query: () =>
    Array.from({ length: count }, (_, index) => ticket(`${id}-${index}`)),
});

const idsOf = (groups: SuggestionGroup[]): string[] =>
  groups.flatMap(({ suggestions }) => suggestions.map(({ id }) => id));

interface Deferred {
  source: SuggestionSource;
  settle: (results: ComposerSuggestion[]) => void;
  fail: () => void;
}

// A source that answers with a promise the test settles by hand.
function slowSource(id: string): Deferred {
  const deferred = Promise.withResolvers<ComposerSuggestion[]>();

  return {
    source: { id, title: id, query: () => deferred.promise },
    settle: deferred.resolve,
    fail: () => deferred.reject(new Error('down')),
  };
}

const flush = (): Promise<void> => new Promise((done) => setTimeout(done, 0));

describe('SuggestionRun', () => {
  it('keeps source order, the first eight of each, and drops empty sources', () => {
    const run = new SuggestionRun(
      [fixed('none', 0), fixed('many', 10), fixed('few', 2)],
      '',
    );

    expect(run.groups().map(({ source }) => source.id)).toEqual([
      'many',
      'few',
    ]);
    expect(idsOf(run.groups()).slice(7, 9)).toEqual(['many-7', 'few-0']);
  });

  it('shows a synchronous source at once and a late one when it arrives', async () => {
    const slow = slowSource('Tickets');
    const run = new SuggestionRun([fixed('sync', 2), slow.source], '');
    const seen: string[][] = [];
    run.subscribe(() => seen.push(idsOf(run.groups())));

    expect(idsOf(run.groups())).toEqual(['sync-0', 'sync-1']);
    expect(run.pending()).toBe(true);
    slow.settle([ticket('T-1')]);
    await flush();

    expect(seen).toEqual([['sync-0', 'sync-1', 'T-1']]);
    expect(run.pending()).toBe(false);
  });

  it('keeps source order when the first source arrives last', async () => {
    const first = slowSource('First');
    const second = slowSource('Second');
    const run = new SuggestionRun([first.source, second.source], '');
    second.settle([ticket('B')]);
    await flush();
    first.settle([ticket('A')]);
    await flush();

    expect(idsOf(run.groups())).toEqual(['A', 'B']);
  });

  it('limits a late answer to eight too', async () => {
    const slow = slowSource('Tickets');
    const run = new SuggestionRun([slow.source], '');
    slow.settle(Array.from({ length: 10 }, (_, index) => ticket(`T-${index}`)));
    await flush();

    expect(idsOf(run.groups())).toHaveLength(8);
  });

  it('treats a failed promise as no results and keeps the rest', async () => {
    const slow = slowSource('Tickets');
    const run = new SuggestionRun([fixed('sync', 1), slow.source], '');
    slow.fail();
    await flush();

    expect(idsOf(run.groups())).toEqual(['sync-0']);
    expect(run.pending()).toBe(false);
  });

  it('tells nobody once the listener has left', async () => {
    const slow = slowSource('Tickets');
    const run = new SuggestionRun([slow.source], '');
    const heard: number[] = [];
    run.subscribe(() => heard.push(1))();
    slow.settle([ticket('T-1')]);
    await flush();

    expect(heard).toEqual([]);
  });
});
