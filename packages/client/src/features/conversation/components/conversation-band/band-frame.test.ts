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

  it('lifts normal speech to a visible bar: some bar at the loud end over 60% of the tallest', () => {
    const quarter = run(1, { state: 'listening', user: speech(0.25) });
    const loudEnd = heightsOf(quarter).slice(0, 5);

    expect(Math.max(...loudEnd)).toBeGreaterThan(barReach * 0.6);
    expect(Math.max(...heightsOf(quarter))).toBeLessThanOrEqual(barReach);
  });

  it('is irregular: bars at one level differ, and move from one moment to the next', () => {
    const over = { state: 'listening', user: speech(0.25) } as const;
    const now = heightsOf(run(1, over));
    const later = heightsOf(run(1.4, over));

    expect(new Set(now.slice(0, 8).map(Math.round)).size).toBeGreaterThan(3);
    expect(later).not.toEqual(now);
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
