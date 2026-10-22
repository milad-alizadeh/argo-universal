'worklet';

// Morph: a dotted outline cycling circle → triangle → square → circle —
// the "shaping" state. Each shape is a continuous closed path
// parameterised by arc length (top-centre start, clockwise). Every
// frame the engine blends the two neighbouring paths, then lays the
// dots EVENLY along the blended outline — spacing stays uniform at
// every instant of the morph, holds and transitions alike. Plain
// circle fills only: no canvas/SVG filters, fully cross-browser.

import { addDot, beginDots, endDots } from './core';
import type { ModeDraw } from './types';

type Point = [number, number];

// A closed outline: a circle, or a polygon walked edge by edge with its edge lengths measured once.
type Shape =
  | { kind: 'circle' }
  | {
      kind: 'polygon';
      verts: ReadonlyArray<Readonly<Point>>;
      lengths: number[];
      total: number;
    };

function smoothE(x: number): number {
  return x * x * (3 - 2 * x);
}

function polygon(verts: ReadonlyArray<Readonly<Point>>): Shape {
  const V = verts.length;
  const lengths: number[] = [];
  let total = 0;
  for (let i = 0; i < V; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % V];
    if (!a || !b) continue;
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    lengths.push(l);
    total += l;
  }
  return { kind: 'polygon', verts, lengths, total };
}

function at(values: Float64Array, i: number): number {
  return values[i] ?? 0;
}

// The point a fraction `f` of the way round `shape`, written into `out`.
function pointOn(shape: Shape, f: number, out: Point): Point {
  if (shape.kind === 'circle') {
    const a = -Math.PI / 2 + f * 2 * Math.PI;
    out[0] = Math.cos(a) * 0.24;
    out[1] = Math.sin(a) * 0.24;
    return out;
  }
  const { verts, lengths } = shape;
  const V = verts.length;
  let target = f * shape.total;
  let i = 0;
  while (target > (lengths[i] ?? 0) && i < V - 1) {
    target -= lengths[i] ?? 0;
    i++;
  }
  const a = verts[i];
  const b = verts[(i + 1) % V];
  if (!a || !b) return out;
  const length = lengths[i] ?? 0;
  const ff = length ? Math.min(1, target / length) : 0;
  out[0] = a[0] + (b[0] - a[0]) * ff;
  out[1] = a[1] + (b[1] - a[1]) * ff;
  return out;
}

const CIRCLE: Shape = { kind: 'circle' };
const TRIANGLE = polygon([
  [0.0, -0.26],
  [0.24, 0.16],
  [-0.24, 0.16],
]);
// 5-vertex walk so the path STARTS at top-centre like the other shapes
const SQUARE = polygon([
  [0, -0.2],
  [0.2, -0.2],
  [0.2, 0.2],
  [-0.2, 0.2],
  [-0.2, -0.2],
]);
const CYCLE: Shape[] = [CIRCLE, TRIANGLE, SQUARE];

// low floor keeps sparse outlines possible while never degenerating
function morphN(d: number): number {
  return Math.max(6, Math.round(34 * d));
}

const HOLD = 1.4;
const MORPH = 0.9;
const SEG = HOLD + MORPH;

export const drawMorph: ModeDraw = (out, size, t, o) => {
  const K = CYCLE.length;
  const tc = t % (SEG * K);
  const k = Math.floor(tc / SEG);
  const local = tc - k * SEG;
  const m = local > HOLD ? smoothE((local - HOLD) / MORPH) : 0;
  const sprd = o.spread ?? 1;

  // blend the two shape PATHS at m, then measure the blended outline
  const pA = CYCLE[k] ?? CIRCLE;
  const pB = CYCLE[(k + 1) % K] ?? CIRCLE;
  const M = 160;
  // x then y for each of the M blended points
  const pts = new Float64Array(M * 2);
  const a: Point = [0, 0];
  const b: Point = [0, 0];
  for (let i = 0; i < M; i++) {
    const f = i / M;
    pointOn(pA, f, a);
    pointOn(pB, f, b);
    pts[i * 2] = (a[0] + (b[0] - a[0]) * m) * sprd;
    pts[i * 2 + 1] = (a[1] + (b[1] - a[1]) * m) * sprd;
  }
  const L = new Float64Array(M);
  let total = 0;
  for (let i = 0; i < M; i++) {
    const j = (i + 1) % M;
    const l = Math.hypot(
      at(pts, j * 2) - at(pts, i * 2),
      at(pts, j * 2 + 1) - at(pts, i * 2 + 1),
    );
    L[i] = l;
    total += l;
  }

  // dot radius depends ONLY on rDot (the size knob); the count sets the
  // gaps. Formed shapes breathe a little (uniform pulse).
  const n = morphN(o.iconD ?? 1);
  const re = (o.rDot ?? 0.021) * 1.35 * sprd;
  const pulse = 1 + 0.02 * Math.sin(local * 3.1);

  beginDots(out);
  const c2 = size / 2;
  let seg = 0;
  let acc = 0;
  for (let k2 = 0; k2 < n; k2++) {
    const target = (k2 / n) * total;
    while (acc + at(L, seg) < target && seg < M - 1) {
      acc += at(L, seg);
      seg++;
    }
    const next = (seg + 1) % M;
    const length = at(L, seg);
    const f = length ? Math.min(1, (target - acc) / length) : 0;
    const ax = at(pts, seg * 2);
    const ay = at(pts, seg * 2 + 1);
    const x = (ax + (at(pts, next * 2) - ax) * f) * pulse;
    const y = (ay + (at(pts, next * 2 + 1) - ay) * f) * pulse;
    addDot(
      out,
      c2 + x * size,
      c2 + y * size,
      0,
      Math.max(0.35, re * size),
      0.1,
    );
  }
  endDots(out);
};
