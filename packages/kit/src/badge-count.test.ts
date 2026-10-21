import { describe, expect, it } from 'vitest';
import { countBadge, maximumBadgeCount } from './badge-count';

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
    [
      { count: maximumBadgeCount },
      { text: `${maximumBadgeCount}`, label: `${maximumBadgeCount}` },
    ],
    [
      { count: maximumBadgeCount + 1 },
      { text: `${maximumBadgeCount}+`, label: `${maximumBadgeCount}+` },
    ],
  ])('%j draws %j', (badge, expected) => {
    expect(countBadge(badge)).toEqual(expected);
  });
});
