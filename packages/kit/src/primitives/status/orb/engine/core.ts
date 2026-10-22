'worklet';

// Shared primitives for the dotted 3D thought-orbs. Ported from inkform
// (PlotterLab's HalftoneSphere lineage): honestly 3D — rotated,
// depth-shaded, z-sorted. Depth is carried by dot size and ink weight
// alone. Plain 2D canvas fills only: no ctx.filter, no SVG filters, so
// every mode renders identically in Chrome, Safari and Firefox.

import type { DotBuffer } from './types';

export interface Dot {
  x: number;
  y: number;
  z: number;
  r: number;
  /** Ink value: 0 = darkest ink on paper. Mirrored on dark themes. */
  white: number;
  a: number;
}

export type Vec3 = [number, number, number];

// Projects a point and returns it in the projector's own vector, overwritten by the next call.
export type Projector = (x: number, y: number, z: number) => Vec3;

export function makeDotBuffer(): DotBuffer {
  return { dots: [], count: 0 };
}

export function beginDots(out: DotBuffer): void {
  out.count = 0;
}

// Writes the next dot, reusing the one left at that place by an earlier frame.
export function addDot(
  out: DotBuffer,
  x: number,
  y: number,
  z: number,
  r: number,
  white: number,
  a = 1,
): void {
  const dot = out.dots[out.count];
  out.count += 1;
  if (!dot) {
    out.dots.push({ x, y, z, r, white, a });
    return;
  }
  dot.x = x;
  dot.y = y;
  dot.z = z;
  dot.r = r;
  dot.white = white;
  dot.a = a;
}

function byDepth(a: Dot, b: Dot): number {
  return a.z - b.z;
}

// Drops dots an earlier, larger frame left over, and z-sorts far to near.
export function endDots(out: DotBuffer): void {
  if (out.dots.length > out.count) out.dots.length = out.count;
  out.dots.sort(byDepth);
}

/** Deterministic hash in [0, 1). */
export function hashD(a: number, b: number): number {
  const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return h - Math.floor(h);
}

/** Stable directions on a unit sphere (Fibonacci lattice), written into `out`. */
export function fibDir(i: number, n: number, out: Vec3): Vec3 {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (2 * (i + 0.5)) / n;
  const rad = Math.sqrt(1 - y * y);
  const a = i * golden;
  out[0] = rad * Math.cos(a);
  out[1] = y;
  out[2] = rad * Math.sin(a);
  return out;
}

/** Shortest signed angular distance, wrapped to (-π, π]. */
export function angleDelta(a: number, b: number): number {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

/** Shared spin + tilt + orthographic projection. */
export function makeProj(
  yaw: number,
  tilt: number,
  cx: number,
  cy: number,
  scale: number,
): Projector {
  const st = Math.sin(tilt);
  const ct = Math.cos(tilt);
  const sy = Math.sin(yaw);
  const cyw = Math.cos(yaw);
  const p: Vec3 = [0, 0, 0];
  return (x, y, z) => {
    const x1 = x * cyw + z * sy;
    const z1 = -x * sy + z * cyw;
    const y1 = y * ct - z1 * st;
    const z2 = y * st + z1 * ct;
    p[0] = cx + x1 * scale;
    p[1] = cy - y1 * scale;
    p[2] = z2;
    return p;
  };
}

/**
 * Dot radii were tuned for a 300pt frame; sub-linear scaling keeps small
 * spinners legible. Lower pow = radii shrink less with size.
 */
export function radiusScale(size: number, pow: number): number {
  return (size / 300) ** pow;
}
