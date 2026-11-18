'worklet';

import { type BlendScratch, makeBlendScratch } from './orb-blend';
import type { OrbState } from './orb-props';

// How long an orb takes to move from one state's shape to the next, or to fade in.
export const morphMilliseconds = 400;

// What an orb shows: the state it left, `null` when it came from nothing, and the state it reaches. Made on the UI thread and kept until the orb unmounts.
export interface OrbMorph {
  from: OrbState | null;
  // `null` until the orb's first frame.
  to: OrbState | null;
  // When it set off, on the orb's own clock.
  start: number;
  scratch: BlendScratch;
}

// The state an orb is asked to show at `now` on its clock.
export interface Arrival {
  target: OrbState;
  now: number;
  // Whether an orb that shows nothing yet fades in, rather than starting whole.
  fadesIn: boolean;
}

export function makeMorph(): OrbMorph {
  return { from: null, to: null, start: 0, scratch: makeBlendScratch() };
}

// Shows a state whole, with no way to travel: an orb held still changes shape at once.
export function settleMorph(morph: OrbMorph, target: OrbState): void {
  morph.from = target;
  morph.to = target;
  morph.start = Number.NEGATIVE_INFINITY;
}

function appear(morph: OrbMorph, { target, now, fadesIn }: Arrival): void {
  settleMorph(morph, target);

  if (!fadesIn) return;

  morph.from = null;
  morph.start = now;
}

const inFlight = (morph: OrbMorph, now: number): boolean =>
  now - morph.start < morphMilliseconds;

// A morph in flight runs to its end before the next sets off, so no shape is cut short.
function turn(morph: OrbMorph, { target, now }: Arrival): void {
  if (morph.to === target || inFlight(morph, now)) return;

  morph.from = morph.to;
  morph.to = target;
  morph.start = now;
}

// Points the orb at the state asked for, and says how far along it is, 0 to 1.
export function morphProgress(morph: OrbMorph, arrival: Arrival): number {
  if (morph.to === null) appear(morph, arrival);
  else turn(morph, arrival);

  return Math.min(1, (arrival.now - morph.start) / morphMilliseconds);
}

// Sets off and settles gently, so a shape neither jumps away nor snaps into place.
export function easeInOut(progress: number): number {
  return (1 - Math.cos(Math.PI * progress)) / 2;
}
