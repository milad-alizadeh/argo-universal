import { describe, expect, it } from 'vitest';
import { quietestBar, waveBars, type WaveMoment } from './wave-bars';

const count = 20;

const barsOf = (moment: Partial<WaveMoment>): number[] => {
  const bars = new Float32Array(count);
  waveBars(bars, {
    pattern: 'listening',
    heard: undefined,
    time: 0,
    ...moment,
  });

  return [...bars];
};

describe('the wave while someone speaks', () => {
  it('rests every bar at its quietest in silence', () => {
    const quiet = barsOf({ heard: new Float32Array(8) });

    for (const bar of quiet) expect(bar).toBeCloseTo(quietestBar);
  });

  it('draws the low bands in the middle and mirrors them out to both edges', () => {
    const bars = barsOf({
      pattern: 'talking',
      heard: Float32Array.of(1, 0.5, 0, 0, 0, 0, 0, 0),
    });

    expect(bars[count / 2]).toBe(1);
    expect(bars[count / 2 - 1]).toBe(1);
    expect(bars).toEqual([...bars].reverse());
    expect(bars[0]).toBeCloseTo(quietestBar);
  });
});

describe('the wave while nobody speaks', () => {
  it('sweeps a pair of bars in from the edges while connecting', () => {
    const start = barsOf({ pattern: 'connecting' });

    const raised = start.flatMap((bar, index) =>
      bar > quietestBar + 0.01 ? [index] : [],
    );

    expect(raised).toEqual([0, count - 1]);
    expect(barsOf({ pattern: 'connecting', time: 0.5 })).not.toEqual(start);
  });

  it('rolls a soft wave while thinking, never silent, never full, and deaf to any sound', () => {
    const loud = new Float32Array(8).fill(1);
    const now = barsOf({ pattern: 'thinking', heard: loud, time: 1 });

    for (const bar of now) {
      expect(bar).toBeGreaterThanOrEqual(quietestBar - 0.001);
      expect(bar).toBeLessThanOrEqual(0.8);
    }

    expect(barsOf({ pattern: 'thinking', time: 2 })).not.toEqual(now);
  });
});
