import { resolvePreset } from './engine/presets';
import type { ModeOpts } from './engine/profiles';
import { MODE_DRAWS } from './engine/registry';
import type { ModeDraw } from './engine/types';
import { defaultRMin } from './orb-ink';
import type { OrbSize, OrbState } from './orb-props';

// The way one state moves at one size: its mode, tuning, clock speed and smallest dot in px.
export interface OrbMotion {
  draw: ModeDraw;
  opts: ModeOpts;
  speed: number;
  rMin: number;
}

export type OrbMotions = Record<OrbState, OrbMotion>;

function motionOf(state: OrbState, size: OrbSize): OrbMotion {
  const { mode, speed, opts } = resolvePreset(state, size);

  return {
    draw: MODE_DRAWS[mode],
    opts,
    speed,
    rMin: opts.rMin ?? defaultRMin,
  };
}

const motionsAt = (size: OrbSize): OrbMotions => ({
  working: motionOf('working', size),
  searching: motionOf('searching', size),
  solving: motionOf('solving', size),
  listening: motionOf('listening', size),
  composing: motionOf('composing', size),
  shaping: motionOf('shaping', size),
});

// Every state's motion at each size. An orb holds them all, so it can draw the state it leaves beside the one it reaches.
export const orbMotions: Record<OrbSize, OrbMotions> = {
  sm: motionsAt('sm'),
  md: motionsAt('md'),
};
