import { describe, expect, it } from 'vitest';
import { attentionBadge } from './attention-badge';

describe('attentionBadge', () => {
  it.each([
    [0, null],
    [1, { label: '1 Session needs attention', text: '1' }],
    [3, { label: '3 Sessions need attention', text: '3' }],
    [99, { label: '99 Sessions need attention', text: '99' }],
    [100, { label: '100 Sessions need attention', text: '99+' }],
  ])('for %i attention shows %j', (count, expected) => {
    expect(attentionBadge(count)).toEqual(expected);
  });
});
