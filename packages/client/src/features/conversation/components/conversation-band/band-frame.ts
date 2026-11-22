import {
  fillOf,
  nearPulse,
  pulseHeight,
  strengthOf,
  type Palette,
} from './band-bars';
/*
 * One frame of the Conversation band: from the state, the voices' bands and the time a frame lasted, the height and
 * colour of every bar. Worklets over plain objects, so the UI thread runs the same code on every platform and a test
 * runs it without a screen. A step returns the sim to carry into the next frame, and leaves the old one alone.
 */
import { cssColourOf } from './band-colour';
import { barReach, barWidth } from './band-layout';
import {
  poseTargetOf,
  springStep,
  type BandState,
  type Pose,
  type Spring,
  type Tick,
} from './band-motion';
import { easePose } from './band-pose';
import { reachAt, smoothBands, type Voices } from './band-voices';

export type { Palette } from './band-bars';

// What carries over from one frame to the next.
export interface BandSim extends Voices {
  pose: Pose;
  time: number;
  springs: Spring[];
}

export interface BandInput {
  state: BandState;
  count: number;
  palette: Palette;
  // The latest bands each voice read, 0 to 1, low to high.
  user: readonly number[];
  agent: readonly number[];
  tick: Tick;
}

export interface BandFrame {
  heights: number[];
  // Each bar's colour and strength, as a CSS colour.
  fills: string[];
}

export interface BandStep {
  sim: BandSim;
  frame: BandFrame;
}

const resting: Spring = [0, 0];

export const newSim = (): BandSim => ({
  pose: poseTargetOf('listening'),
  time: 0,
  user: [],
  agent: [],
  springs: [],
});

const half = 0.5;

// Where bar `index` of `count` stands along the strip, 0 at the left end and 1 at the right.
const positionOf = (index: number, count: number): number => {
  'worklet';

  return count > 1 ? index / (count - 1) : half;
};

// Everything one frame draws from.
interface Field {
  pose: Pose;
  time: number;
  voices: Voices;
  count: number;
  palette: Palette;
  tick: Tick;
}

// What a bar reaches for: its voice's reach, and the pulse passing it.
const targetAt = (field: Field, position: number): number => {
  'worklet';

  const near = nearPulse(field.time, field.tick.reduced, position);

  return Math.min(
    1,
    reachAt(field.voices, field.pose, { position, time: field.time }) +
      pulseHeight(field.pose, near),
  );
};

const springsOf = (sim: BandSim, field: Field): Spring[] => {
  'worklet';

  return Array.from({ length: field.count }, (_, index) =>
    springStep(
      sim.springs[index] ?? resting,
      targetAt(field, positionOf(index, field.count)),
      field.tick,
    ),
  );
};

const heightOf = ([lift]: Spring): number => {
  'worklet';

  return Math.min(
    barReach,
    barWidth + Math.max(0, lift) * (barReach - barWidth),
  );
};

const fillAt = (spring: Spring, index: number, field: Field): string => {
  'worklet';

  const position = positionOf(index, field.count);
  const near = nearPulse(field.time, field.tick.reduced, position);
  const strength = strengthOf(field.pose, Math.max(0, spring[0]), near);

  return cssColourOf(fillOf(field.pose, field.palette, position), strength);
};

const fieldOf = (sim: BandSim, input: BandInput): Field => {
  'worklet';

  const { tick } = input;

  return {
    pose: easePose(sim.pose, input.state, tick),
    time: tick.reduced ? sim.time : sim.time + tick.dt,
    voices: {
      user: smoothBands(sim.user, input.user, tick),
      agent: smoothBands(sim.agent, input.agent, tick),
    },
    count: input.count,
    palette: input.palette,
    tick,
  };
};

// Steps the band by one frame.
export function stepBand(sim: BandSim, input: BandInput): BandStep {
  'worklet';

  const field = fieldOf(sim, input);
  const springs = springsOf(sim, field);

  return {
    sim: { ...field.voices, pose: field.pose, time: field.time, springs },
    frame: {
      heights: springs.map(heightOf),
      fills: springs.map((spring, index) => fillAt(spring, index, field)),
    },
  };
}
