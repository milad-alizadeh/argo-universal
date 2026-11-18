import { describe, expect, it } from 'vitest';
import { addDot, beginDots, endDots, makeDotBuffer } from './engine/core';
import { resolvePreset } from './engine/presets';
import { MODE_DRAWS } from './engine/registry';
import type { DotBuffer, ModeDraw } from './engine/types';
import { type BlendSide, drawBlend, makeBlendScratch } from './orb-blend';
import { defaultRMin } from './orb-ink';
import { type Painted, paintedFrame } from './orb-painted.mocks';
import type { OrbState } from './orb-props';

const smallPixels = 20;

const half = 0.5;

// Two frames of the original thinking-orbs at the Feed's size, half a second in, as `orb-engine.test.ts` pins them.
const original = {
  working: { count: 39, sum: 1487.074928 },
  composing: { count: 208, sum: 7891.946756 },
} satisfies Partial<Record<OrbState, Painted>>;

type Pinned = keyof typeof original;

function pinnedSide(state: Pinned): BlendSide & { rMin: number } {
  const { mode, opts } = resolvePreset(state, 'sm');

  return {
    draw: MODE_DRAWS[mode],
    opts,
    seconds: half,
    rMin: opts.rMin ?? defaultRMin,
  };
}

// Working on its way to composing, painted with the smallest dot of the state it shows.
function workingToComposing(progress: number, shown: Pinned): Painted {
  const out = makeDotBuffer();
  const target = { scratch: makeBlendScratch(), out, size: smallPixels };

  drawBlend(target, {
    from: pinnedSide('working'),
    to: pinnedSide('composing'),
    progress,
  });

  return paintedFrame(out, pinnedSide(shown).rMin);
}

type Place = [x: number, y: number, z: number];

// A mode that writes one opaque dot at each place, then sorts them by depth as every mode does.
function dotsAt(...places: Place[]): BlendSide {
  const draw: ModeDraw = (out) => {
    beginDots(out);

    for (const [x, y, z] of places) addDot(out, x, y, z, 1, 0);

    endDots(out);
  };

  return { draw, opts: {}, seconds: 0 };
}

const drawn = (out: DotBuffer): { x: number; y: number; a: number }[] =>
  out.dots.slice(0, out.count).map(({ x, y, a }) => ({ x, y, a }));

describe('a blend of two orb states', () => {
  it('starts as the frame of the state it leaves', () => {
    const painted = workingToComposing(0, 'working');

    expect(painted.count).toBe(original.working.count);
    expect(painted.sum).toBeCloseTo(original.working.sum, 5);
  });

  it('ends as the frame of the state it reaches', () => {
    const painted = workingToComposing(1, 'composing');

    expect(painted.count).toBe(original.composing.count);
    expect(painted.sum).toBeCloseTo(original.composing.sum, 5);
  });

  it('moves each dot toward its partner, and fades in a dot that splits off', () => {
    const out = makeDotBuffer();
    const target = { scratch: makeBlendScratch(), out, size: smallPixels };

    drawBlend(target, {
      from: dotsAt([0, 0, 0]),
      to: dotsAt([10, 0, 0], [0, 10, 1]),
      progress: half,
    });

    expect(drawn(out)).toEqual([
      { x: 5, y: 0, a: 1 },
      { x: 0, y: 5, a: half },
    ]);
  });

  it('fades the dots in where they are when it leaves nothing', () => {
    const out = makeDotBuffer();
    const target = { scratch: makeBlendScratch(), out, size: smallPixels };
    const quarter = 0.25;

    drawBlend(target, {
      from: null,
      to: dotsAt([10, 0, 0], [0, 10, 1]),
      progress: quarter,
    });

    expect(drawn(out)).toEqual([
      { x: 10, y: 0, a: quarter },
      { x: 0, y: 10, a: quarter },
    ]);
  });

  it('pairs dots in the order they were written, on every frame, however the depth sort moves them', () => {
    const out = makeDotBuffer();
    const target = { scratch: makeBlendScratch(), out, size: smallPixels };

    // The first side's near dot is its far dot's partner on the second side, so pairing by depth would cross them.
    const blend = {
      from: dotsAt([0, 0, 1], [10, 0, 0]),
      to: dotsAt([0, 10, 0], [10, 10, 1]),
      progress: half,
    };

    const straight = [
      { x: 0, y: 5, a: 1 },
      { x: 10, y: 5, a: 1 },
    ];

    drawBlend(target, blend);

    expect(drawn(out)).toEqual(straight);

    drawBlend(target, blend);

    expect(drawn(out)).toEqual(straight);
  });
});
