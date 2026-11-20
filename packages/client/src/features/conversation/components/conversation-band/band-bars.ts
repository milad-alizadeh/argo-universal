/*
 * What a bar looks like: the soft pulse thinking and connecting send across, its colour and its strength. Worklets over
 * plain numbers.
 */
import { mixRgb, type Rgb } from './band-colour';
import { pulseCentre, turnBlend, type Pose } from './band-motion';

export interface Palette {
  // The person's voice.
  user: Rgb;
  // The Agent's voice.
  agent: Rgb;
  // The bars while the call has no sound to show.
  quiet: Rgb;
  // Trouble the call can recover from.
  warn: Rgb;
  // The microphone off or blocked.
  danger: Rgb;
}

const pulseWidth = 0.07;

const thinkPulse = 0.34;

const connectPulse = 0.3;

const waitingDimming = 0.8;

const quietStrength = 0.34;

const quietRange = 0.66;

const lightGain = 1.5;

const mutedStrength = 0.5;

// How near the bar at `position` is to the soft dot pulse, 0 to 1.
export function nearPulse(
  time: number,
  reduced: boolean,
  position: number,
): number {
  'worklet';

  return Math.exp(
    -(((position - pulseCentre(time, reduced)) / pulseWidth) ** 2),
  );
}

// How much of a bar's height the pulse gives it.
export function pulseHeight(pose: Pose, near: number): number {
  'worklet';

  return near * (pose.think * thinkPulse + pose.connect * connectPulse);
}

// The bar's colour: the person's orange turning to the Agent's blue as the turn passes, then dimmed, warned or reddened.
export function fillOf(pose: Pose, palette: Palette, position: number): Rgb {
  'worklet';

  const voice = mixRgb(
    palette.user,
    palette.agent,
    turnBlend(position, pose.tone),
  );

  const dim = pose.connect * (1 - pose.warn) * waitingDimming;
  const waiting = mixRgb(voice, palette.quiet, dim);
  const warned = mixRgb(waiting, palette.warn, pose.warn);

  return mixRgb(warned, palette.danger, pose.mute);
}

// How strongly the bar is drawn, 0 to 1: dots rest faint, and a lifted bar or the pulse lights them.
export function strengthOf(pose: Pose, lift: number, near: number): number {
  'worklet';

  const lit = Math.min(
    1,
    lift * lightGain + near * (pose.think + pose.connect),
  );

  return (quietStrength + quietRange * lit) * (1 - pose.mute * mutedStrength);
}
