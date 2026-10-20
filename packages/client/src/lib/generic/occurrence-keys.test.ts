import { describe, expect, it } from 'vitest';
import { withOccurrenceKeys } from './occurrence-keys';

describe('withOccurrenceKeys', () => {
  it('keys items by their own key when it is unique', () => {
    expect(withOccurrenceKeys(['a', 'b'], (item) => item)).toEqual([
      { item: 'a', key: 'a' },
      { item: 'b', key: 'b' },
    ]);
  });

  it('numbers repeats so a key never collides', () => {
    expect(
      withOccurrenceKeys(['a', 'b', 'a', 'a'], (item) => item).map(
        ({ key }) => key,
      ),
    ).toEqual(['a', 'b', 'a#2', 'a#3']);
  });

  it('skips a number another item already uses as its own key', () => {
    expect(
      withOccurrenceKeys(['a', 'a#2', 'a'], (item) => item).map(
        ({ key }) => key,
      ),
    ).toEqual(['a', 'a#2', 'a#3']);
  });

  /*
   * A fence's syntax spans repeat one short run of text thousands of times over. Probing from the
   * first number each time squares that; this finishes in milliseconds and times out if it ever
   * goes back to squaring.
   */
  it('keys a long run of one repeated item', () => {
    const keys = withOccurrenceKeys(
      Array.from({ length: 20_000 }, () => 'a'),
      (item) => item,
    ).map(({ key }) => key);

    expect(new Set(keys).size).toBe(20_000);
    expect(keys.at(0)).toBe('a');
    expect(keys.at(-1)).toBe('a#20000');
  });

  it('keeps a key when an item is added after it', () => {
    const before = withOccurrenceKeys(['a', 'a'], (item) => item);
    const after = withOccurrenceKeys(['a', 'a', 'b'], (item) => item);
    expect(after.slice(0, 2)).toEqual(before);
  });
});
