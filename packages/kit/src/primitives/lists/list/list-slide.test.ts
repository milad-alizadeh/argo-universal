import { expect, it } from 'vitest';
import { slideOffset } from './list-slide';

// The lifted row was 50 tall with its top at 100.
const lifted = { sourceTop: 100, lineY: undefined, height: 50 };

it("closes the lifted row's slot while it aims nowhere", () => {
  expect(slideOffset(lifted, 160)).toBe(-50);
});

it('slides nothing with no row lifted', () => {
  expect(slideOffset(undefined, 160)).toBe(0);
});
