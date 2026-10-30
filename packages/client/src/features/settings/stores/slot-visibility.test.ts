import { describe, expect, it } from 'vitest';
import { slotVisibility } from './slot-visibility';

describe('what a Slot shows on this Device', () => {
  it('shows every Plugin and leaves the line to Argo until the Device chooses', () => {
    const visibility = slotVisibility({ hidden: [], owner: null });

    expect(visibility.shows('issues')).toBe(true);
    expect(visibility.owner).toBeNull();
  });

  it('leaves out a Plugin the Device turned off', () => {
    const visibility = slotVisibility({ hidden: ['deploys'], owner: null });

    expect(visibility.shows('deploys')).toBe(false);
    expect(visibility.shows('issues')).toBe(true);
  });

  it('keeps the chosen Plugin as the one that writes the Single-owner line', () => {
    expect(slotVisibility({ hidden: [], owner: 'coverage' }).owner).toBe(
      'coverage',
    );
  });

  it('gives the line back to Argo when its owner is turned off', () => {
    const visibility = slotVisibility({ hidden: ['issues'], owner: 'issues' });

    expect(visibility.owner).toBeNull();
  });
});
