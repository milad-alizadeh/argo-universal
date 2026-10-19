import { describe, expect, it } from 'vitest';
import { paneShift } from './pane-shift';

describe('paneShift', () => {
  it.each([
    {
      name: 'starts a widening page where its centred column was',
      from: { offset: 312, width: 1000 },
      to: { offset: 0, width: 1312 },
      shift: 156,
    },
    {
      name: 'starts a narrowing page where its centred column was',
      from: { offset: 0, width: 1312 },
      to: { offset: 312, width: 1000 },
      shift: -156,
    },
    {
      name: 'starts a pane that keeps its width at its old edge',
      from: { offset: 1000, width: 352 },
      to: { offset: 648, width: 352 },
      shift: 352,
    },
    {
      name: 'stays put when nothing moved',
      from: { offset: 64, width: 900 },
      to: { offset: 64, width: 900 },
      shift: 0,
    },
  ])('$name', ({ from, to, shift }) => {
    expect(paneShift(from, to)).toBe(shift);
  });
});
