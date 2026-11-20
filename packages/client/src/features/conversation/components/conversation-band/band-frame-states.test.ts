import { describe, expect, it } from 'vitest';
import { newSim, stepBand } from './band-frame';
import {
  blueOf,
  count,
  fillOf,
  heightsOf,
  input,
  redOf,
  run,
  speech,
  tallest,
} from './band-frame.test.mocks';
import { barWidth } from './band-layout';

const reduced = { dt: 1 / 60, reduced: true };

// The turn's tone after `frames` frames of `dt` seconds each, with the Agent talking.
const toneAfter = (dt: number, frames: number): number =>
  Array.from({ length: frames }).reduce<ReturnType<typeof newSim>>(
    (sim) =>
      stepBand(
        sim,
        input({
          state: 'talking',
          agent: speech(0.3),
          tick: { dt, reduced: false },
        }),
      ).sim,
    newSim(),
  ).pose.tone;

describe('a state change', () => {
  const listening = run(1, { state: 'listening', user: speech(0.3) });
  const talking = { state: 'talking', agent: speech(0.3) } as const;
  const early = run(0.1, talking, listening.sim);
  const late = run(0.5, talking, listening.sim);

  it('sweeps the colour across the same bars over a few tenths of a second', () => {
    // Part way through the turn the Agent's end has turned blue, and the person's end is still more orange than at the end.
    expect(blueOf(fillOf(early, count - 1))).toBeGreaterThan(200);
    expect(redOf(fillOf(early, 0))).toBeGreaterThan(redOf(fillOf(late, 0)));
    expect(blueOf(fillOf(late, 0))).toBeGreaterThan(200);
    expect(heightsOf(late)).toHaveLength(count);
  });

  it('is the same at any frame rate', () => {
    expect(toneAfter(1 / 30, 30)).toBeCloseTo(toneAfter(1 / 60, 60), 6);
  });
});

describe('thinking and connecting', () => {
  it('lights a single soft pulse that travels across the strip', () => {
    const first = heightsOf(run(1.2, { state: 'thinking' }));
    const later = heightsOf(run(2, { state: 'thinking' }));

    expect(Math.max(...first)).toBeGreaterThan(barWidth + 3);
    expect(tallest(later)).not.toBe(tallest(first));
  });

  it('rests the pulse in the middle under reduced motion', () => {
    const middle = Math.floor(count / 2);

    expect(
      tallest(heightsOf(run(1, { state: 'thinking', tick: reduced }))),
    ).toBe(middle);
    expect(
      tallest(heightsOf(run(3, { state: 'thinking', tick: reduced }))),
    ).toBe(middle);
  });

  it('turns every bar the warning colour while reconnecting', () => {
    const frame = run(1, { state: 'reconnecting' });

    expect(redOf(fillOf(frame, 0))).toBeGreaterThan(200);
    expect(blueOf(fillOf(frame, 0))).toBeLessThan(60);
  });
});
