import { describe, expect, it } from 'vitest';
import { slotVisibility } from './slot-visibility';

describe('what a Slot shows on this Device', () => {
  it('shows every Plugin until the Device chooses', () => {
    expect(slotVisibility({ hidden: [] }).shows('issues')).toBe(true);
  });

  it('leaves out a Plugin the Device turned off', () => {
    const visibility = slotVisibility({ hidden: ['deploys'] });

    expect(visibility.shows('deploys')).toBe(false);
    expect(visibility.shows('issues')).toBe(true);
  });
});
