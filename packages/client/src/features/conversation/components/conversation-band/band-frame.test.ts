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

const sampledBars = 16;

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

  it.each(['listening', 'talking'] as const)(
    'follows the active voice getting louder and then falling silent while %s',
    (state) => {
      const voice = state === 'listening' ? 'user' : 'agent';
      const quiet = run(1, { state, [voice]: speech(0.1) });
      const loud = run(1, { state, [voice]: speech(0.5) }, quiet.sim);
      const silent = run(2, { state }, loud.sim);

      expect(Math.max(...heightsOf(loud))).toBeGreaterThan(
        Math.max(...heightsOf(quiet)),
      );
      expect(Math.max(...heightsOf(loud))).toBeLessThanOrEqual(barReach);
      expect(Math.max(...heightsOf(silent))).toBeLessThanOrEqual(dot);
    },
  );

  it.each(['listening', 'talking'] as const)(
    'ignores the inactive voice while %s',
    (state) => {
      const voice = state === 'listening' ? 'agent' : 'user';
      const inactive = run(2, { state, [voice]: speech(0.5) });

      expect(Math.max(...heightsOf(inactive))).toBeLessThanOrEqual(dot);
    },
  );

  it('stays flat in silence however long it runs', () => {
    const silent = run(3, { state: 'listening' });

    expect(Math.max(...heightsOf(silent))).toBeLessThanOrEqual(dot);
  });

  it('gives bars at one level different heights', () => {
    const level = heightsOf(run(1, steady));
    const distinct = new Set(level.slice(0, sampledBars).map(Math.round));

    expect(distinct.size).toBeGreaterThan(sampledBars / 4);
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
