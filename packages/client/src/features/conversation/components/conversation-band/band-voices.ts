/*
 * What each voice reaches for along the strip: the person's from the left end, the Agent's from the right. Worklets
 * over plain numbers.
 */
import {
  clamp01,
  easeToward,
  liftOf,
  rmsOf,
  smoothLevel,
  type Pose,
  type Tick,
} from './band-motion';

// Both voices' bands, smoothed, low to high.
export interface Voices {
  user: readonly number[];
  agent: readonly number[];
}

// How far a bar's reach falls off from its voice's end of the strip.
const reachFalloff = 0.8;

// A band's own strength and the voice's overall level share a bar's height.
const bandShare = 0.6;

const valueAt = (bands: readonly number[], index: number): number => {
  'worklet';

  return bands[index] ?? 0;
};

// Each band follows what the analyser last read, quick to rise and slow to fall.
export function smoothBands(
  smoothed: readonly number[],
  read: readonly number[],
  tick: Tick,
): number[] {
  'worklet';

  return read.map((band, index) =>
    smoothLevel(valueAt(smoothed, index), band, tick),
  );
}

// How loud a voice is at a place (0 to 1) along its bands: the band there and the voice's overall level, lifted.
function voiceAt(bands: readonly number[], position: number): number {
  'worklet';

  const at = clamp01(position) * Math.max(0, bands.length - 1);
  const low = Math.floor(at);
  const high = Math.min(bands.length - 1, low + 1);
  const band = easeToward(valueAt(bands, low), valueAt(bands, high), at - low);

  return liftOf(band * bandShare + rmsOf(bands) * (1 - bandShare));
}

// What the bar at `position` (0 left, 1 right) reaches for, 0 to 1: the person's voice from the left, the Agent's from the right.
export function reachAt(voices: Voices, pose: Pose, position: number): number {
  'worklet';

  const user = voiceAt(voices.user, position) * (1 - position) ** reachFalloff;
  const agent = voiceAt(voices.agent, 1 - position) * position ** reachFalloff;

  return (user * pose.user + agent * pose.agent) * (1 - pose.mute);
}
