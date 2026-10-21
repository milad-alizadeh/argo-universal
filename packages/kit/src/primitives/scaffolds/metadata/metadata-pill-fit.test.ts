import { describe, expect, it } from 'vitest';
import { fitPills, pillIdentity } from './metadata-pill-fit';

const pills = [{ text: 'iOS' }, { text: 'Android' }, { text: 'Web' }];

function measured(available: number): Parameters<typeof fitPills>[1] {
  const widths = Object.fromEntries([
    ...pills.map((pill) => [pillIdentity(pill), 40]),
    ...pills.map((_, index) => [`+${index + 1}`, 20]),
  ]);

  return { widths, available, gap: 4 };
}

describe('fitPills', () => {
  it('shows every Pill until all are measured', () => {
    expect(fitPills(pills, { widths: {}, available: 10, gap: 4 })).toBe(3);
  });

  it('shows every Pill when they all fit', () => {
    expect(fitPills(pills, measured(128))).toBe(3);
  });

  it('leaves room for the "+N" Pill', () => {
    expect(fitPills(pills, measured(100))).toBe(1);
  });

  it('collapses every Pill into "+N" when even one does not fit', () => {
    expect(fitPills(pills, measured(30))).toBe(0);
  });
});
