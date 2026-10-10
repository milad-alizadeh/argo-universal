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

  it('keeps a key when an item is added after it', () => {
    const before = withOccurrenceKeys(['a', 'a'], (item) => item);
    const after = withOccurrenceKeys(['a', 'a', 'b'], (item) => item);
    expect(after.slice(0, 2)).toEqual(before);
  });
});
