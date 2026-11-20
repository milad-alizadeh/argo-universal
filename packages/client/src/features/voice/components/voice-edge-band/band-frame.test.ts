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

  it('lifts normal speech to a visible bar: over 60% of the tallest bar at the loud end', () => {
    const quarter = run(1, { state: 'listening', user: speech(0.25) });

    expect(heightsOf(quarter)[0]).toBeGreaterThan(barReach * 0.6);
    expect(Math.max(...heightsOf(quarter))).toBeLessThanOrEqual(barReach);
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
