'worklet';

import { addDot, beginDots, endDots, makeDotBuffer } from './engine/core';
import type { ModeOpts } from './engine/profiles';
import type { Dot, DotBuffer, ModeDraw } from './engine/types';

// One state's frame: its mode, its tuning and how far into its animation it is.
export interface BlendSide {
  draw: ModeDraw;
  opts: ModeOpts;
  seconds: number;
}

/*
 * A frame's dots in the order its mode wrote them. A mode sorts its dots by depth, and that order
 * changes every frame, so only the written order pairs the same dot from one frame to the next.
 */
interface OrderedDots {
  buffer: DotBuffer;
  written: Dot[];
}

// The two frames a blend draws from, kept between frames so a blend allocates no dot.
export interface BlendScratch {
  from: OrderedDots;
  to: OrderedDots;
}

export interface BlendTarget {
  scratch: BlendScratch;
  out: DotBuffer;
  size: number;
}

const makeOrderedDots = (): OrderedDots => ({
  buffer: makeDotBuffer(),
  written: [],
});

export function makeBlendScratch(): BlendScratch {
  return { from: makeOrderedDots(), to: makeOrderedDots() };
}

function noteWritten({ buffer, written }: OrderedDots): void {
  const { dots } = buffer;

  written.length = 0;

  for (const dot of dots) written.push(dot);
}

// A mode writes its nth dot into the nth dot its buffer holds and sorts them after, so the dots noted before it draws are in written order.
function drawOrdered(
  ordered: OrderedDots,
  side: BlendSide,
  size: number,
): Dot[] {
  const { buffer, written } = ordered;

  noteWritten(ordered);
  side.draw(buffer, size, side.seconds, side.opts);

  // The frame added dots and the sort moved them unnoted. Drawn again, the buffer already holds every dot.
  if (buffer.count > written.length) return drawOrdered(ordered, side, size);

  written.length = buffer.count;

  return written;
}

// A blend in flight: the state it leaves, or `null` to appear from nothing, the state it reaches, and how far along it is, 0 to 1.
export interface Blend {
  from: BlendSide | null;
  to: BlendSide;
  progress: number;
}

// The two frames of a blend, dot for dot.
interface Pairing {
  before: Dot[];
  after: Dot[];
  // Where each dot starts and where it ends.
  starts: Dot[];
  ends: Dot[];
  total: number;
  progress: number;
}

const nothing: Dot[] = [];

// A side with no dots takes the other's, so the dots fade where they are.
const placesOf = (side: Dot[], other: Dot[]): Dot[] =>
  side.length ? side : other;

function pairingOf(
  { scratch, size }: BlendTarget,
  { from, to, progress }: Blend,
): Pairing {
  const before = from ? drawOrdered(scratch.from, from, size) : nothing;
  const after = drawOrdered(scratch.to, to, size);

  return {
    before,
    after,
    starts: placesOf(before, after),
    ends: placesOf(after, before),
    total: Math.max(before.length, after.length),
    progress,
  };
}

// The dot of a side's `count` that the kth of `total` blended dots pairs with.
function partner(k: number, count: number, total: number): number {
  return Math.floor((k * count) / total);
}

// A side with fewer dots pairs each with several. Only the first carries its ink, so the side reads as its own frame; the rest split from it or merge into it unseen.
function carries(k: number, count: number, total: number): boolean {
  return k === 0 || partner(k - 1, count, total) !== partner(k, count, total);
}

function pairedDot(side: Dot[], k: number, total: number): Dot | undefined {
  return side[partner(k, side.length, total)];
}

function pairedAlpha(side: Dot[], k: number, total: number): number {
  const dot = pairedDot(side, k, total);

  return dot && carries(k, side.length, total) ? dot.a : 0;
}

function mix(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function alphaAt(
  { before, after, total, progress }: Pairing,
  k: number,
): number {
  return mix(
    pairedAlpha(before, k, total),
    pairedAlpha(after, k, total),
    progress,
  );
}

function moveToward(dot: Dot | undefined, to: Dot, progress: number): void {
  if (!dot) return;

  dot.x = mix(dot.x, to.x, progress);
  dot.y = mix(dot.y, to.y, progress);
  dot.z = mix(dot.z, to.z, progress);
  dot.r = mix(dot.r, to.r, progress);
  dot.white = mix(dot.white, to.white, progress);
}

// Written where it starts, then moved toward where it ends, so a blended dot needs no object of its own.
function addPaired(out: DotBuffer, pairing: Pairing, k: number): void {
  const start = pairedDot(pairing.starts, k, pairing.total);
  const end = pairedDot(pairing.ends, k, pairing.total);

  if (!start || !end) return;

  const { x, y, z, r, white } = start;

  addDot(out, x, y, z, r, white, alphaAt(pairing, k));
  moveToward(out.dots[out.count - 1], end, pairing.progress);
}

// Draws one frame of a blend: each dot on its way from its place in the first frame to its partner's place in the second.
export function drawBlend(target: BlendTarget, blend: Blend): void {
  const pairing = pairingOf(target, blend);
  const { out } = target;

  beginDots(out);

  for (let k = 0; k < pairing.total; k++) addPaired(out, pairing, k);

  endDots(out);
}
