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

// Each bar's wobble is three sines at rates no two share, phased by where the bar stands, so neighbours peak and dip apart.
const wobbles = [
  { hertz: 1.9, phase: 71.3, weight: 0.5 },
  { hertz: 1.3, phase: 137.9, weight: 0.3 },
  { hertz: 2.7, phase: 96.1, weight: 0.2 },
];

const wobbleRadians = 2 * Math.PI;

// How much of its voice's level a bar shows at a dip and at a peak; a peak above 1 lets a loud voice fill the bar.
const dipFloor = 0.2;

const peakCeiling = 1.3;

// Scales a level and never lifts silence, so a silent voice stays flat however the bars wobble.
function texturedBy(time: number, position: number): number {
  'worklet';

  let sum = 0;

  for (const { hertz, phase, weight } of wobbles) {
    sum += weight * Math.sin(wobbleRadians * hertz * time + position * phase);
  }

  const unit = (1 + sum) / 2;

  return dipFloor + (peakCeiling - dipFloor) * unit;
}

// What the bar at `position` (0 left, 1 right) reaches for, 0 to 1: the person's voice from the left, the Agent's from the right.
export function reachAt(
  voices: Voices,
  pose: Pose,
  place: { position: number; time: number },
): number {
  'worklet';

  const { position, time } = place;
  const user = voiceAt(voices.user, position) * (1 - position) ** reachFalloff;
  const agent = voiceAt(voices.agent, 1 - position) * position ** reachFalloff;
  const voice = user * pose.user + agent * pose.agent;

  return voice * texturedBy(time, position) * (1 - pose.mute);
}
