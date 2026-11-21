import { describe, expect, it } from 'vitest';
import { pulseCentre, springStep, type Spring, type Tick } from './band-motion';

const frame = (reduced: boolean): Tick => ({ dt: 1 / 60, reduced });

// Springs towards 1 for two seconds, and gives the highest the bar got and where it ended.
interface Settled {
  peak: number;
  end: number;
}

function settle(reduced: boolean): Settled {
  const path = Array.from({ length: 120 }).reduce<Spring[]>(
    (springs) => [
      ...springs,
      springStep(springs.at(-1) ?? [0, 0], 1, frame(reduced)),
    ],
    [],
  );

  return {
    peak: Math.max(...path.map(([position]) => position)),
    end: path.at(-1)?.[0] ?? 0,
  };
}

describe('the pulse', () => {
  it('travels across the strip, and wraps', () => {
    const a = pulseCentre(0, false);
    const b = pulseCentre(1, false);

    expect(b).toBeGreaterThan(a);
    expect(pulseCentre(0, false)).toBeLessThan(0);
    expect(pulseCentre(3, false)).toBeLessThan(1);
  });

  it('rests in the middle under reduced motion', () => {
    expect(pulseCentre(0, true)).toBe(0.5);
    expect(pulseCentre(7, true)).toBe(0.5);
  });
});

describe('the bar springs', () => {
  it('overshoots a little and settles on the target', () => {
    const { peak, end } = settle(false);

    expect(peak).toBeGreaterThan(1.03);
    expect(peak).toBeLessThan(1.3);
    expect(end).toBeCloseTo(1, 2);
  });

  it('does not overshoot under reduced motion', () => {
    const { peak, end } = settle(true);

    expect(peak).toBeLessThanOrEqual(1.001);
    expect(end).toBeCloseTo(1, 2);
  });
});
