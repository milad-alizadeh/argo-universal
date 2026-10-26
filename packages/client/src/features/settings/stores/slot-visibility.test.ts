import { describe, expect, it } from 'vitest';
import { ownerItem, slotVisibility, visibleItems } from './slot-visibility';

const merged = {
  items: [
    { pluginId: 'issues', item: 'Issue 412' },
    { pluginId: 'deploys', item: 'Preview ready' },
  ],
  overflow: [{ pluginId: 'coverage', item: '78%' }],
};

describe('what a Slot shows on this Device', () => {
  it('shows every Plugin and Argo’s line until the Device chooses', () => {
    const visibility = slotVisibility({ hidden: [], owner: null });

    expect(visibleItems(merged, visibility)).toEqual([
      'Issue 412',
      'Preview ready',
    ]);
    expect(ownerItem(merged, visibility)).toBeUndefined();
  });

  it('lets the next Plugin in line take a hidden Plugin’s place', () => {
    const visibility = slotVisibility({ hidden: ['deploys'], owner: null });

    expect(visibleItems(merged, visibility)).toEqual(['Issue 412', '78%']);
  });

  it('shows the chosen owner’s answer, even past what fits', () => {
    const visibility = slotVisibility({ hidden: [], owner: 'coverage' });

    expect(ownerItem(merged, visibility)).toBe('78%');
  });

  it('gives the line back to Argo when its owner is turned off', () => {
    const visibility = slotVisibility({ hidden: ['issues'], owner: 'issues' });

    expect(visibility.owner).toBeNull();
    expect(ownerItem(merged, visibility)).toBeUndefined();
  });
});
