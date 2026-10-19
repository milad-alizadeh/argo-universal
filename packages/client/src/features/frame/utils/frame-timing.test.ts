import { describe, expect, it } from 'vitest';
import { frameTiming } from './frame-timing';

describe('frameTiming', () => {
  it.each([
    { name: 'collapses the sidebar in 200ms', from: true, to: false, ms: 200 },
    { name: 'expands the sidebar in 250ms', from: false, to: true, ms: 250 },
  ])('$name', ({ from, to, ms }) => {
    expect(frameTiming(from, to).duration).toBe(ms);
  });

  // An ease-out curve starts at full speed: its first control point sits on the origin.
  it('eases both sidebar motions out', () => {
    expect(frameTiming(true, false).curve).toEqual(
      frameTiming(false, true).curve,
    );
    expect(frameTiming(true, false).curve).toMatchObject({ x1: 0, y1: 0 });
  });

  it('keeps one pane motion when the sidebar stays', () => {
    expect(frameTiming(true, true)).toEqual(frameTiming(false, false));
    expect(frameTiming(true, true)).not.toEqual(frameTiming(true, false));
  });
});
