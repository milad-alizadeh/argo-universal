import { describe, expect, it } from 'vitest';
import { attentionBadge, sectionAttentionCount } from './attention-badge';

describe('attentionBadge', () => {
  it.each([
    [0, null],
    [1, { label: '1 Session needs attention', text: '1' }],
    [3, { label: '3 Sessions need attention', text: '3' }],
  ])('for %i attention shows %j', (count, expected) => {
    expect(attentionBadge(count)).toEqual(expected);
  });
});

describe('sectionAttentionCount', () => {
  it.each([
    ['sessions', 4],
    ['issues', 0],
    ['atlas', 0],
    ['settings', 0],
  ] as const)('gives %s a count of %i', (section, expected) => {
    expect(sectionAttentionCount(section, 4)).toBe(expected);
  });
});
