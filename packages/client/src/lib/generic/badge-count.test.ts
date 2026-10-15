import { describe, expect, it } from 'vitest';
import { countBadge } from './badge-count';

describe('countBadge', () => {
  it.each([
    [undefined, undefined, undefined],
    [0, 'none waiting', undefined],
    [-1, undefined, undefined],
    [3, undefined, { text: '3', label: '3' }],
    [3, '3 waiting', { text: '3', label: '3 waiting' }],
  ])('count %j labelled %j draws %j', (count, label, expected) => {
    expect(countBadge(count, label)).toEqual(expected);
  });
});
