import { describe, expect, it } from 'vitest';
import {
  blendOf,
  easeToward,
  liftOf,
  poseTargetOf,
  rmsOf,
  smoothLevel,
  type Tick,
  turnBlend,
} from './band-motion';

const frame = (reduced: boolean): Tick => ({ dt: 1 / 60, reduced });

const run = (steps: number, step: () => void): void => {
  for (let index = 0; index < steps; index += 1) step();
};

describe('easing', () => {
  it('lands in the same place whatever the frame rate', () => {
    let coarse = 0;
    let fine = 0;

    run(30, () => {
      coarse = easeToward(coarse, 1, blendOf(1 / 30, 0.12));
    });
    run(60, () => {
      fine = easeToward(fine, 1, blendOf(1 / 60, 0.12));
    });

    expect(coarse).toBeCloseTo(fine, 6);
  });

  it('settles in a few tenths of a second', () => {
    let value = 0;

    run(24, () => {
      value = easeToward(value, 1, blendOf(1 / 60, 0.12));
    });

    expect(value).toBeGreaterThan(0.85);
    expect(value).toBeLessThan(1);
  });
});

describe('smoothed levels', () => {
  it('rises faster than it falls', () => {
    const rise = smoothLevel(0, 1, frame(false));
    const fall = 1 - smoothLevel(1, 0, frame(false));

    expect(rise).toBeGreaterThan(fall * 2);
  });

  it('is frame-rate independent', () => {
    let coarse = 0;
    let fine = 0;

    run(10, () => {
      coarse = smoothLevel(coarse, 0.8, { dt: 1 / 30, reduced: false });
    });
    run(20, () => {
      fine = smoothLevel(fine, 0.8, frame(false));
    });

    expect(coarse).toBeCloseTo(fine, 6);
  });

  it('moves slower under reduced motion', () => {
    expect(smoothLevel(0, 1, frame(true))).toBeLessThan(
      smoothLevel(0, 1, frame(false)),
    );
  });
});

describe('how loud a voice is', () => {
  it('is the root mean square of its bands', () => {
    expect(rmsOf([0, 0, 0, 0])).toBe(0);
    expect(rmsOf([1, 1, 1, 1])).toBe(1);
    expect(rmsOf([0.6, 0.8])).toBeCloseTo(Math.sqrt((0.36 + 0.64) / 2), 6);
  });

  it('lifts ordinary speech to a visible bar and keeps silence a dot', () => {
    expect(liftOf(0)).toBe(0);
    // A band at a quarter of the analyser's range is normal speech: it must fill over half the bar.
    expect(liftOf(0.25)).toBeGreaterThan(0.5);
    expect(liftOf(1)).toBeLessThanOrEqual(1);
  });
});

describe('the poses', () => {
  it('gives each state its own look', () => {
    expect(poseTargetOf('listening')).toMatchObject({
      user: 1,
      agent: 0,
      tone: 0,
    });
    expect(poseTargetOf('talking')).toMatchObject({
      user: 0,
      agent: 1,
      tone: 1,
    });
    expect(poseTargetOf('thinking')).toMatchObject({ think: 1, tone: 1 });
    expect(poseTargetOf('connecting')).toMatchObject({ connect: 1 });
    expect(poseTargetOf('muted')).toMatchObject({ mute: 1, tone: 0 });
    expect(poseTargetOf('reconnecting')).toMatchObject({ connect: 1, warn: 1 });
    expect(poseTargetOf('blocked')).toMatchObject({ mute: 1 });
  });
});

describe('the turn sweep', () => {
  it('turns the strip blue from the Agent end first, and orange again from the other', () => {
    const early = [0, 0.25, 0.5, 0.75, 1].map((u) => turnBlend(u, 0.4));

    // At a partial turn the right end (the Agent's) has gone further than the left.
    expect(early[4]).toBeGreaterThan(early[0] ?? 1);
    expect(early).toEqual([...early].sort((a, b) => a - b));
  });

  it('is fully orange before the turn and fully blue after it', () => {
    for (const u of [0, 0.5, 1]) {
      expect(turnBlend(u, 0)).toBe(0);
      expect(turnBlend(u, 1)).toBe(1);
    }
  });

  it('crosses the whole strip in about 0.4 seconds', () => {
    let tone = 0;
    let seconds = 0;

    while (turnBlend(0, tone) < 0.99 && seconds < 2) {
      tone = easeToward(tone, 1, blendOf(1 / 60, 0.13));
      seconds += 1 / 60;
    }

    expect(seconds).toBeGreaterThan(0.3);
    expect(seconds).toBeLessThan(0.5);
  });
});
