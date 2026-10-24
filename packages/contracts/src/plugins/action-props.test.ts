import { describe, expect, it } from 'vitest';
import { actionEntryProps } from './action-props';

const sort = { label: 'Sort', icon: 'filter-list' };

describe('an Action entry', () => {
  it.each([
    [
      'a press Action',
      { label: 'Newest', icon: 'arrow-down', onPress: { $event: 'onPress' } },
    ],
    ['a submenu', sort],
    [
      'a submenu with a count badge',
      { ...sort, badge: { kind: 'count', count: 3 } },
    ],
    [
      'a submenu with a status dot',
      { ...sort, badge: { kind: 'status', tone: 'warning' } },
    ],
  ])('accepts %s', (_, props) => {
    expect(actionEntryProps.safeParse(props).success).toBe(true);
  });

  it.each([
    ['a submenu without an icon', { label: 'Sort' }],
    ['a submenu with an unknown badge', { ...sort, badge: { kind: 'new' } }],
  ])('refuses %s', (_, props) => {
    expect(actionEntryProps.safeParse(props).success).toBe(false);
  });
});
