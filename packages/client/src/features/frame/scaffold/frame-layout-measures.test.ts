import { expect, it } from 'vitest';
import { listMaximum, listWidthForText } from './frame-layout-measures';

it('keeps the list at its default width at the default text size', () => {
  expect(listWidthForText(312, 1)).toBe(312);
});

it('widens the list with the text so a row title keeps its characters per line', () => {
  expect(listWidthForText(312, 1.3)).toBeGreaterThan(312);
  expect(listWidthForText(312, 1.3)).toBeLessThan(listWidthForText(312, 1.6));
});

it('stops at the width a person can drag the list to', () => {
  expect(listWidthForText(312, 3.1)).toBe(listMaximum);
});

it('never narrows the list below its default for text smaller than the default', () => {
  expect(listWidthForText(312, 0.8)).toBe(312);
});
