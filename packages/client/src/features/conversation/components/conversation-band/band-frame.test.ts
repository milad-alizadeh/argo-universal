import { describe, expect, it } from 'vitest';
import {
  blueOf,
  count,
  fillOf,
  heightsOf,
  redOf,
  run,
  speech,
} from './band-frame.test.mocks';
import { barReach, barWidth } from './band-layout';

const dot = barWidth + 0.5;

// the half of the strip at the person's end, where speech stands tallest.
const loudEndBars = 16;

const seconds = [1, 1.2, 1.4, 1.6, 1.8];

const steady = { state: 'listening', user: speech(0.25) } as const;

describe('the bars at rest', () => {
  it('are dots', () => {
    const heights = heightsOf(run(1, { state: 'listening' }));

    expect(heights).toHaveLength(count);
    expect(Math.max(...heights)).toBeLessThanOrEqual(dot);
  });
});

describe('speech', () => {
  const person = run(1, { state: 'listening', user: speech(0.3) });
  const agent = run(1, { state: 'talking', agent: speech(0.3) });
  const last = count - 1;

  it('lifts the left bars when the person speaks, and the right ones when the Agent does', () => {
    expect(heightsOf(person)[0]).toBeGreaterThan(
      heightsOf(person)[last] ?? Infinity,
    );
    expect(heightsOf(agent)[last]).toBeGreaterThan(
      heightsOf(agent)[0] ?? Infinity,
    );
  });

  it('lifts normal speech to a visible bar: at the loud end a bar rises over 60% of the tallest', () => {
    const moments = seconds.map((at) => heightsOf(run(at, steady)));
    const loudEnd = moments.flatMap((bars) => bars.slice(0, loudEndBars));

    expect(Math.max(...loudEnd)).toBeGreaterThan(barReach * 0.6);
    expect(Math.max(...moments.flat())).toBeLessThanOrEqual(barReach);
  });

  it('stays flat in silence however long it runs', () => {
    const silent = run(3, { state: 'listening' });

    expect(Math.max(...heightsOf(silent))).toBeLessThanOrEqual(dot);
  });

  it('gives bars at one level different heights', () => {
    const level = heightsOf(run(1, steady));
    const distinct = new Set(level.slice(0, loudEndBars).map(Math.round));

    expect(distinct.size).toBeGreaterThan(loudEndBars / 4);
  });

  it('moves the bars from one moment to the next', () => {
    expect(heightsOf(run(1.4, steady))).not.toEqual(heightsOf(run(1, steady)));
  });

  it('is orange for the person and blue for the Agent', () => {
    expect(redOf(fillOf(person, 0))).toBeGreaterThan(200);
    expect(blueOf(fillOf(agent, last))).toBeGreaterThan(200);
  });

  it('is ignored while the microphone is muted', () => {
    const muted = run(1, { state: 'muted', user: speech(0.5) });

    expect(Math.max(...heightsOf(muted))).toBeLessThanOrEqual(dot);
  });
});
