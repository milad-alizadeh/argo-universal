import { describe, expect, it } from 'vitest';
import { countBadge } from './badge-count';

describe('countBadge', () => {
  it.each([
    [undefined, undefined],
    [{ count: 0, label: 'none waiting' }, undefined],
    [{ count: -1 }, undefined],
    [{ count: 3 }, { text: '3', label: '3' }],
    [
      { count: 3, label: '3 waiting' },
      { text: '3', label: '3 waiting' },
    ],
    [{ count: 99 }, { text: '99', label: '99' }],
    [{ count: 100 }, { text: '99+', label: '99+' }],
  ])('%j draws %j', (badge, expected) => {
    expect(countBadge(badge)).toEqual(expected);
  });
});
