import { expect, it } from 'vitest';
import { dragStart, edgeScroll, slideOffset } from './list-drag-rules';

it('scrolls toward an edge the pointer nears, faster the closer it is', () => {
  expect(edgeScroll(300, 0, 600)).toBe(0);
  expect(edgeScroll(590, 0, 600)).toBeGreaterThan(edgeScroll(570, 0, 600));
  expect(edgeScroll(570, 0, 600)).toBeGreaterThan(0);
  expect(edgeScroll(10, 0, 600)).toBeLessThan(0);
  expect(edgeScroll(-30, 0, 600)).toBe(edgeScroll(0, 0, 600));
});

it('lifts a row under the mouse once it moves a few points', () => {
  expect(dragStart({ pointer: 'mouse', heldFor: 0, distance: 1 })).toBe('wait');
  expect(dragStart({ pointer: 'mouse', heldFor: 0, distance: 6 })).toBe('lift');
});

it('lets a finger that moves before the hold scroll instead', () => {
  expect(dragStart({ pointer: 'touch', heldFor: 100, distance: 20 })).toBe(
    'scroll',
  );
  expect(dragStart({ pointer: 'touch', heldFor: 100, distance: 2 })).toBe(
    'wait',
  );
});

it('lifts a row under a finger that held it and then moves', () => {
  expect(dragStart({ pointer: 'touch', heldFor: 400, distance: 2 })).toBe(
    'wait',
  );
  expect(dragStart({ pointer: 'touch', heldFor: 400, distance: 20 })).toBe(
    'lift',
  );
});

// The lifted row was 50 tall with its top at 100; the insertion line is at 250.
const lifted = { sourceTop: 100, lineY: 250, height: 50 };

it("closes the lifted row's slot while it aims nowhere, and slides nothing with no row lifted", () => {
  expect(slideOffset({ ...lifted, lineY: undefined }, 160)).toBe(-50);
  expect(slideOffset(undefined, 160)).toBe(0);
});
