'worklet';

import { type BlendSide, drawBlend } from './orb-blend';
import type { OrbPen } from './orb-image';
import { easeInOut, morphProgress, settleMorph } from './orb-morph';
import type { OrbMotion, OrbMotions } from './orb-motions';
import type { OrbState } from './orb-props';

const millisecondsPerSecond = 1000;

// What an orb is asked to draw.
export interface OrbDrawing {
  motions: OrbMotions;
  state: OrbState;
  dark: boolean;
  // The time to hold the drawing at, for a reduced-motion viewer; null lets it move.
  still: number | null;
  // Whether frames follow one another. An orb held still takes a new state at once.
  moving: boolean;
  // Whether the orb fades in on its first frame, rather than starting whole.
  fadesIn: boolean;
}

function sideOf(
  motion: OrbMotion,
  { still }: OrbDrawing,
  milliseconds: number,
): BlendSide {
  const seconds = (milliseconds / millisecondsPerSecond) * motion.speed;

  return { draw: motion.draw, opts: motion.opts, seconds: still ?? seconds };
}

function progressAt(
  { morph }: OrbPen,
  { state, moving, fadesIn }: OrbDrawing,
  now: number,
): number {
  if (moving) return morphProgress(morph, { target: state, now, fadesIn });

  settleMorph(morph, state);

  return 1;
}

function drawWhole(pen: OrbPen, drawing: OrbDrawing, now: number): void {
  const motion = drawing.motions[drawing.state];
  const { draw, opts, seconds } = sideOf(motion, drawing, now);

  draw(pen.dots, pen.size, seconds, opts);
  pen.ink.rMin = motion.rMin;
}

// The motions a morph in flight lies between; it leaves none while the orb fades in.
interface Between {
  from: OrbMotion | null;
  to: OrbMotion;
}

function motionsBetween(
  { morph }: OrbPen,
  { motions, state }: OrbDrawing,
): Between {
  const to = motions[morph.to ?? state];

  return { from: morph.from ? motions[morph.from] : null, to };
}

interface Flight {
  drawing: OrbDrawing;
  now: number;
  progress: number;
}

function drawBetween(pen: OrbPen, { drawing, now, progress }: Flight): void {
  const { from, to } = motionsBetween(pen, drawing);
  const start = from ?? to;
  const target = { scratch: pen.morph.scratch, out: pen.dots, size: pen.size };

  drawBlend(target, {
    from: from && sideOf(from, drawing, now),
    to: sideOf(to, drawing, now),
    progress,
  });
  pen.ink.rMin = start.rMin + (to.rMin - start.rMin) * progress;
}

// Draws the orb's dots `now` milliseconds into its animation, and sets how they are inked: one state whole, or a morph on its way between two.
export function drawOrb(pen: OrbPen, drawing: OrbDrawing, now: number): void {
  const progress = progressAt(pen, drawing, now);

  pen.ink.dark = drawing.dark;

  if (progress < 1)
    drawBetween(pen, { drawing, now, progress: easeInOut(progress) });
  else drawWhole(pen, drawing, now);
}
