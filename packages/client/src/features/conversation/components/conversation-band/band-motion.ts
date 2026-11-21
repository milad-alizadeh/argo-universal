/*
 * The Conversation band's maths: plain functions of numbers, each a worklet, so the same code runs on the UI thread on
 * every platform and in a unit test. Nothing here knows about React, Reanimated or the screen.
 */

export type BandState =
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'talking'
  | 'muted'
  | 'reconnecting'
  | 'blocked';

// How present each look is, 0 to 1. A state change only moves these; the bars are the same ones throughout.
export interface Pose {
  // How present the person's voice is.
  user: number;
  // How present the Agent's voice is.
  agent: number;
  // A soft dot pulse crosses the strip.
  think: number;
  // The bars wait, with a pulse crossing; before the call is up and while it reconnects.
  connect: number;
  // The microphone is off or blocked: the bars go quiet.
  mute: number;
  // Trouble the call can recover from, in the warning colour.
  warn: number;
  // Whose turn colours the strip: 0 the person's, 1 the Agent's.
  tone: number;
}

const off: Pose = {
  user: 0,
  agent: 0,
  think: 0,
  connect: 0,
  mute: 0,
  warn: 0,
  tone: 0,
};

const poses: Record<BandState, Pose> = {
  listening: { ...off, user: 1 },
  talking: { ...off, agent: 1, tone: 1 },
  thinking: { ...off, think: 1, tone: 1 },
  connecting: { ...off, connect: 1 },
  reconnecting: { ...off, connect: 1, warn: 1 },
  muted: { ...off, mute: 1 },
  blocked: { ...off, mute: 1 },
};

export const poseTargetOf = (state: BandState): Pose => poses[state];

// Seconds for a pose to cover about two thirds of the way to its target; a state change settles in about three times this.
export const poseTau = 0.12;

// The turn's colour sweep is a little slower, so it reads as a sweep: about 0.4 s across the strip.
export const toneTau = 0.13;

// Rising is quick and falling slow, so a syllable lands at once and fades behind it.
const attackTau = 0.035;

const releaseTau = 0.16;

// Reduced motion slows every move to a third.
const calmer = 3;

// What one frame lasts, and whether the person asked for reduced motion.
export interface Tick {
  dt: number;
  reduced: boolean;
}

// The share of the way to a target that `dt` seconds cover at `tau`. Frame-rate independent: two half steps land where one whole step does.
export function blendOf(dt: number, tau: number): number {
  'worklet';

  return 1 - Math.exp(-dt / tau);
}

export function easeToward(from: number, to: number, blend: number): number {
  'worklet';

  return from + (to - from) * blend;
}

// A smoothed level follows its input.
export function smoothLevel(from: number, to: number, tick: Tick): number {
  'worklet';

  const tau =
    (to > from ? attackTau : releaseTau) * (tick.reduced ? calmer : 1);

  return easeToward(from, to, blendOf(tick.dt, tau));
}

// How loud a set of bands is: their root mean square, 0 to 1.
export function rmsOf(bands: readonly number[]): number {
  'worklet';

  let sum = 0;

  for (const band of bands) sum += band * band;

  return Math.sqrt(sum / Math.max(1, bands.length));
}

// The analyser's bands sit low for ordinary speech; this soft curve lifts them so speech fills the bars and silence stays a dot.
const liftRate = 4;

export function liftOf(level: number): number {
  'worklet';

  return 1 - Math.exp(-liftRate * level);
}

export const clamp01 = (value: number): number => {
  'worklet';

  return Math.min(1, Math.max(0, value));
};

const smoothstepCubic = 3;

const smoothstepSlope = 2;

// Smoothstep: eases a 0..1 value in and out.
const smoothstep = (value: number): number => {
  'worklet';

  return value * value * (smoothstepCubic - smoothstepSlope * value);
};

// How far the colour front has come as the strip turns from orange to blue; it enters at the Agent's right end.
const frontReach = 1.3;

const frontStart = 0.15;

const frontSoftness = 0.25;

const half = 0.5;

/*
 * How blue the strip is at `position` (0 left, 1 right) when the turn is `tone` of the way to the Agent's: a soft front
 * crosses from the right end to the left as the tone rises, and back as it falls.
 */
export function turnBlend(position: number, tone: number): number {
  'worklet';

  const front = tone * frontReach - frontStart;

  return smoothstep(clamp01((front - (1 - position)) / frontSoftness + half));
}

const pulseSeconds = 2.9;

const pulseOvershoot = 0.15;

const pulseSpan = 1.3;

// Where the soft dot is, 0 to 1 across the strip, starting and ending just outside it. Under reduced motion it rests in the middle.
export function pulseCentre(time: number, reduced: boolean): number {
  'worklet';

  if (reduced) return half;

  return (((time / pulseSeconds) * pulseSpan) % pulseSpan) - pulseOvershoot;
}

// A bar springs to its height with a slight overshoot; reduced motion damps it critically, so it never passes.
const stiffness = 220;

const damping = 15;

const criticalDamping = 2 * Math.sqrt(stiffness);

// A bar's position and velocity.
export type Spring = [number, number];

const stepsPerSecond = 120;

const maxStep = 1 / stepsPerSecond;

interface Push {
  target: number;
  step: number;
  drag: number;
}

// One short step of the spring: pulled to the target, slowed by drag.
function advance([x, v]: Spring, push: Push): Spring {
  'worklet';

  const next = v + (stiffness * (push.target - x) - push.drag * v) * push.step;

  return [x + next * push.step, next];
}

// Steps the spring over `dt`, in steps no longer than `maxStep`, so a slow frame stays stable.
export function springStep(spring: Spring, target: number, tick: Tick): Spring {
  'worklet';

  const steps = Math.max(1, Math.ceil(tick.dt / maxStep));
  const drag = tick.reduced ? criticalDamping : damping;
  const push = { target, step: tick.dt / steps, drag };

  return Array.from({ length: steps }).reduce<Spring>(
    (current) => advance(current, push),
    spring,
  );
}
