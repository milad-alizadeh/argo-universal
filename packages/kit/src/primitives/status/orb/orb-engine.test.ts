import { describe, expect, it } from 'vitest';
import { makeDotBuffer } from './engine/core';
import { resolvePreset } from './engine/presets';
import { MODE_DRAWS } from './engine/registry';
import type { Dot } from './engine/types';
import { defaultRMin, inkLevel, minAlpha } from './orb-ink';
import type { OrbSize, OrbState } from './orb-props';

interface Frame {
  state: OrbState;
  size: OrbSize;
  seconds: number;
  count: number;
  sum: number;
}

function frame(
  [state, size, seconds]: [OrbState, OrbSize, number],
  [count, sum]: [number, number],
): Frame {
  return { state, size, seconds, count, sum };
}

/*
 * Each frame as the original thinking-orbs draws it on a light page: the dots it paints, and a sum
 * over their position, radius, grey and alpha. Taken from the original's own canvas calls.
 */
const original: Frame[] = [
  frame(['working', 'md', 0.5], [516, 53328.33489]),
  frame(['working', 'md', 3.7], [516, 53328.354498]),
  frame(['working', 'md', 12.1], [516, 53328.354498]),
  frame(['working', 'sm', 0.5], [39, 1487.074928]),
  frame(['working', 'sm', 3.7], [39, 1487.074928]),
  frame(['working', 'sm', 12.1], [39, 1487.114143]),
  frame(['searching', 'md', 0.5], [204, 21057.556776]),
  frame(['searching', 'md', 3.7], [204, 20991.854203]),
  frame(['searching', 'md', 12.1], [204, 21013.698375]),
  frame(['searching', 'sm', 0.5], [54, 1981.188041]),
  frame(['searching', 'sm', 3.7], [54, 1967.660015]),
  frame(['searching', 'sm', 12.1], [54, 1975.874265]),
  frame(['solving', 'md', 0.5], [138, 14563.622657]),
  frame(['solving', 'md', 3.7], [138, 14410.332265]),
  frame(['solving', 'md', 12.1], [138, 14705.608587]),
  frame(['solving', 'sm', 0.5], [30, 1179.51129]),
  frame(['solving', 'sm', 3.7], [30, 1208.082874]),
  frame(['solving', 'sm', 12.1], [30, 1211.630824]),
  frame(['listening', 'md', 0.5], [134, 14371.210756]),
  frame(['listening', 'md', 3.7], [134, 14460.448418]),
  frame(['listening', 'md', 12.1], [134, 14114.340014]),
  frame(['listening', 'sm', 0.5], [42, 1715.117309]),
  frame(['listening', 'sm', 3.7], [42, 1695.773259]),
  frame(['listening', 'sm', 12.1], [42, 1697.254562]),
  frame(['composing', 'md', 0.5], [566, 59118.241993]),
  frame(['composing', 'md', 3.7], [566, 59113.982801]),
  frame(['composing', 'md', 12.1], [566, 59114.156253]),
  frame(['composing', 'sm', 0.5], [208, 7891.946756]),
  frame(['composing', 'sm', 3.7], [208, 7891.793233]),
  frame(['composing', 'sm', 12.1], [208, 7891.470148]),
  frame(['shaping', 'md', 0.5], [18, 1919.293141]),
  frame(['shaping', 'md', 3.7], [18, 1980.176797]),
  frame(['shaping', 'md', 12.1], [18, 1919.293141]),
  frame(['shaping', 'sm', 0.5], [18, 720.060928]),
  frame(['shaping', 'sm', 3.7], [18, 739.08707]),
  frame(['shaping', 'sm', 12.1], [18, 720.060928]),
];

const pixels: Record<OrbSize, number> = { sm: 20, md: 64 };

// One buffer for every frame, as an orb keeps one, so frames of other sizes and counts reuse its dots.
const buffer = makeDotBuffer();

// The same weighting the original's sums were taken with.
function score(dot: Dot, rMin: number): number {
  const position = dot.x + 2 * dot.y;
  const radius = 3 * Math.max(rMin, dot.r);

  return position + radius + 5 * inkLevel(dot.white, false) + 7 * dot.a;
}

function paintedFrame({ state, size, seconds }: Frame): Frame {
  const { mode, opts } = resolvePreset(state, size);

  MODE_DRAWS[mode](buffer, pixels[size], seconds, opts);

  const painted = buffer.dots
    .slice(0, buffer.count)
    .filter((dot) => dot.a >= minAlpha);

  const rMin = opts.rMin ?? defaultRMin;

  const sum = painted.reduce((total, dot) => total + score(dot, rMin), 0);

  return { state, size, seconds, count: painted.length, sum };
}

describe('the orb engine', () => {
  it.each(original)(
    'draws $state at $size, $seconds s in, as the original does',
    (expected) => {
      const painted = paintedFrame(expected);

      expect(painted.count).toBe(expected.count);
      expect(painted.sum).toBeCloseTo(expected.sum, 5);
    },
  );
});
