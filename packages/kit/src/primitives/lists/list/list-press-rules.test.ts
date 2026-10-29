import { expect, it } from 'vitest';
import { dragStart } from './list-press-rules';

it('lifts a row under the mouse once it moves a few points', () => {
  expect(dragStart({ pointer: 'mouse', heldFor: 0, distance: 1 })).toBe('wait');
  expect(dragStart({ pointer: 'mouse', heldFor: 0, distance: 6 })).toBe('lift');
});

it('lets a finger that moves before the hold scroll instead', () => {
  expect(dragStart({ pointer: 'touch', heldFor: 100, distance: 20 })).toBe(
    'scroll',
  );
});

it('waits while a finger stays still', () => {
  expect(dragStart({ pointer: 'touch', heldFor: 100, distance: 2 })).toBe(
    'wait',
  );
  expect(dragStart({ pointer: 'touch', heldFor: 400, distance: 2 })).toBe(
    'wait',
  );
});

it('lifts a row under a finger that moves after holding it', () => {
  expect(dragStart({ pointer: 'touch', heldFor: 400, distance: 20 })).toBe(
    'lift',
  );
});
