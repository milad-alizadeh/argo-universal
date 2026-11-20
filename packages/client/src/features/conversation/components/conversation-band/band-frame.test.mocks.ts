import { newSim, stepBand, type BandFrame, type BandInput } from './band-frame';

const palette = {
  user: [255, 120, 0],
  agent: [0, 80, 255],
  quiet: [150, 150, 150],
  warn: [220, 160, 0],
  danger: [220, 40, 40],
};

const bandCount = 16;

export const speech = (level: number): number[] =>
  Array.from({ length: bandCount }, () => level);

const silence = speech(0);

export const count = 31;

export const input = (over: Partial<BandInput>): BandInput => ({
  state: 'listening',
  count,
  palette,
  user: silence,
  agent: silence,
  tick: { dt: 1 / 60, reduced: false },
  ...over,
});

const framesPerSecond = 60;

// Runs the band from a fresh sim for this many seconds at 60 frames a second, and gives the last frame and its sim.
export function run(
  seconds: number,
  over: Partial<BandInput>,
  from = newSim(),
): ReturnType<typeof stepBand> {
  return Array.from({ length: Math.round(seconds * framesPerSecond) }).reduce<
    ReturnType<typeof stepBand>
  >((step) => stepBand(step.sim, input(over)), {
    sim: from,
    frame: { heights: [], fills: [] },
  });
}

const channelsOf = (fill: string): number[] =>
  fill
    .slice(fill.indexOf('(') + 1, fill.indexOf(')'))
    .split(',')
    .map(Number);

export const redOf = (fill: string): number => channelsOf(fill)[0] ?? 0;

export const blueOf = (fill: string): number => channelsOf(fill)[2] ?? 0;

export const heightsOf = (step: { frame: BandFrame }): number[] =>
  step.frame.heights;

export const fillOf = (step: { frame: BandFrame }, index: number): string =>
  step.frame.fills[index] ?? '';

export const tallest = (heights: number[]): number =>
  heights.indexOf(Math.max(...heights));
