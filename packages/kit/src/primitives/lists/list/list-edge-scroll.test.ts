import { expect, it } from 'vitest';
import { edgeScroll } from './list-edge-scroll';

it('scrolls nothing with the pointer away from both edges', () => {
  expect(edgeScroll(300, 0, 600)).toBe(0);
});

it('scrolls toward the end the pointer nears, faster the closer it is', () => {
  expect(edgeScroll(570, 0, 600)).toBeGreaterThan(0);
  expect(edgeScroll(590, 0, 600)).toBeGreaterThan(edgeScroll(570, 0, 600));
});

it('scrolls back toward the start the pointer nears', () => {
  expect(edgeScroll(10, 0, 600)).toBeLessThan(0);
});

it('scrolls at most the full step past an edge', () => {
  expect(edgeScroll(-30, 0, 600)).toBe(edgeScroll(0, 0, 600));
});
